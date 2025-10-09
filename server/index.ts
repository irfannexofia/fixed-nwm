import "dotenv/config";
import express from "express";
import cors from "cors";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { handleDemo } from "./routes/demo";
import { google } from "googleapis";
import { z } from "zod";
import { handleGoogleCallback, listCalendarEvents } from "./routes/google-auth";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  // Allow larger JSON payloads for base64 uploads (<=2MB)
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));

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

  // Helper: resolve tenant slug from header/query with sane default
  const getTenantSlug = (req: express.Request): string => {
    const header = String(req.headers["x-tenant-slug"] || "");
    const querySlug = String((req.query as any)?.tenant || "");
    const raw = header || querySlug || "default";
    const safe = raw.toLowerCase().trim();
    return /^[a-z0-9._-]+$/.test(safe) ? safe : "default";
  };

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

      // Calendar tables for events and per-day colours
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

      // Settings configuration (single-row)
      await pool.query(
        `CREATE TABLE IF NOT EXISTS settings_config (
           id INT PRIMARY KEY DEFAULT 1,
           logo_url TEXT DEFAULT '/netpiu-logo-2-white-no-background.webp',
           meta_title TEXT DEFAULT 'NetPiu Work Management',
           workflow_title TEXT DEFAULT 'Work Management',
           updated_at TIMESTAMPTZ DEFAULT NOW()
         )`
      );
      // Seed will be done after multi-tenant columns exist
      // Seats table
      await pool.query(
        `CREATE TABLE IF NOT EXISTS seats (
           id SERIAL PRIMARY KEY,
           email TEXT NOT NULL UNIQUE,
           role TEXT NOT NULL CHECK (role IN ('owner','user')),
           created_at TIMESTAMPTZ DEFAULT NOW()
         )`
      );
      // Multi-tenant preparation: add tenant_slug column and proper unique indexes
      await pool.query(`ALTER TABLE settings_config ADD COLUMN IF NOT EXISTS tenant_slug TEXT`);
      await pool.query(`UPDATE settings_config SET tenant_slug='default' WHERE tenant_slug IS NULL`);
      // Allow multiple rows by dropping single-row primary key
      await pool.query(`ALTER TABLE settings_config DROP CONSTRAINT IF EXISTS settings_config_pkey`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS settings_config_tenant_slug_unique ON settings_config(tenant_slug)`);
      // Ensure a default tenant row exists
      await pool.query(
        `INSERT INTO settings_config(tenant_slug) VALUES('default')
         ON CONFLICT (tenant_slug) DO NOTHING`
      );

      await pool.query(`ALTER TABLE seats ADD COLUMN IF NOT EXISTS tenant_slug TEXT`);
      await pool.query(`UPDATE seats SET tenant_slug='default' WHERE tenant_slug IS NULL`);
      // Switch uniqueness to (tenant_slug, email)
      await pool.query(`ALTER TABLE seats DROP CONSTRAINT IF EXISTS seats_email_key`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS seats_tenant_email_unique ON seats(tenant_slug, email)`);

      // Tenantize core work tables
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tenant_slug TEXT`);
      await pool.query(`UPDATE tasks SET tenant_slug='default' WHERE tenant_slug IS NULL`);
      await pool.query(`CREATE INDEX IF NOT EXISTS tasks_tenant_created_idx ON tasks(tenant_slug, created_at DESC)`);

      // Kanban tasks: move from global PK to tenant+id unique
      await pool.query(`ALTER TABLE kanban_tasks ADD COLUMN IF NOT EXISTS tenant_slug TEXT`);
      await pool.query(`UPDATE kanban_tasks SET tenant_slug='default' WHERE tenant_slug IS NULL`);
      await pool.query(`ALTER TABLE kanban_tasks DROP CONSTRAINT IF EXISTS kanban_tasks_pkey`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS kanban_tasks_tenant_id_unique ON kanban_tasks(tenant_slug, id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS kanban_tasks_tenant_board_idx ON kanban_tasks(tenant_slug, board_slug)`);

      // UGC briefs: unique per tenant + id
      await pool.query(`ALTER TABLE ugc_briefs ADD COLUMN IF NOT EXISTS tenant_slug TEXT`);
      await pool.query(`UPDATE ugc_briefs SET tenant_slug='default' WHERE tenant_slug IS NULL`);
      await pool.query(`ALTER TABLE ugc_briefs DROP CONSTRAINT IF EXISTS ugc_briefs_pkey`);
      await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS ugc_briefs_tenant_id_unique ON ugc_briefs(tenant_slug, id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS ugc_briefs_tenant_scope_idx ON ugc_briefs(tenant_slug, scope)`);

      // Calendar events & day colors: unique per tenant
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
  app.get("/api/tasks", async (req, res) => {
    try {
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query<Task>(
        "SELECT id, text, complete, assignee, to_char(due_date, 'YYYY-MM-DD') AS due_date, created_at FROM tasks WHERE tenant_slug=$1 ORDER BY created_at DESC",
        [tenantSlug]
      );
      res.json({ tasks: result.rows });
    } catch (err: any) {
      console.error("List tasks error:", err?.message || err);
      res.status(500).json({ error: "Failed to list tasks" });
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
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query<Task>(
        "INSERT INTO tasks(text, assignee, due_date, tenant_slug) VALUES($1, $2, $3, $4) RETURNING id, text, complete, assignee, to_char(due_date, 'YYYY-MM-DD') AS due_date, created_at",
        [text, assignee, due_date, tenantSlug]
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
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query<Task>(
        "UPDATE tasks SET complete=$1 WHERE id=$2 AND tenant_slug=$3 RETURNING id, text, complete, assignee, to_char(due_date, 'YYYY-MM-DD') AS due_date, created_at",
        [complete, id, tenantSlug]
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
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query("DELETE FROM tasks WHERE id=$1 AND tenant_slug=$2", [id, tenantSlug]);
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
  // Kanban Tasks API (sync across devices)
  // -----------------------------
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
    tags: z.array(z.string()).optional().default([]),
  });

  const UpdateKanbanSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: StatusEnum.optional(),
    priority: PriorityEnum.optional(),
    dueDate: z.string().optional(),
    assignee: z.string().optional(),
    tags: z.array(z.string()).optional(),
  });

  // GET /api/kanban/tasks?board=<slug>
  app.get("/api/kanban/tasks", async (req, res) => {
    try {
      const board = (req.query.board as string) || "";
      if (!board) return res.status(400).json({ error: "Missing board slug" });
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query(
        `SELECT id, board_slug, title, description, status, priority, due_date, assignee, tags, created_at, updated_at
         FROM kanban_tasks WHERE tenant_slug=$1 AND board_slug=$2 ORDER BY created_at DESC`,
        [tenantSlug, board]
      );
      const tasks = result.rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description ?? undefined,
        status: r.status,
        priority: r.priority,
        dueDate: r.due_date ?? undefined,
        assignee: r.assignee ?? undefined,
        tags: (r.tags as string[]) ?? [],
        createdAt: (r.created_at as Date).toISOString?.() ?? r.created_at,
        updatedAt: (r.updated_at as Date).toISOString?.() ?? r.updated_at,
      }));
      res.json({ tasks });
    } catch (err: any) {
      console.error("List kanban tasks error:", err?.message || err);
      res.status(500).json({ error: "Failed to list kanban tasks" });
    }
  });

  // POST /api/kanban/tasks
  app.post("/api/kanban/tasks", async (req, res) => {
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
        tags = [],
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
          description: r.description ?? undefined,
          status: r.status,
          priority: r.priority,
          dueDate: r.due_date ?? undefined,
          assignee: r.assignee ?? undefined,
          tags: (r.tags as string[]) ?? [],
          createdAt: (r.created_at as Date).toISOString?.() ?? r.created_at,
          updatedAt: (r.updated_at as Date).toISOString?.() ?? r.updated_at,
        },
      });
    } catch (err: any) {
      console.error("Create kanban task error:", err?.message || err);
      res.status(500).json({ error: "Failed to create kanban task" });
    }
  });

  // PUT /api/kanban/tasks/:id
  app.put("/api/kanban/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const parsed = UpdateKanbanSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const fields = parsed.data;
      const sets: string[] = [];
      const values: any[] = [];
      let idx = 1;
      for (const [k, v] of Object.entries(fields)) {
        if (v === undefined) continue;
        const col =
          k === "dueDate" ? "due_date" : k === "tags" ? "tags" : k;
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
          description: r.description ?? undefined,
          status: r.status,
          priority: r.priority,
          dueDate: r.due_date ?? undefined,
          assignee: r.assignee ?? undefined,
          tags: (r.tags as string[]) ?? [],
          createdAt: (r.created_at as Date).toISOString?.() ?? r.created_at,
          updatedAt: (r.updated_at as Date).toISOString?.() ?? r.updated_at,
        },
      });
    } catch (err: any) {
      console.error("Update kanban task error:", err?.message || err);
      res.status(500).json({ error: "Failed to update kanban task" });
    }
  });

  // DELETE /api/kanban/tasks/:id
  app.delete("/api/kanban/tasks/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query("DELETE FROM kanban_tasks WHERE id=$1 AND tenant_slug=$2", [id, tenantSlug]);
      if (!result.rowCount) return res.status(404).json({ error: "Task not found" });
      res.status(204).send();
    } catch (err: any) {
      console.error("Delete kanban task error:", err?.message || err);
      res.status(500).json({ error: "Failed to delete kanban task" });
    }
  });

  // --- Aliases for install-dashboard client (slug style) ---
  // GET /api/kanban/:slug/tasks -> returns snake_case fields as expected by client
  app.get("/api/kanban/:slug/tasks", async (req, res) => {
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
    } catch (err: any) {
      console.error("List kanban tasks (alias) error:", err?.message || err);
      res.status(500).json({ error: "Failed to list kanban tasks" });
    }
  });

  // POST /api/kanban/:slug/tasks -> create task, returns { id }
  app.post("/api/kanban/:slug/tasks", async (req, res) => {
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
    } catch (err: any) {
      console.error("Create kanban task (alias) error:", err?.message || err);
      res.status(500).json({ error: "Failed to create kanban task" });
    }
  });

  // -----------------------------
  // UGC Briefs API (table for Task/URL/Caption/Status)
  // -----------------------------
  const CreateBriefSchema = z.object({
    id: z.string().min(8).max(64),
    scope: z.string().min(1), // e.g., "ugc" or "design"
    brief: z.string().min(1),
    url: z.string().optional(),
    caption: z.string().optional(),
    status: z.string().min(1), // label such as "Draft", "On Review", "Published" or STATUS_META labels
  });

  const UpdateBriefSchema = z.object({
    brief: z.string().min(1).optional(),
    url: z.string().url().optional(),
    caption: z.string().optional(),
    status: z.string().min(1).optional(),
  });

  // (Ensures moved to initPromise above)

  // GET /api/ugc/briefs?scope=<slug>
  app.get("/api/ugc/briefs", async (req, res) => {
    try {
      const scope = (req.query.scope as string) || "";
      if (!scope) return res.status(400).json({ error: "Missing scope" });
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query(
        `SELECT id, scope, brief, url, caption, status, created_at, updated_at
         FROM ugc_briefs WHERE tenant_slug=$1 AND scope=$2 ORDER BY created_at DESC`,
        [tenantSlug, scope]
      );
      res.json({ rows: result.rows });
    } catch (err: any) {
      console.error("List briefs error:", err?.message || err);
      res.status(500).json({ error: "Failed to list briefs" });
    }
  });

  // POST /api/ugc/briefs
  app.post("/api/ugc/briefs", async (req, res) => {
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
    } catch (err: any) {
      console.error("Create brief error:", err?.message || err);
      res.status(500).json({ error: "Failed to create brief" });
    }
  });

  // PUT /api/ugc/briefs/:id
  app.put("/api/ugc/briefs/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const parsed = UpdateBriefSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid payload" });
      const fields = parsed.data;
      const sets: string[] = [];
      const values: any[] = [];
      let idx = 1;
      for (const [k, v] of Object.entries(fields)) {
        if (v === undefined) continue;
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
    } catch (err: any) {
      console.error("Update brief error:", err?.message || err);
      res.status(500).json({ error: "Failed to update brief" });
    }
  });

  // DELETE /api/ugc/briefs/:id
  app.delete("/api/ugc/briefs/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query("DELETE FROM ugc_briefs WHERE id=$1 AND tenant_slug=$2", [id, tenantSlug]);
      if (!result.rowCount) return res.status(404).json({ error: "Row not found" });
      res.status(204).send();
    } catch (err: any) {
      console.error("Delete brief error:", err?.message || err);
      res.status(500).json({ error: "Failed to delete brief" });
    }
  });

  // --- Aliases for install-dashboard client (briefs paths) ---
  // GET /api/briefs/:scope -> returns { briefs } array
  app.get("/api/briefs/:scope", async (req, res) => {
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
    } catch (err: any) {
      console.error("List briefs (alias) error:", err?.message || err);
      res.status(500).json({ error: "Failed to list briefs" });
    }
  });

  // POST /api/briefs/:scope -> create brief, returns { id }
  app.post("/api/briefs/:scope", async (req, res) => {
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
    } catch (err: any) {
      console.error("Create brief (alias) error:", err?.message || err);
      res.status(500).json({ error: "Failed to create brief" });
    }
  });

  // DELETE /api/briefs/:id -> alias to ugc delete
  app.delete("/api/briefs/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query("DELETE FROM ugc_briefs WHERE id=$1 AND tenant_slug=$2", [id, tenantSlug]);
      if (!result.rowCount) return res.status(404).json({ error: "Row not found" });
      res.status(204).send();
    } catch (err: any) {
      console.error("Delete brief (alias) error:", err?.message || err);
      res.status(500).json({ error: "Failed to delete brief" });
    }
  });

  // -----------------------------
  // Calendar API (sync events & colors across devices)
  // -----------------------------
  const CreateCalEventSchema = z.object({
    id: z.string().min(6).max(64).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    title: z.string().min(1),
    time: z.string().optional(),
    note: z.string().optional(),
  });

  const SetColorSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    color: z.string().min(3).max(16),
  });

  // GET /api/calendar/local?year=YYYY&month=MM
  app.get("/api/calendar/local", async (req, res) => {
    try {
      const year = (req.query.year as string) || "";
      const month = (req.query.month as string) || "";
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
      const eventsByDay: Record<string, any[]> = {};
      for (const r of eventsRes.rows) {
        if (!eventsByDay[r.date]) eventsByDay[r.date] = [];
        eventsByDay[r.date].push({ id: r.id, title: r.title, time: r.time ?? undefined, note: r.note ?? undefined });
      }
      const colorsByDay: Record<string, string> = {};
      for (const r of colorsRes.rows) colorsByDay[r.date] = r.color;
      res.json({ eventsByDay, colorsByDay });
    } catch (err: any) {
      console.error("List calendar state error:", err?.message || err);
      res.status(500).json({ error: "Failed to list calendar state" });
    }
  });

  // POST /api/calendar/local/event
  app.post("/api/calendar/local/event", async (req, res) => {
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
    } catch (err: any) {
      console.error("Create calendar event error:", err?.message || err);
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  });

  // DELETE /api/calendar/local/event/:id
  app.delete("/api/calendar/local/event/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const tenantSlug = getTenantSlug(req);
      const result = await pool.query("DELETE FROM calendar_events WHERE id=$1 AND tenant_slug=$2", [id, tenantSlug]);
      if (!result.rowCount) return res.status(404).json({ error: "Event not found" });
      res.status(204).send();
    } catch (err: any) {
      console.error("Delete calendar event error:", err?.message || err);
      res.status(500).json({ error: "Failed to delete calendar event" });
    }
  });

  // POST /api/calendar/local/color
  app.post("/api/calendar/local/color", async (req, res) => {
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
    } catch (err: any) {
      console.error("Set day color error:", err?.message || err);
      res.status(500).json({ error: "Failed to set day color" });
    }
  });

  // DELETE /api/calendar/local/color/:date
  app.delete("/api/calendar/local/color/:date", async (req, res) => {
    try {
      const date = req.params.date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Invalid date" });
      const tenantSlug = getTenantSlug(req);
      await pool.query("DELETE FROM calendar_day_colors WHERE tenant_slug=$1 AND date=$2::date", [tenantSlug, date]);
      res.status(204).send();
    } catch (err: any) {
      console.error("Clear day color error:", err?.message || err);
      res.status(500).json({ error: "Failed to clear day color" });
    }
  });

  // -----------------------------
  // Settings API
  // -----------------------------
  // Upload logo: accept base64 WEBP <= 500KB, save to public/uploads and update settings_config.logo_url
  app.post("/api/settings/logo", async (req, res) => {
    try {
      const dataBase64 = String(req.body?.dataBase64 || "");
      if (!dataBase64) return res.status(400).json({ error: "Missing dataBase64" });
      const buf = Buffer.from(dataBase64, "base64");
      const MAX_BYTES = 500 * 1024;
      if (buf.length > MAX_BYTES) return res.status(400).json({ error: "File too large (>500KB)" });
      // Minimal WEBP check: RIFF....WEBP
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
    } catch (err: any) {
      console.error("Upload logo error:", err?.message || err);
      res.status(500).json({ error: "Failed to upload logo" });
    }
  });
  app.get("/api/settings/config", async (req, res) => {
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
          workflowTitle: row.workflow_title ?? "Work Management",
        },
      });
    } catch (err: any) {
      console.error("Get settings error:", err?.message || err);
      res.status(500).json({ error: "Failed to load settings" });
    }
  });

  app.post("/api/settings/config", async (req, res) => {
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
    } catch (err: any) {
      console.error("Save settings error:", err?.message || err);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  app.get("/api/settings/seats", async (req, res) => {
    try {
      const tenantSlug = getTenantSlug(req);
      const r = await pool.query(
        `SELECT id, email, role, created_at FROM seats WHERE tenant_slug=$1 ORDER BY created_at DESC`,
        [tenantSlug]
      );
      const seats = r.rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        createdAt: (row.created_at as Date).toISOString?.() ?? row.created_at,
      }));
      res.json({ seats });
    } catch (err: any) {
      console.error("List seats error:", err?.message || err);
      res.status(500).json({ error: "Failed to list seats" });
    }
  });

  app.post("/api/settings/seats", async (req, res) => {
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
          createdAt: (row.created_at as Date).toISOString?.() ?? row.created_at,
        },
      });
    } catch (err: any) {
      console.error("Create seat error:", err?.message || err);
      res.status(500).json({ error: "Failed to create seat" });
    }
  });

  return app;
}
