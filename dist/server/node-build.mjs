import path from "path";
import os from "os";
import "dotenv/config";
import * as express from "express";
import express__default from "express";
import cors from "cors";
import { Pool } from "pg";
import fs from "fs";
import { google } from "googleapis";
import { z } from "zod";
const handleDemo = (req, res) => {
  const response = {
    message: "Hello from Express server"
  };
  res.status(200).json(response);
};
let authClient = null;
function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in env");
  }
  const redirectUri = "postmessage";
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}
const handleGoogleCallback = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Missing authorization code" });
    }
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    authClient = oauth2Client;
    return res.status(200).json({ connected: true });
  } catch (err) {
    console.error("Google OAuth callback error:", err?.message || err);
    return res.status(500).json({ error: "Failed to exchange code" });
  }
};
const listCalendarEvents = async (_req, res) => {
  try {
    if (!authClient) {
      return res.status(401).json({ error: "Not authenticated with Google" });
    }
    const calendar = google.calendar({ version: "v3", auth: authClient });
    const now = /* @__PURE__ */ new Date();
    const eventsRes = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 10
    });
    return res.status(200).json({ events: eventsRes.data.items ?? [] });
  } catch (err) {
    console.error("List events error:", err?.message || err);
    return res.status(500).json({ error: "Failed to list calendar events" });
  }
};
function createServer() {
  const app2 = express__default();
  app2.use(cors());
  app2.use(express__default.json({ limit: "2mb" }));
  app2.use(express__default.urlencoded({ extended: true, limit: "2mb" }));
  const envNode = "production";
  const isDev = !process.env.DATABASE_URL && !!process.env.DEV_DATABASE_URL;
  const databaseUrl = isDev ? process.env.DEV_DATABASE_URL ?? process.env.DATABASE_URL : process.env.DATABASE_URL;
  const inUse = isDev ? "DEV_DATABASE_URL" : "DATABASE_URL";
  const hasUrl = Boolean(databaseUrl && databaseUrl.length > 0);
  console.log(`DB config: env=${isDev ? "development" : "production"} (NODE_ENV=${envNode}), using ${inUse}, present=${hasUrl}`);
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });
  const getTenantSlug = (req) => {
    const header = String(req.headers["x-tenant-slug"] || "");
    const querySlug = String(req.query?.tenant || "");
    const raw = header || querySlug || "default";
    const safe = raw.toLowerCase().trim();
    return /^[a-z0-9._-]+$/.test(safe) ? safe : "default";
  };
  const initPromise = (async () => {
    try {
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
      await pool.query(
        `CREATE TABLE IF NOT EXISTS google_auth_tokens (
           user_id INT PRIMARY KEY,
           refresh_token TEXT NOT NULL,
           updated_at TIMESTAMPTZ DEFAULT NOW()
         )`
      );
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
      await pool.query(
        `CREATE TABLE IF NOT EXISTS calendar_events (
           id TEXT PRIMARY KEY,
           date DATE NOT NULL,
           title TEXT NOT NULL,
           time TEXT,
           note TEXT,
           created_at TIMESTAMPTZ DEFAULT NOW(),
           updated_at TIMESTAMPTZ DEFAULT NOW()
         )`
      );
      await pool.query(
        `CREATE TABLE IF NOT EXISTS calendar_day_colors (
           date DATE PRIMARY KEY,
           color TEXT NOT NULL,
           updated_at TIMESTAMPTZ DEFAULT NOW()
         )`
      );
      await pool.query(
        `CREATE TABLE IF NOT EXISTS settings_config (
           id INT PRIMARY KEY DEFAULT 1,
           logo_url TEXT DEFAULT '/netpiu-logo-2-white-no-background.webp',
           meta_title TEXT DEFAULT 'NetPiu Work Management',
           workflow_title TEXT DEFAULT 'Work Management',
           updated_at TIMESTAMPTZ DEFAULT NOW()
         )`
      );
      await pool.query(
        `CREATE TABLE IF NOT EXISTS seats (
           id SERIAL PRIMARY KEY,
           email TEXT NOT NULL UNIQUE,
           role TEXT NOT NULL CHECK (role IN ('owner','user')),
           created_at TIMESTAMPTZ DEFAULT NOW()
         )`
      );
      await pool.query(`ALTER TABLE settings_config ADD COLUMN IF NOT EXISTS tenant_slug TEXT`);
      await pool.query(`UPDATE settings_config SET tenant_slug='default' WHERE tenant_slug IS NULL`);
      await pool.query(`ALTER TABLE settings_config DROP CONSTRAINT IF EXISTS settings_config_pkey`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS settings_config_tenant_slug_unique ON settings_config(tenant_slug)`);
      await pool.query(
        `INSERT INTO settings_config(tenant_slug) VALUES('default')
         ON CONFLICT (tenant_slug) DO NOTHING`
      );
      await pool.query(`ALTER TABLE seats ADD COLUMN IF NOT EXISTS tenant_slug TEXT`);
      await pool.query(`UPDATE seats SET tenant_slug='default' WHERE tenant_slug IS NULL`);
      await pool.query(`ALTER TABLE seats DROP CONSTRAINT IF EXISTS seats_email_key`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS seats_tenant_email_unique ON seats(tenant_slug, email)`);
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tenant_slug TEXT`);
      await pool.query(`UPDATE tasks SET tenant_slug='default' WHERE tenant_slug IS NULL`);
      await pool.query(`CREATE INDEX IF NOT EXISTS tasks_tenant_created_idx ON tasks(tenant_slug, created_at DESC)`);
      await pool.query(`ALTER TABLE kanban_tasks ADD COLUMN IF NOT EXISTS tenant_slug TEXT`);
      await pool.query(`UPDATE kanban_tasks SET tenant_slug='default' WHERE tenant_slug IS NULL`);
      await pool.query(`ALTER TABLE kanban_tasks DROP CONSTRAINT IF EXISTS kanban_tasks_pkey`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS kanban_tasks_tenant_id_unique ON kanban_tasks(tenant_slug, id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS kanban_tasks_tenant_board_idx ON kanban_tasks(tenant_slug, board_slug)`);
      await pool.query(`ALTER TABLE ugc_briefs ADD COLUMN IF NOT EXISTS tenant_slug TEXT`);
      await pool.query(`UPDATE ugc_briefs SET tenant_slug='default' WHERE tenant_slug IS NULL`);
      await pool.query(`ALTER TABLE ugc_briefs DROP CONSTRAINT IF EXISTS ugc_briefs_pkey`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS ugc_briefs_tenant_id_unique ON ugc_briefs(tenant_slug, id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS ugc_briefs_tenant_scope_idx ON ugc_briefs(tenant_slug, scope)`);
      await pool.query(`ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS tenant_slug TEXT`);
      await pool.query(`UPDATE calendar_events SET tenant_slug='default' WHERE tenant_slug IS NULL`);
      await pool.query(`ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_pkey`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_tenant_id_unique ON calendar_events(tenant_slug, id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS calendar_events_tenant_date_idx ON calendar_events(tenant_slug, date)`);
      await pool.query(`ALTER TABLE calendar_day_colors ADD COLUMN IF NOT EXISTS tenant_slug TEXT`);
      await pool.query(`UPDATE calendar_day_colors SET tenant_slug='default' WHERE tenant_slug IS NULL`);
      await pool.query(`ALTER TABLE calendar_day_colors DROP CONSTRAINT IF EXISTS calendar_day_colors_pkey`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS calendar_day_colors_tenant_date_unique ON calendar_day_colors(tenant_slug, date)`);
      console.log("DB schema ready");
    } catch (err) {
      console.error("Failed to initialize DB schema:", err?.message || err);
      throw err;
    }
  })();
  app2.use(async (_req, res, next) => {
    try {
      await initPromise;
      next();
    } catch {
      res.status(500).json({ error: "Database initialization failed" });
    }
  });
  app2.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });
  app2.get("/api/demo", handleDemo);
  app2.post("/api/auth/google/callback", handleGoogleCallback);
  app2.get("/api/calendar/events", listCalendarEvents);
  app2.get("/health/db", async (_req, res) => {
    try {
      const result = await pool.query("SELECT 1 AS ok");
      res.json({ ok: result.rows[0]?.ok === 1, env: isDev ? "development" : "production" });
    } catch (err) {
      console.error("DB health check failed:", err?.message || err);
      res.status(500).json({ ok: false, error: "DB connection failed" });
    }
  });
  app2.get("/api/health/db", async (_req, res) => {
    try {
      const result = await pool.query("SELECT 1 AS ok");
      res.json({ ok: result.rows[0]?.ok === 1, env: isDev ? "development" : "production" });
    } catch (err) {
      console.error("DB health check failed:", err?.message || err);
      res.status(500).json({ ok: false, error: "DB connection failed" });
    }
  });
  app2.get("/debug/env", (_req, res) => {
    res.json({
      NODE_ENV: "production",
      using: inUse,
      hasDevUrl: Boolean(process.env.DEV_DATABASE_URL && process.env.DEV_DATABASE_URL.length > 0),
      hasProdUrl: Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0)
    });
  });
  app2.get("/api/debug/env", (_req, res) => {
    res.json({
      NODE_ENV: "production",
      using: inUse,
      hasDevUrl: Boolean(process.env.DEV_DATABASE_URL && process.env.DEV_DATABASE_URL.length > 0),
      hasProdUrl: Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0)
    });
  });
  const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/googleads/callback";
  app2.get("/auth/googleads", (_req, res) => {
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
        scope: ["https://www.googleapis.com/auth/adwords"]
      });
      res.redirect(authUrl);
    } catch (err) {
      console.error("Generate auth URL error:", err?.message || err);
      res.status(500).send("Failed to initiate Google Ads auth");
    }
  });
  app2.get("/auth/googleads/callback", async (req, res) => {
    try {
      const code = req.query.code;
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
        console.warn("No refresh_token returned from Google");
      } else {
        await pool.query(
          `INSERT INTO google_auth_tokens(user_id, refresh_token)
           VALUES($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET refresh_token=EXCLUDED.refresh_token, updated_at=NOW()`,
          [1, refreshToken]
        );
      }
      res.redirect("/google-ads");
    } catch (err) {
      console.error("Google Ads OAuth callback error:", err?.message || err);
      res.status(500).send("Failed to complete Google Ads auth");
    }
  });
  const CreateTaskSchema = z.object({
    text: z.string().min(1).max(255),
    assignee: z.string().max(50).optional().nullable(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()
  });
  const UpdateTaskStatusSchema = z.object({
    complete: z.boolean()
  });
  app2.get("/api/tasks", async (req, res) => {
    try {
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query(
        "SELECT id, text, complete, assignee, to_char(due_date, 'YYYY-MM-DD') AS due_date, created_at FROM tasks WHERE tenant_slug=$1 ORDER BY created_at DESC",
        [tenantSlug]
      );
      res.json({ tasks: result.rows });
    } catch (err) {
      console.error("List tasks error:", err?.message || err);
      res.status(500).json({ error: "Failed to list tasks" });
    }
  });
  app2.post("/api/tasks", async (req, res) => {
    try {
      const parsed = CreateTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid task payload" });
      }
      const { text, assignee = null, due_date = null } = parsed.data;
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query(
        "INSERT INTO tasks(text, assignee, due_date, tenant_slug) VALUES($1, $2, $3, $4) RETURNING id, text, complete, assignee, to_char(due_date, 'YYYY-MM-DD') AS due_date, created_at",
        [text, assignee, due_date, tenantSlug]
      );
      res.status(201).json({ task: result.rows[0] });
    } catch (err) {
      console.error("Create task error:", err?.message || err);
      res.status(500).json({ error: "Failed to create task" });
    }
  });
  app2.patch("/api/tasks/:id", async (req, res) => {
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
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query(
        "UPDATE tasks SET complete=$1 WHERE id=$2 AND tenant_slug=$3 RETURNING id, text, complete, assignee, to_char(due_date, 'YYYY-MM-DD') AS due_date, created_at",
        [complete, id, tenantSlug]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json({ task: result.rows[0] });
    } catch (err) {
      console.error("Patch task error:", err?.message || err);
      res.status(500).json({ error: "Failed to update task" });
    }
  });
  app2.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Invalid task id" });
      }
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query("DELETE FROM tasks WHERE id=$1 AND tenant_slug=$2", [id, tenantSlug]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.status(204).send();
    } catch (err) {
      console.error("Delete task error:", err?.message || err);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });
  const StatusEnum = z.enum(["backlog", "in_progress", "review", "done"]);
  const PriorityEnum = z.enum(["low", "medium", "high", "urgent"]);
  const CreateKanbanSchema = z.object({
    id: z.string().min(8).max(64).optional(),
    board: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    status: StatusEnum.default("backlog"),
    priority: PriorityEnum.default("medium"),
    dueDate: z.string().optional(),
    assignee: z.string().optional(),
    tags: z.array(z.string()).optional().default([])
  });
  const UpdateKanbanSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: StatusEnum.optional(),
    priority: PriorityEnum.optional(),
    dueDate: z.string().optional(),
    assignee: z.string().optional(),
    tags: z.array(z.string()).optional()
  });
  app2.get("/api/kanban/tasks", async (req, res) => {
    try {
      const board = req.query.board || "";
      if (!board) return res.status(400).json({ error: "Missing board slug" });
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query(
        `SELECT id, board_slug, title, description, status, priority, due_date, assignee, tags, created_at, updated_at
         FROM kanban_tasks WHERE tenant_slug=$1 AND board_slug=$2 ORDER BY created_at DESC`,
        [tenantSlug, board]
      );
      const tasks = result.rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description ?? void 0,
        status: r.status,
        priority: r.priority,
        dueDate: r.due_date ?? void 0,
        assignee: r.assignee ?? void 0,
        tags: r.tags ?? [],
        createdAt: r.created_at.toISOString?.() ?? r.created_at,
        updatedAt: r.updated_at.toISOString?.() ?? r.updated_at
      }));
      res.json({ tasks });
    } catch (err) {
      console.error("List kanban tasks error:", err?.message || err);
      res.status(500).json({ error: "Failed to list kanban tasks" });
    }
  });
  app2.post("/api/kanban/tasks", async (req, res) => {
    try {
      const parsed = CreateKanbanSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const {
        id = Math.random().toString(36).slice(2),
        board,
        title,
        description,
        status,
        priority,
        dueDate,
        assignee,
        tags = []
      } = parsed.data;
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query(
        `INSERT INTO kanban_tasks(id, tenant_slug, board_slug, title, description, status, priority, due_date, assignee, tags)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING id, board_slug, title, description, status, priority, due_date, assignee, tags, created_at, updated_at`,
        [id, tenantSlug, board, title, description ?? null, status, priority, dueDate ?? null, assignee ?? null, tags]
      );
      const r = result.rows[0];
      res.status(201).json({
        task: {
          id: r.id,
          title: r.title,
          description: r.description ?? void 0,
          status: r.status,
          priority: r.priority,
          dueDate: r.due_date ?? void 0,
          assignee: r.assignee ?? void 0,
          tags: r.tags ?? [],
          createdAt: r.created_at.toISOString?.() ?? r.created_at,
          updatedAt: r.updated_at.toISOString?.() ?? r.updated_at
        }
      });
    } catch (err) {
      console.error("Create kanban task error:", err?.message || err);
      res.status(500).json({ error: "Failed to create kanban task" });
    }
  });
  app2.put("/api/kanban/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const parsed = UpdateKanbanSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const fields = parsed.data;
      const sets = [];
      const values = [];
      let idx = 1;
      for (const [k, v] of Object.entries(fields)) {
        if (v === void 0) continue;
        const col = k === "dueDate" ? "due_date" : k === "tags" ? "tags" : k;
        sets.push(`${col}=$${idx++}`);
        values.push(v);
      }
      if (!sets.length) return res.status(400).json({ error: "No fields to update" });
      const tenantSlug = getTenantSlug(req);
      values.push(id);
      values.push(tenantSlug);
      const result = await pool.query(
        `UPDATE kanban_tasks SET ${sets.join(", ")}, updated_at=NOW() WHERE id=$${idx} AND tenant_slug=$${idx + 1}
         RETURNING id, board_slug, title, description, status, priority, due_date, assignee, tags, created_at, updated_at`,
        values
      );
      if (!result.rowCount) return res.status(404).json({ error: "Task not found" });
      const r = result.rows[0];
      res.json({
        task: {
          id: r.id,
          title: r.title,
          description: r.description ?? void 0,
          status: r.status,
          priority: r.priority,
          dueDate: r.due_date ?? void 0,
          assignee: r.assignee ?? void 0,
          tags: r.tags ?? [],
          createdAt: r.created_at.toISOString?.() ?? r.created_at,
          updatedAt: r.updated_at.toISOString?.() ?? r.updated_at
        }
      });
    } catch (err) {
      console.error("Update kanban task error:", err?.message || err);
      res.status(500).json({ error: "Failed to update kanban task" });
    }
  });
  app2.delete("/api/kanban/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query("DELETE FROM kanban_tasks WHERE id=$1 AND tenant_slug=$2", [id, tenantSlug]);
      if (!result.rowCount) return res.status(404).json({ error: "Task not found" });
      res.status(204).send();
    } catch (err) {
      console.error("Delete kanban task error:", err?.message || err);
      res.status(500).json({ error: "Failed to delete kanban task" });
    }
  });
  app2.get("/api/kanban/:slug/tasks", async (req, res) => {
    try {
      const slug = req.params.slug;
      if (!slug) return res.status(400).json({ error: "Missing board slug" });
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query(
        `SELECT id, board_slug, title, description, status, priority, due_date, assignee, tags, created_at, updated_at
         FROM kanban_tasks WHERE tenant_slug=$1 AND board_slug=$2 ORDER BY created_at DESC`,
        [tenantSlug, slug]
      );
      res.json({ tasks: result.rows });
    } catch (err) {
      console.error("List kanban tasks (alias) error:", err?.message || err);
      res.status(500).json({ error: "Failed to list kanban tasks" });
    }
  });
  app2.post("/api/kanban/:slug/tasks", async (req, res) => {
    try {
      const slug = req.params.slug;
      if (!slug) return res.status(400).json({ error: "Missing board slug" });
      const id = Math.random().toString(36).slice(2);
      const { title, description, status, priority, due_date, assignee, tags } = req.body || {};
      if (!title || typeof title !== "string") return res.status(400).json({ error: "Invalid title" });
      const tenantSlug = getTenantSlug(req);
      await pool.query(
        `INSERT INTO kanban_tasks(id, tenant_slug, board_slug, title, description, status, priority, due_date, assignee, tags)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [id, tenantSlug, slug, title, description ?? null, status ?? "backlog", priority ?? "medium", due_date ?? null, assignee ?? null, Array.isArray(tags) ? tags : []]
      );
      res.status(201).json({ id });
    } catch (err) {
      console.error("Create kanban task (alias) error:", err?.message || err);
      res.status(500).json({ error: "Failed to create kanban task" });
    }
  });
  const CreateBriefSchema = z.object({
    id: z.string().min(8).max(64),
    scope: z.string().min(1),
    // e.g., "ugc" or "design"
    brief: z.string().min(1),
    url: z.string().optional(),
    caption: z.string().optional(),
    status: z.string().min(1)
    // label such as "Draft", "On Review", "Published" or STATUS_META labels
  });
  const UpdateBriefSchema = z.object({
    brief: z.string().min(1).optional(),
    url: z.string().url().optional(),
    caption: z.string().optional(),
    status: z.string().min(1).optional()
  });
  app2.get("/api/ugc/briefs", async (req, res) => {
    try {
      const scope = req.query.scope || "";
      if (!scope) return res.status(400).json({ error: "Missing scope" });
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query(
        `SELECT id, scope, brief, url, caption, status, created_at, updated_at
         FROM ugc_briefs WHERE tenant_slug=$1 AND scope=$2 ORDER BY created_at DESC`,
        [tenantSlug, scope]
      );
      res.json({ rows: result.rows });
    } catch (err) {
      console.error("List briefs error:", err?.message || err);
      res.status(500).json({ error: "Failed to list briefs" });
    }
  });
  app2.post("/api/ugc/briefs", async (req, res) => {
    try {
      const parsed = CreateBriefSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const { id, scope, brief, url, caption, status } = parsed.data;
      const urlNorm = url && url.trim().length > 0 ? url : null;
      const captionNorm = caption && caption.trim().length > 0 ? caption : null;
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query(
        `INSERT INTO ugc_briefs(id, tenant_slug, scope, brief, url, caption, status)
         VALUES($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, scope, brief, url, caption, status, created_at, updated_at`,
        [id, tenantSlug, scope, brief, urlNorm, captionNorm, status]
      );
      res.status(201).json({ row: result.rows[0] });
    } catch (err) {
      console.error("Create brief error:", err?.message || err);
      res.status(500).json({ error: "Failed to create brief" });
    }
  });
  app2.put("/api/ugc/briefs/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const parsed = UpdateBriefSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const fields = parsed.data;
      const sets = [];
      const values = [];
      let idx = 1;
      for (const [k, v] of Object.entries(fields)) {
        if (v === void 0) continue;
        sets.push(`${k}=$${idx++}`);
        values.push(v);
      }
      if (!sets.length) return res.status(400).json({ error: "No fields to update" });
      const tenantSlug = getTenantSlug(req);
      values.push(id);
      values.push(tenantSlug);
      const result = await pool.query(
        `UPDATE ugc_briefs SET ${sets.join(", ")}, updated_at=NOW() WHERE id=$${idx} AND tenant_slug=$${idx + 1}
         RETURNING id, scope, brief, url, caption, status, created_at, updated_at`,
        values
      );
      if (!result.rowCount) return res.status(404).json({ error: "Row not found" });
      res.json({ row: result.rows[0] });
    } catch (err) {
      console.error("Update brief error:", err?.message || err);
      res.status(500).json({ error: "Failed to update brief" });
    }
  });
  app2.delete("/api/ugc/briefs/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query("DELETE FROM ugc_briefs WHERE id=$1 AND tenant_slug=$2", [id, tenantSlug]);
      if (!result.rowCount) return res.status(404).json({ error: "Row not found" });
      res.status(204).send();
    } catch (err) {
      console.error("Delete brief error:", err?.message || err);
      res.status(500).json({ error: "Failed to delete brief" });
    }
  });
  app2.get("/api/briefs/:scope", async (req, res) => {
    try {
      const scope = req.params.scope;
      if (!scope) return res.status(400).json({ error: "Missing scope" });
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query(
        `SELECT id, scope, brief, url, caption, status, created_at, updated_at
         FROM ugc_briefs WHERE tenant_slug=$1 AND scope=$2 ORDER BY created_at DESC`,
        [tenantSlug, scope]
      );
      res.json({ briefs: result.rows });
    } catch (err) {
      console.error("List briefs (alias) error:", err?.message || err);
      res.status(500).json({ error: "Failed to list briefs" });
    }
  });
  app2.post("/api/briefs/:scope", async (req, res) => {
    try {
      const scope = req.params.scope;
      const { brief, url, caption, status } = req.body || {};
      if (!scope || !brief || !status) return res.status(400).json({ error: "Invalid payload" });
      const id = Math.random().toString(36).slice(2);
      const tenantSlug = getTenantSlug(req);
      await pool.query(
        `INSERT INTO ugc_briefs(id, tenant_slug, scope, brief, url, caption, status)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [id, tenantSlug, scope, brief, url ?? null, caption ?? null, status]
      );
      res.status(201).json({ id });
    } catch (err) {
      console.error("Create brief (alias) error:", err?.message || err);
      res.status(500).json({ error: "Failed to create brief" });
    }
  });
  app2.delete("/api/briefs/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query("DELETE FROM ugc_briefs WHERE id=$1 AND tenant_slug=$2", [id, tenantSlug]);
      if (!result.rowCount) return res.status(404).json({ error: "Row not found" });
      res.status(204).send();
    } catch (err) {
      console.error("Delete brief (alias) error:", err?.message || err);
      res.status(500).json({ error: "Failed to delete brief" });
    }
  });
  const CreateCalEventSchema = z.object({
    id: z.string().min(6).max(64).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    title: z.string().min(1),
    time: z.string().optional(),
    note: z.string().optional()
  });
  const SetColorSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    color: z.string().min(3).max(16)
  });
  app2.get("/api/calendar/local", async (req, res) => {
    try {
      const year = req.query.year || "";
      const month = req.query.month || "";
      if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month))
        return res.status(400).json({ error: "Invalid year/month" });
      const start = `${year}-${month}-01`;
      const tenantSlug = getTenantSlug(req);
      const eventsRes = await pool.query(
        `SELECT id, to_char(date,'YYYY-MM-DD') AS date, title, time, note
         FROM calendar_events
         WHERE tenant_slug=$2 AND date >= $1::date AND date < ($1::date + INTERVAL '1 month')
         ORDER BY date ASC, created_at ASC`,
        [start, tenantSlug]
      );
      const colorsRes = await pool.query(
        `SELECT to_char(date,'YYYY-MM-DD') AS date, color
         FROM calendar_day_colors
         WHERE tenant_slug=$2 AND date >= $1::date AND date < ($1::date + INTERVAL '1 month')`,
        [start, tenantSlug]
      );
      const eventsByDay = {};
      for (const r of eventsRes.rows) {
        if (!eventsByDay[r.date]) eventsByDay[r.date] = [];
        eventsByDay[r.date].push({ id: r.id, title: r.title, time: r.time ?? void 0, note: r.note ?? void 0 });
      }
      const colorsByDay = {};
      for (const r of colorsRes.rows) colorsByDay[r.date] = r.color;
      res.json({ eventsByDay, colorsByDay });
    } catch (err) {
      console.error("List calendar state error:", err?.message || err);
      res.status(500).json({ error: "Failed to list calendar state" });
    }
  });
  app2.post("/api/calendar/local/event", async (req, res) => {
    try {
      const parsed = CreateCalEventSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const { id = Math.random().toString(36).slice(2), date, title, time, note } = parsed.data;
      const tenantSlug = getTenantSlug(req);
      await pool.query(
        `INSERT INTO calendar_events(id, tenant_slug, date, title, time, note)
         VALUES($1, $2, $3::date, $4, $5, $6)
         ON CONFLICT (tenant_slug, id)
         DO UPDATE SET date=EXCLUDED.date, title=EXCLUDED.title, time=EXCLUDED.time, note=EXCLUDED.note, updated_at=NOW()`,
        [id, tenantSlug, date, title, time ?? null, note ?? null]
      );
      res.status(201).json({ id });
    } catch (err) {
      console.error("Create calendar event error:", err?.message || err);
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  });
  app2.delete("/api/calendar/local/event/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query("DELETE FROM calendar_events WHERE id=$1 AND tenant_slug=$2", [id, tenantSlug]);
      if (!result.rowCount) return res.status(404).json({ error: "Event not found" });
      res.status(204).send();
    } catch (err) {
      console.error("Delete calendar event error:", err?.message || err);
      res.status(500).json({ error: "Failed to delete calendar event" });
    }
  });
  app2.post("/api/calendar/local/color", async (req, res) => {
    try {
      const parsed = SetColorSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const { date, color } = parsed.data;
      const tenantSlug = getTenantSlug(req);
      await pool.query(
        `INSERT INTO calendar_day_colors(tenant_slug, date, color)
         VALUES($1, $2::date, $3)
         ON CONFLICT (tenant_slug, date)
         DO UPDATE SET color=EXCLUDED.color, updated_at=NOW()`,
        [tenantSlug, date, color]
      );
      res.status(201).json({ ok: true });
    } catch (err) {
      console.error("Set day color error:", err?.message || err);
      res.status(500).json({ error: "Failed to set day color" });
    }
  });
  app2.delete("/api/calendar/local/color/:date", async (req, res) => {
    try {
      const date = req.params.date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Invalid date" });
      const tenantSlug = getTenantSlug(req);
      await pool.query("DELETE FROM calendar_day_colors WHERE tenant_slug=$1 AND date=$2::date", [tenantSlug, date]);
      res.status(204).send();
    } catch (err) {
      console.error("Clear day color error:", err?.message || err);
      res.status(500).json({ error: "Failed to clear day color" });
    }
  });
  app2.post("/api/settings/logo", async (req, res) => {
    try {
      const dataBase64 = String(req.body?.dataBase64 || "");
      if (!dataBase64) return res.status(400).json({ error: "Missing dataBase64" });
      const buf = Buffer.from(dataBase64, "base64");
      const MAX_BYTES = 500 * 1024;
      if (buf.length > MAX_BYTES) return res.status(400).json({ error: "File too large (>500KB)" });
      const isWebp = buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP";
      if (!isWebp) return res.status(400).json({ error: "Only WEBP images are allowed" });
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await fs.promises.mkdir(uploadsDir, { recursive: true });
      const filename = `logo-${Date.now()}.webp`;
      const filePath = path.join(uploadsDir, filename);
      await fs.promises.writeFile(filePath, buf);
      const urlPath = `/uploads/${filename}`;
      const tenantSlug = getTenantSlug(req);
      await pool.query(
        `INSERT INTO settings_config (tenant_slug, logo_url, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (tenant_slug) DO UPDATE SET logo_url=EXCLUDED.logo_url, updated_at=EXCLUDED.updated_at`,
        [tenantSlug, urlPath]
      );
      res.status(201).json({ url: urlPath });
    } catch (err) {
      console.error("Upload logo error:", err?.message || err);
      res.status(500).json({ error: "Failed to upload logo" });
    }
  });
  app2.get("/api/settings/config", async (req, res) => {
    try {
      const tenantSlug = getTenantSlug(req);
      const r = await pool.query(
        `SELECT logo_url, meta_title, workflow_title FROM settings_config WHERE tenant_slug=$1 LIMIT 1`,
        [tenantSlug]
      );
      const row = r.rows[0] || {};
      res.json({
        config: {
          logoUrl: row.logo_url ?? "/netpiu-logo-2-white-no-background.webp",
          metaTitle: row.meta_title ?? "NetPiu Work Management",
          workflowTitle: row.workflow_title ?? "Work Management"
        }
      });
    } catch (err) {
      console.error("Get settings error:", err?.message || err);
      res.status(500).json({ error: "Failed to load settings" });
    }
  });
  app2.post("/api/settings/config", async (req, res) => {
    try {
      const { logoUrl, metaTitle, workflowTitle } = req.body || {};
      const tenantSlug = getTenantSlug(req);
      await pool.query(
        `INSERT INTO settings_config (tenant_slug, logo_url, meta_title, workflow_title, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (tenant_slug) DO UPDATE SET
           logo_url=EXCLUDED.logo_url,
           meta_title=EXCLUDED.meta_title,
           workflow_title=EXCLUDED.workflow_title,
           updated_at=EXCLUDED.updated_at`,
        [tenantSlug, logoUrl ?? null, metaTitle ?? null, workflowTitle ?? null]
      );
      res.status(201).json({ ok: true });
    } catch (err) {
      console.error("Save settings error:", err?.message || err);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });
  app2.get("/api/settings/seats", async (req, res) => {
    try {
      const tenantSlug = getTenantSlug(req);
      const r = await pool.query(
        `SELECT id, email, role, created_at FROM seats WHERE tenant_slug=$1 ORDER BY created_at DESC`,
        [tenantSlug]
      );
      const seats = r.rows.map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        createdAt: row.created_at.toISOString?.() ?? row.created_at
      }));
      res.json({ seats });
    } catch (err) {
      console.error("List seats error:", err?.message || err);
      res.status(500).json({ error: "Failed to list seats" });
    }
  });
  app2.post("/api/settings/seats", async (req, res) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const role = String(req.body?.role || "user").toLowerCase();
      if (!email || !email.includes("@")) return res.status(400).json({ error: "Invalid email" });
      if (!["owner", "user"].includes(role)) return res.status(400).json({ error: "Invalid role" });
      const tenantSlug = getTenantSlug(req);
      const r = await pool.query(
        `INSERT INTO seats(email, role, tenant_slug) VALUES($1, $2, $3)
         ON CONFLICT (tenant_slug, email) DO UPDATE SET role=EXCLUDED.role
         RETURNING id, email, role, created_at`,
        [email, role, tenantSlug]
      );
      const row = r.rows[0];
      res.status(201).json({
        seat: {
          id: row.id,
          email: row.email,
          role: row.role,
          createdAt: row.created_at.toISOString?.() ?? row.created_at
        }
      });
    } catch (err) {
      console.error("Create seat error:", err?.message || err);
      res.status(500).json({ error: "Failed to create seat" });
    }
  });
  return app2;
}
const app = createServer();
const port = process.env.PORT || 3e3;
const __dirname = import.meta.dirname;
const spaPath = path.join(__dirname, "../spa");
const netpiuPath = path.join(__dirname, "../netpiu");
app.use(express.static(spaPath));
app.use("/assets", express.static(path.join(netpiuPath, "assets")));
app.get(["/netpiu", /^\/netpiu\/(.*)/], (_req, res) => {
  res.sendFile(path.join(netpiuPath, "index.html"));
});
app.get(["/home", /^\/home\/(.*)/], (req, res) => {
  res.redirect(308, "/");
});
app.get(/^(?!\/(?:api\/|health|auth\/)).*/, (_req, res) => {
  res.sendFile(path.join(spaPath, "index.html"));
});
function getLanAddress() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const addrs = nets[name] || [];
    for (const addr of addrs) {
      if (addr && addr.family === "IPv4" && !addr.internal) {
        return addr.address;
      }
    }
  }
  return null;
}
app.listen(Number(port), "0.0.0.0", () => {
  const lan = getLanAddress();
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  if (lan) {
    console.log(`📡 LAN Access: http://${lan}:${port}`);
  }
  console.log(`🔧 API: http://localhost:${port}/api`);
});
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
//# sourceMappingURL=node-build.mjs.map
