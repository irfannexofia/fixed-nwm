import type { IncomingMessage, ServerResponse } from "http";
import { Pool } from "pg";

// Create a scoped Pool for this function
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    // Only allow GET
    if ((req as any).method !== "GET") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method Not Allowed" }));
      return;
    }

    // Fetch stored refresh token for user_id=1
    const tokenRes = await pool.query<{ refresh_token: string }>(
      "SELECT refresh_token FROM google_auth_tokens WHERE user_id=$1 LIMIT 1",
      [1]
    );
    const refreshToken = tokenRes.rows[0]?.refresh_token;
    if (!refreshToken) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Not authenticated with Google Ads" }));
      return;
    }

    const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    if (!devToken || !clientId || !clientSecret || !customerId) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Missing Google Ads configuration in env" }));
      return;
    }

    // Load Google Ads SDK lazily; return 501 if dependency is not installed
    let GoogleAdsApi: any;
    try {
      ({ GoogleAdsApi } = await import("google-ads-api"));
    } catch {
      res.statusCode = 501;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({ error: "Google Ads feature disabled: dependency not installed" })
      );
      return;
    }

    const client = new GoogleAdsApi({
      client_id: clientId,
      client_secret: clientSecret,
      developer_token: devToken,
    });
    const customer = client.Customer(customerId, refreshToken);

    const gaql = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.clicks,
        metrics.impressions,
        metrics.cost_micros,
        metrics.conversions
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY campaign.id`;

    const rows = await customer.query(gaql);
    const campaigns = rows.map((r: any) => ({
      id: Number(r.campaign.id),
      name: r.campaign.name,
      status: r.campaign.status,
      clicks: Number(r.metrics.clicks || 0),
      impressions: Number(r.metrics.impressions || 0),
      cost: Number(r.metrics.cost_micros || 0) / 1_000_000,
      conversions: Number(r.metrics.conversions || 0),
    }));

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ campaigns }));
  } catch (err: any) {
    console.error("Google Ads campaigns error:", err?.message || err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Failed to fetch campaigns" }));
  }
}