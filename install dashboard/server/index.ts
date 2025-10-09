import "dotenv/config";
import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { handleDemo } from "./routes/demo";
import { google } from "googleapis";
import { z } from "zod";
import { handleGoogleCallback, listCalendarEvents } from "./routes/google-auth";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Select Neon/Postgres connection string based on environment
  const envNode = (process.env as any)["NODE_ENV"];
  const isDev = envNode === "development" || (!process.env.DATABASE_URL && !!process.env.DEV_DATABASE_URL);
  const databaseUrl = isDev
    ? process.env.DEV_DATABASE_URL ?? process.env.DATABASE_URL
    : process.env.DATABASE_URL;

  // Debug log: show which env is used and whether URL is present (no secrets)
  const inUse = isDev ? "DEV_DATABASE_URL" : "DATABASE_URL";
  const hasUrl = Boolean(databaseUrl && databaseUrl.length > 0);
  console.log(`DB config: env=${isDev ? "development" : "production"} (NODE_ENV=${envNode}), using ${inUse}, present=${hasUrl}`);

  // Initialize Postgres pool (Neon requires SSL)
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  // Ensure DB schema is ready before handling any API requests
  const initPromise = (async () => {
    try {
      // Base simple tasks table (used by /api/tasks)
      await pool.query(
        `CREATE TABLE IF NOT EXISTS tasks (
           id SERIAL PRIMARY KEY,
           text TEXT NOT NULL,
           complete BOOLEAN DEFAULT FALSE,
           assignee TEXT,
           due_date DATE,
           created_at TIMESTAMPTZ DEFAULT NOW()
         )`
      );

      // OAuth token storage for Google Ads
      await pool.query(
        `CREATE TABLE IF NOT EXISTS google_auth_tokens (
           user_id INT PRIMARY KEY,
           refresh_token TEXT NOT NULL,
           updated_at TIMESTAMPTZ DEFAULT NOW()
         )`
      );

      // Kanban tasks table (synced across boards like UGC/Design)
      await pool.query(
        `CREATE TABLE IF NOT EXISTS kanban_tasks (
           id TEXT PRIMARY KEY,
           board_slug TEXT NOT NULL,
           title TEXT NOT NULL,
           description TEXT,
           status TEXT NOT NULL,
           priority TEXT NOT NULL,
           due_date TEXT,
           assignee TEXT,
           tags TEXT[] DEFAULT '{}'::text[],
           created_at TIMESTAMPTZ DEFAULT NOW(),
           updated_at TIMESTAMPTZ DEFAULT NOW()
         )`
      );

      // UGC briefs table (Task/URL/Caption/Status list)
      await pool.query(
        `CREATE TABLE IF NOT EXISTS ugc_briefs (
           id TEXT PRIMARY KEY,
           scope TEXT NOT NULL,
           brief TEXT NOT NULL,
           url TEXT,
           caption TEXT,
           status TEXT NOT NULL,
           created_at TIMESTAMPTZ DEFAULT NOW(),
           updated_at TIMESTAMPTZ DEFAULT NOW()
         )`
      );

      // Calendar persistence (colors + events)
      await pool.query(
        `CREATE TABLE IF NOT EXISTS calendar_cells (
           date TEXT PRIMARY KEY,
           color TEXT,
           tz TEXT,
           updated_at TIMESTAMPTZ DEFAULT NOW()
         )`
      );
      await pool.query(
        `CREATE TABLE IF NOT EXISTS calendar_events (
           id TEXT PRIMARY KEY,
           date TEXT NOT NULL,
           title TEXT NOT NULL,
           tz TEXT,
           created_at TIMESTAMPTZ DEFAULT NOW(),
           updated_at TIMESTAMPTZ DEFAULT NOW()
         )`
      );
      // Extend calendar_events with optional time and notes columns if missing
      await pool.query(`ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS tz TEXT`);
      await pool.query(`ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS time TEXT`);
      await pool.query(`ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS notes TEXT`);

      // Settings config table for workflow metadata and logo
      await pool.query(
        `CREATE TABLE IF NOT EXISTS settings_config (
           id INT PRIMARY KEY,
           name TEXT,
           title TEXT,
           logo_url TEXT,
           updated_at TIMESTAMPTZ DEFAULT NOW()
         )`
      );
      // Ensure a singleton row exists (id=1)
      await pool.query(
        `INSERT INTO settings_config(id, name, title, logo_url, updated_at)
         VALUES(1, 'Netpiu Svelte', 'Work Management', NULL, NOW())
         ON CONFLICT (id) DO NOTHING`
      );
      console.log("DB schema ready");
    } catch (err: any) {
      console.error("Failed to initialize DB schema:", err?.message || err);
      throw err;
    }
  })();

  // Gate all requests until DB schema is ready (prevents race on cold start)
  app.use(async (_req, res, next) => {
    try {
      await initPromise;
      next();
    } catch {
      res.status(500).json({ error: "Database initialization failed" });
    }
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Google OAuth callbacks and Calendar API
  app.post("/api/auth/google/callback", handleGoogleCallback);
  app.get("/api/calendar/events", listCalendarEvents);

  // DB health check endpoint to verify Neon connectivity
  app.get("/health/db", async (_req, res) => {
    try {
      const result = await pool.query("SELECT 1 AS ok");
      res.json({ ok: result.rows[0]?.ok === 1, env: isDev ? "development" : "production" });
    } catch (err: any) {
      console.error("DB health check failed:", err?.message || err);
      res.status(500).json({ ok: false, error: "DB connection failed" });
    }
  });

  // Mirror under /api for Vercel (only /api/* is routed to functions)
  app.get("/api/health/db", async (_req, res) => {
    try {
      const result = await pool.query("SELECT 1 AS ok");
      res.json({ ok: result.rows[0]?.ok === 1, env: isDev ? "development" : "production" });
    } catch (err: any) {
      console.error("DB health check failed:", err?.message || err);
      res.status(500).json({ ok: false, error: "DB connection failed" });
    }
  });

  // Debug endpoint to peek environment variables presence (do not include secrets)
  app.get("/debug/env", (_req, res) => {
    res.json({
      NODE_ENV: process.env.NODE_ENV,
      using: inUse,
      hasDevUrl: Boolean(process.env.DEV_DATABASE_URL && process.env.DEV_DATABASE_URL.length > 0),
      hasProdUrl: Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0),
    });
  });

  // Mirror under /api for Vercel
  app.get("/api/debug/env", (_req, res) => {
    res.json({
      NODE_ENV: process.env.NODE_ENV,
      using: inUse,
      hasDevUrl: Boolean(process.env.DEV_DATABASE_URL && process.env.DEV_DATABASE_URL.length > 0),
      hasProdUrl: Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0),
    });
  });

  // (Ensures moved to initPromise above)

  // -----------------------------
  // Google Ads OAuth Flow
  // -----------------------------
  const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/googleads/callback";

  app.get("/auth/googleads", (_req, res) => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return res.status(500).send("Missing Google OAuth client configuration");
      }
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, googleRedirectUri);
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: ["https://www.googleapis.com/auth/adwords"],
      });
      res.redirect(authUrl);
    } catch (err: any) {
      console.error("Generate auth URL error:", err?.message || err);
      res.status(500).send("Failed to initiate Google Ads auth");
    }
  });

  app.get("/auth/googleads/callback", async (req, res) => {
    try {
      const code = req.query.code as string | undefined;
      if (!code) {
        return res.status(400).send("Missing authorization code");
      }
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return res.status(500).send("Missing Google OAuth client configuration");
      }
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, googleRedirectUri);
      const { tokens } = await oauth2Client.getToken(code);
      const refreshToken = tokens.refresh_token;
      if (!refreshToken) {
        // If no refresh_token, user may have previously consented; surface a friendly message
        console.warn("No refresh_token returned from Google");
      } else {
        // Save refresh token to DB (user_id=1)
        await pool.query(
          `INSERT INTO google_auth_tokens(user_id, refresh_token)
           VALUES($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET refresh_token=EXCLUDED.refresh_token, updated_at=NOW()`,
          [1, refreshToken]
        );
      }
      // Redirect back to dashboard
      res.redirect("/google-ads");
    } catch (err: any) {
      console.error("Google Ads OAuth callback error:", err?.message || err);
      res.status(500).send("Failed to complete Google Ads auth");
    }
  });

  // -----------------------------
  // Google Ads Campaigns API
  // -----------------------------
  // Moved to dedicated serverless function at api/googleads/campaigns.ts

  // -----------------------------
  // Tasks API
  // -----------------------------
  type Task = {
    id: number;
    text: string;
    complete: boolean;
    assignee: string | null;
    due_date: string | null; // YYYY-MM-DD
    created_at: string; // ISO timestamp
  };

  const CreateTaskSchema = z.object({
    text: z.string().min(1).max(255),
    assignee: z.string().max(50).optional().nullable(),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
  });

  const UpdateTaskStatusSchema = z.object({
    complete: z.boolean(),
  });

  // GET /api/tasks - list all tasks
  app.get("/api/tasks", async (_req, res) => {
    try {
      const result = await pool.query<Task>(
        "SELECT id, text, complete, assignee, to_char(due_date, 'YYYY-MM-DD') AS due_date, created_at FROM tasks ORDER BY created_at DESC"
      );
      res.json({ tasks: result.rows });
    } catch (err: any) {
      console.error("List tasks error:", err?.message || err);
      res.status(500).json({ error: "Failed to list tasks" });
    }
  });

  // -----------------------------
  // Kanban Tasks API (UGC/Design/Work)
  // -----------------------------
  const KanbanTaskSchema = z.object({
    id: z.string().min(1),
    board_slug: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    status: z.string().min(1),
    priority: z.string().min(1),
    due_date: z.string().optional().nullable(),
    assignee: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().default([]),
  });

  const CreateKanbanSchema = KanbanTaskSchema.omit({ id: true }).extend({ id: z.string().optional() });
  const UpdateKanbanSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional().nullable(),
    status: z.string().optional(),
    priority: z.string().optional(),
    due_date: z.string().optional().nullable(),
    assignee: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
  });

  // List tasks for a board
  app.get("/api/kanban/:slug/tasks", async (req, res) => {
    try {
      const slug = req.params.slug;
      const result = await pool.query(
        `SELECT id, board_slug, title, description, status, priority, due_date, assignee, tags, created_at, updated_at
         FROM kanban_tasks WHERE board_slug=$1 ORDER BY created_at DESC`,
        [slug]
      );
      res.json({ tasks: result.rows });
    } catch (err: any) {
      console.error("List kanban tasks error:", err?.message || err);
      res.status(500).json({ error: "Failed to list kanban tasks" });
    }
  });

  // Create task for a board
  app.post("/api/kanban/:slug/tasks", async (req, res) => {
    try {
      const slug = req.params.slug;
      const body = CreateKanbanSchema.parse({ ...req.body, board_slug: slug });
      const id = body.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tags = body.tags ?? [];
      const result = await pool.query(
        `INSERT INTO kanban_tasks(id, board_slug, title, description, status, priority, due_date, assignee, tags, created_at, updated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
         RETURNING id, board_slug, title, description, status, priority, due_date, assignee, tags, created_at, updated_at`,
        [id, slug, body.title, body.description ?? null, body.status, body.priority, body.due_date ?? null, body.assignee ?? null, tags]
      );
      const task = result.rows[0];
      res.status(201).json({ id, task });
    } catch (err: any) {
      console.error("Create kanban task error:", err?.message || err);
      res.status(500).json({ error: "Failed to create kanban task" });
    }
  });

  // Update task
  app.put("/api/kanban/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const body = UpdateKanbanSchema.parse(req.body);
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;
      for (const [k, v] of Object.entries(body)) {
        fields.push(`${k}=$${idx++}`);
        values.push(v ?? null);
      }
      if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });
      values.push(id);
      await pool.query(`UPDATE kanban_tasks SET ${fields.join(", ")}, updated_at=NOW() WHERE id=$${idx}`,[...values]);
      const row = await pool.query(
        `SELECT id, board_slug, title, description, status, priority, due_date, assignee, tags, created_at, updated_at FROM kanban_tasks WHERE id=$1`,
        [id]
      );
      const task = row.rows[0];
      res.json({ ok: true, task });
    } catch (err: any) {
      console.error("Update kanban task error:", err?.message || err);
      res.status(500).json({ error: "Failed to update kanban task" });
    }
  });

  // Delete task
  app.delete("/api/kanban/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await pool.query(`DELETE FROM kanban_tasks WHERE id=$1`, [id]);
      res.json({ ok: true });
    } catch (err: any) {
      console.error("Delete kanban task error:", err?.message || err);
      res.status(500).json({ error: "Failed to delete kanban task" });
    }
  });

  // -----------------------------
  // UGC Briefs API
  // -----------------------------
  const CreateBriefSchema = z.object({
    brief: z.string().min(1),
    // Terima URL opsional; jika ada, validasi longgar: harus string, jika tidak berformat URL akan tetap diterima
    // agar tidak menghalangi input share link. Validasi ketat bisa ditambahkan di UI.
    url: z.string().optional().nullable(),
    caption: z.string().optional().nullable(),
    status: z.string().min(1),
  });

  // List briefs by scope
  app.get("/api/briefs/:scope", async (req, res) => {
    try {
      const scope = req.params.scope;
      const result = await pool.query(
        `SELECT id, scope, brief, url, caption, status, created_at, updated_at
         FROM ugc_briefs WHERE scope=$1 ORDER BY created_at DESC`,
        [scope]
      );
      res.json({ briefs: result.rows });
    } catch (err: any) {
      console.error("List briefs error:", err?.message || err);
      res.status(500).json({ error: "Failed to list briefs" });
    }
  });

  // Create brief
  app.post("/api/briefs/:scope", async (req, res) => {
    try {
      const scope = req.params.scope;
      const parsed = CreateBriefSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
      }
      const body = parsed.data;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await pool.query(
        `INSERT INTO ugc_briefs(id, scope, brief, url, caption, status, created_at, updated_at)
         VALUES($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
        [id, scope, body.brief, body.url ?? null, body.caption ?? null, body.status]
      );
      const row = await pool.query(
        `SELECT id, scope, brief, url, caption, status, created_at, updated_at FROM ugc_briefs WHERE id=$1`,
        [id]
      );
      res.status(201).json({ id, row: row.rows[0] });
    } catch (err: any) {
      console.error("Create brief error:", err?.message || err);
      res.status(500).json({ error: "Failed to create brief", detail: err?.message || String(err) });
    }
  });

  // Delete brief
  app.delete("/api/briefs/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await pool.query(`DELETE FROM ugc_briefs WHERE id=$1`, [id]);
      res.json({ ok: true });
    } catch (err: any) {
      console.error("Delete brief error:", err?.message || err);
      res.status(500).json({ error: "Failed to delete brief" });
    }
  });

  // Update brief (e.g., status or fields)
  app.put("/api/briefs/:id", async (req, res) => {
    try {
      const id = req.params.id;
      // allow updating status, brief, url, caption
      const UpdateBriefSchema = z.object({
        brief: z.string().optional(),
        url: z.string().optional().nullable(),
        caption: z.string().optional().nullable(),
        status: z.string().optional(),
      });
      const parsed = UpdateBriefSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
      }
      const body = parsed.data as Record<string, any>;
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;
      for (const [k, v] of Object.entries(body)) {
        fields.push(`${k}=$${idx++}`);
        values.push(v ?? null);
      }
      if (fields.length === 0) return res.status(400).json({ error: "No fields to update" });
      values.push(id);
      await pool.query(`UPDATE ugc_briefs SET ${fields.join(", ")}, updated_at=NOW() WHERE id=$${idx}`,[...values]);
      const row = await pool.query(
        `SELECT id, scope, brief, url, caption, status, created_at, updated_at FROM ugc_briefs WHERE id=$1`,
        [id]
      );
      res.json({ ok: true, row: row.rows[0] });
    } catch (err: any) {
      console.error("Update brief error:", err?.message || err);
      res.status(500).json({ error: "Failed to update brief" });
    }
  });


  app.get("/api/calendar/cells", async (req, res) => {
    try {
      const month = (req.query.month as string) || ""; // optional filter YYYY-MM
      const sql = month ? `SELECT date, color, tz FROM calendar_cells WHERE date LIKE $1` : `SELECT date, color, tz FROM calendar_cells`;
      const args = month ? [`${month}%`] : [];
      const result = await pool.query(sql, args);
      res.json({ cells: result.rows });
    } catch (err: any) {
      console.error("List calendar cells error:", err?.message || err);
      res.status(500).json({ error: "Failed to list calendar cells" });
    }
  });

  app.post("/api/calendar/cell", async (req, res) => {
    try {
      const { date, color, tz } = req.body as { date?: string; color?: string; tz?: string };
      if (!date) return res.status(400).json({ error: "Missing date" });
      await pool.query(
        `INSERT INTO calendar_cells(date, color, tz, updated_at)
         VALUES($1,$2,$3,NOW())
         ON CONFLICT (date) DO UPDATE SET color=EXCLUDED.color, tz=EXCLUDED.tz, updated_at=NOW()`,
        [date, color ?? null, tz ?? null]
      );
      res.json({ ok: true });
    } catch (err: any) {
      console.error("Upsert calendar cell error:", err?.message || err);
      res.status(500).json({ error: "Failed to save calendar cell" });
    }
  });

  app.delete("/api/calendar/cell", async (req, res) => {
    try {
      const { date } = req.query as { date?: string };
      if (!date) return res.status(400).json({ error: "Missing date" });
      await pool.query(`DELETE FROM calendar_cells WHERE date=$1`, [date]);
      res.json({ ok: true });
    } catch (err: any) {
      console.error("Delete calendar cell error:", err?.message || err);
      res.status(500).json({ error: "Failed to delete calendar cell" });
    }
  });

  app.get("/api/calendar/day-events", async (req, res) => {
    try {
      const { date } = req.query as { date?: string };
      if (!date) return res.status(400).json({ error: "Missing date" });
      const result = await pool.query(
        `SELECT id, date, title, tz, time, notes FROM calendar_events WHERE date=$1 ORDER BY created_at DESC`,
        [date]
      );
      res.json({ events: result.rows });
    } catch (err: any) {
      console.error("List day events error:", err?.message || err);
      res.status(500).json({ error: "Failed to list events", detail: err?.message || String(err) });
    }
  });

  app.post("/api/calendar/day-events", async (req, res) => {
    try {
      const { date, title, tz, time, notes } = req.body as { date?: string; title?: string; tz?: string; time?: string; notes?: string };
      if (!date || !title) return res.status(400).json({ error: "Missing date or title" });
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await pool.query(
        `INSERT INTO calendar_events(id, date, title, tz, time, notes, created_at, updated_at)
         VALUES($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
        [id, date, title, tz ?? null, time ?? null, notes ?? null]
      );
      res.status(201).json({ id });
    } catch (err: any) {
      console.error("Create day event error:", err?.message || err);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.delete("/api/calendar/day-events/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await pool.query(`DELETE FROM calendar_events WHERE id=$1`, [id]);
      res.json({ ok: true });
    } catch (err: any) {
      console.error("Delete event error:", err?.message || err);
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  // POST /api/tasks - create new task
  app.post("/api/tasks", async (req, res) => {
    try {
      const parsed = CreateTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid task payload" });
      }
      const { text, assignee = null, due_date = null } = parsed.data;
      const result = await pool.query<Task>(
        "INSERT INTO tasks(text, assignee, due_date) VALUES($1, $2, $3) RETURNING id, text, complete, assignee, to_char(due_date, 'YYYY-MM-DD') AS due_date, created_at",
        [text, assignee, due_date]
      );
      res.status(201).json({ task: result.rows[0] });
    } catch (err: any) {
      console.error("Create task error:", err?.message || err);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // PATCH /api/tasks/:id - update complete status
  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid task id" });
      }
      const parsed = UpdateTaskStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid patch payload" });
      }
      const { complete } = parsed.data;
      const result = await pool.query<Task>(
        "UPDATE tasks SET complete=$1 WHERE id=$2 RETURNING id, text, complete, assignee, to_char(due_date, 'YYYY-MM-DD') AS due_date, created_at",
        [complete, id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ task: result.rows[0] });
    } catch (err: any) {
      console.error("Patch task error:", err?.message || err);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // DELETE /api/tasks/:id - delete task
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid task id" });
      }
      const result = await pool.query("DELETE FROM tasks WHERE id=$1", [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.status(204).send();
    } catch (err: any) {
      console.error("Delete task error:", err?.message || err);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // -----------------------------
  // Settings API (Workflow name/title + logo)
  // -----------------------------
  app.get("/api/settings/config", async (_req, res) => {
    try {
      const row = await pool.query(
        `SELECT name, title, logo_url AS "logoUrl" FROM settings_config WHERE id=1`
      );
      const conf = row.rows[0] || { name: "Netpiu Svelte", title: "Work Management", logoUrl: null };
      res.json(conf);
    } catch (err: any) {
      console.error("Get settings config error:", err?.message || err);
      res.status(500).json({ error: "Failed to load settings" });
    }
  });

  app.post("/api/settings/save", async (req, res) => {
    try {
      const name = (req.body?.name ?? "Netpiu Svelte").toString();
      const title = (req.body?.title ?? "Work Management").toString();
      await pool.query(
        `INSERT INTO settings_config(id, name, title, updated_at)
         VALUES(1, $1, $2, NOW())
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, title=EXCLUDED.title, updated_at=NOW()`,
        [name, title]
      );
      res.json({ ok: true });
    } catch (err: any) {
      console.error("Save settings error:", err?.message || err);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  app.post("/api/settings/logo", async (req, res) => {
    try {
      const base64 = String(req.body?.imageBase64 || "");
      if (!base64.startsWith("data:image/webp;base64,")) {
        return res.status(400).json({ error: "Invalid image format; expected WEBP base64" });
      }
      const b64 = base64.split(",")[1] || "";
      const buf = Buffer.from(b64, "base64");
      if (buf.length > 500 * 1024) {
        return res.status(400).json({ error: "Image too large; max 500KB" });
      }
      // Save into public/uploads so it can be served statically
      const fs = await import("fs");
      const path = await import("path");
      const outDir = path.resolve(process.cwd(), "install dashboard", "public", "uploads");
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const filename = `logo-${Date.now()}.webp`;
      const outPath = path.join(outDir, filename);
      fs.writeFileSync(outPath, buf);
      const logoUrl = `/uploads/${filename}`;
      await pool.query(
        `UPDATE settings_config SET logo_url=$1, updated_at=NOW() WHERE id=1`,
        [logoUrl]
      );
      res.json({ ok: true, logoUrl });
    } catch (err: any) {
      console.error("Upload logo error:", err?.message || err);
      res.status(500).json({ error: "Failed to upload logo" });
    }
  });

  return app;
}
