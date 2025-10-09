import { RequestHandler } from "express";
import { google } from "googleapis";

// Simple in-memory client for scaffolding (replace with per-user storage)
let authClient: ReturnType<typeof getOAuthClient> | null = null;

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in env");
  }
  // Use 'postmessage' for redirect when exchanging code from frontend
  const redirectUri = "postmessage";
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export const handleGoogleCallback: RequestHandler = async (req, res) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code) {
      return res.status(400).json({ error: "Missing authorization code" });
    }

    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    authClient = oauth2Client;

    // Do NOT return tokens to client; persist securely in DB if needed
    return res.status(200).json({ connected: true });
  } catch (err: any) {
    console.error("Google OAuth callback error:", err?.message || err);
    return res.status(500).json({ error: "Failed to exchange code" });
  }
};

export const listCalendarEvents: RequestHandler = async (_req, res) => {
  try {
    if (!authClient) {
      return res.status(401).json({ error: "Not authenticated with Google" });
    }

    // Assert non-null after the guard so TS type aligns with Google API typings
    const calendar = google.calendar({ version: "v3", auth: authClient! });
    const now = new Date();
    const eventsRes = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 10,
    });

    return res.status(200).json({ events: eventsRes.data.items ?? [] });
  } catch (err: any) {
    console.error("List events error:", err?.message || err);
    return res.status(500).json({ error: "Failed to list calendar events" });
  }
};