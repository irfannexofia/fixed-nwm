import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const app = express();
app.use(express.json({ limit: '1mb' }));
const PORT = process.env.PORT || 5176;

const rootDir = path.resolve('dist/spa');
const rootIndex = path.join(rootDir, 'index.html');
// Netpiu replacement app (built from install dashboard svelte-app)
const netpiuDir = path.resolve('dist/netpiu');
const netpiuIndex = path.join(netpiuDir, 'index.html');

// Resolve React app index flexibly across possible locations
const appCandidates = [
  path.join(rootDir, 'app', 'index.html'),
  path.resolve('dist', 'app', 'index.html'),
  path.resolve('dist', 'index.html')
];
let appIndex = null;
let appDir = null;
for (const candidate of appCandidates) {
  if (fs.existsSync(candidate)) {
    appIndex = candidate;
    appDir = path.dirname(candidate);
    break;
  }
}

function sendFile(res, filePath) {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(filePath);
}

// Serve static assets: use SPA as default
if (appDir) {
  app.use('/app', express.static(appDir));
}
app.use(express.static(rootDir));
// Serve Netpiu app assets under /assets to satisfy absolute asset paths
if (fs.existsSync(netpiuDir)) {
  const netpiuAssets = path.join(netpiuDir, 'assets');
  if (fs.existsSync(netpiuAssets)) {
    app.use('/assets', express.static(netpiuAssets));
  }
}

// Explicit static routes for Svelte pages
// Root and common pages should serve SPA (Work Management)
app.get(['/', '/login', '/contact'], (_req, res) => sendFile(res, rootIndex));
// Redirect any '/home' access to root
app.get(['/home', /^\/home\/(.*)/], (req, res) => {
  res.redirect(308, '/');
});
// Netpiu route should serve the replacement app
app.get(['/netpiu', /^\/netpiu\/(.*)/], (_req, res) => sendFile(res, fs.existsSync(netpiuIndex) ? netpiuIndex : rootIndex));

// React app routes (only if appIndex resolved)
if (appIndex) {
  app.get('/app', (_req, res) => sendFile(res, appIndex));
  app.get(/^\/app\/(.*)/, (_req, res) => sendFile(res, appIndex));
}

// Dynamic brand routes -> React when available, else Svelte
app.get(/^\/(?!api|app|login|contact$)[A-Za-z0-9_-]+$/, (_req, res) => sendFile(res, appIndex ?? rootIndex));
app.get(/^\/(?!api|app|login|contact)[A-Za-z0-9_-]+\/(.*)/, (_req, res) => sendFile(res, appIndex ?? rootIndex));

// Fallback to Svelte index
// Fallback to Svelte index will be registered AFTER API mocks below

// Verify files exist
if (!fs.existsSync(rootIndex)) {
  console.error('[preview-dist] Missing file:', rootIndex);
}
if (!appIndex) {
  console.warn('[preview-dist] React app index not found. Tenant routes will fall back to Svelte.');
} else {
  console.log('[preview-dist] React app index:', appIndex);
}
if (fs.existsSync(netpiuIndex)) {
  console.log('[preview-dist] Netpiu app index:', netpiuIndex);
} else {
  console.warn('[preview-dist] Netpiu app index not found, falling back to Svelte for /netpiu');
}

app.listen(PORT, () => {
  // Bind to 0.0.0.0 so it’s reachable on local network
  // Also log the LAN address for convenience
});

function getLanAddress() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const addrs = nets[name] || [];
    for (const addr of addrs) {
      if (addr && addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return null;
}

// Recreate listener to bind on 0.0.0.0 and show LAN URL
app.listen(Number(PORT), '0.0.0.0', () => {
  const lan = getLanAddress();
  console.log(`[preview-dist] Serving dist/spa on http://localhost:${PORT}`);
  if (lan) {
    console.log(`[preview-dist] LAN Access: http://${lan}:${PORT}`);
  }
});

// --- Mock APIs to support Work Management preview without a database ---
const mem = {
  kanban: /** @type {Record<string, any[]>} */ ({}),
  briefs: /** @type {Record<string, any[]>} */ ({}),
  calendar: {
    cells: /** @type {Record<string, { color:string; tz?:string }>} */ ({}),
    events: /** @type {Record<string, { id:string; title:string; tz?:string; time?:string; notes?:string }[]>} */ ({})
  },
  settings: /** @type {{ name:string; title:string; logoUrl:string|null }} */ ({ name: 'Netpiu Svelte', title: 'Work Management', logoUrl: null }),
  sse: /** @type {Record<string, Set<import('express').Response>>} */ ({}),
};

function ensureBoard(slug) { if (!mem.kanban[slug]) mem.kanban[slug] = []; }
function ensureScope(scope) { if (!mem.briefs[scope]) mem.briefs[scope] = []; }

function sseBroadcast(channel, eventName, payload) {
  const set = mem.sse[channel];
  if (!set || set.size === 0) return;
  const line = `event: ${eventName}\n` + `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    try { res.write(line); } catch {}
  }
}

// Server-Sent Events subscription
app.get('/api/stream', (req, res) => {
  const channel = String(req.query.channel || '').trim() || 'global';
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  res.write(':ok\n\n');
  mem.sse[channel] = mem.sse[channel] || new Set();
  mem.sse[channel].add(res);
  const heartbeat = setInterval(() => { try { res.write(':keepalive\n\n'); } catch {} }, 25000);
  req.on('close', () => {
    clearInterval(heartbeat);
    const set = mem.sse[channel];
    if (set) set.delete(res);
  });
});

// Settings config
app.get('/api/settings/config', (_req, res) => {
  res.json(mem.settings);
});

app.post('/api/settings/save', (req, res) => {
  const name = String(req.body?.name || 'Netpiu Svelte');
  const title = String(req.body?.title || 'Work Management');
  mem.settings.name = name;
  mem.settings.title = title;
  res.json({ ok: true });
});

app.post('/api/settings/logo', (req, res) => {
  try {
    const base64 = String(req.body?.imageBase64 || '');
    if (!base64.startsWith('data:image/webp;base64,')) {
      return res.status(400).json({ error: 'Invalid image format; expected WEBP base64' });
    }
    const b64 = base64.split(',')[1] || '';
    const buf = Buffer.from(b64, 'base64');
    if (buf.length > 500 * 1024) {
      return res.status(400).json({ error: 'Image too large; max 500KB' });
    }
    const uploadsDir = path.join(rootDir, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filename = `logo-${Date.now()}.webp`;
    const outPath = path.join(uploadsDir, filename);
    fs.writeFileSync(outPath, buf);
    const logoUrl = `/uploads/${filename}`;
    mem.settings.logoUrl = logoUrl;
    res.json({ ok: true, logoUrl });
  } catch (e) {
    console.error('Mock upload logo error', e);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Kanban: list
app.get('/api/kanban/:slug/tasks', (req, res) => {
  const slug = req.params.slug;
  ensureBoard(slug);
  res.json({ tasks: mem.kanban[slug] });
});

// Kanban: create
app.post('/api/kanban/:slug/tasks', (req, res) => {
  const slug = req.params.slug;
  ensureBoard(slug);
  const id = Math.random().toString(36).slice(2);
  const now = new Date().toISOString();
  const t = {
    id,
    board_slug: slug,
    title: String(req.body?.title || 'Untitled'),
    description: req.body?.description ?? null,
    status: String(req.body?.status || 'backlog'),
    priority: String(req.body?.priority || 'medium'),
    due_date: req.body?.due_date ?? null,
    assignee: req.body?.assignee ?? null,
    tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
    created_at: now,
    updated_at: now,
  };
  mem.kanban[slug].unshift(t);
  sseBroadcast(`kanban:${slug}`, 'kanban/create', { id, task: t });
  res.status(201).json({ id, task: t });
});

// Kanban: update
app.put('/api/kanban/tasks/:id', (req, res) => {
  const id = req.params.id;
  for (const slug of Object.keys(mem.kanban)) {
    const list = mem.kanban[slug];
    const idx = list.findIndex((x) => x.id === id);
    if (idx !== -1) {
      const curr = list[idx];
      const patch = req.body || {};
      const mapped = {
        title: patch.title ?? curr.title,
        description: patch.description ?? curr.description,
        status: patch.status ?? curr.status,
        priority: patch.priority ?? curr.priority,
        due_date: patch.due_date ?? curr.due_date,
        assignee: patch.assignee ?? curr.assignee,
        tags: Array.isArray(patch.tags) ? patch.tags : curr.tags,
        updated_at: new Date().toISOString(),
      };
      list[idx] = { ...curr, ...mapped };
      sseBroadcast(`kanban:${slug}`, 'kanban/update', { id, task: list[idx] });
      return res.json({ ok: true, task: list[idx] });
    }
  }
  res.status(404).json({ error: 'Task not found' });
});

// Kanban: delete
app.delete('/api/kanban/tasks/:id', (req, res) => {
  const id = req.params.id;
  for (const slug of Object.keys(mem.kanban)) {
    const list = mem.kanban[slug];
    const idx = list.findIndex((x) => x.id === id);
    if (idx !== -1) {
      list.splice(idx, 1);
      sseBroadcast(`kanban:${slug}`, 'kanban/delete', { id });
      return res.json({ ok: true });
    }
  }
  res.status(404).json({ error: 'Task not found' });
});

// Briefs: list
app.get('/api/briefs/:scope', (req, res) => {
  const scope = req.params.scope;
  ensureScope(scope);
  res.json({ briefs: mem.briefs[scope] });
});

// Briefs: create
app.post('/api/briefs/:scope', (req, res) => {
  const scope = req.params.scope;
  ensureScope(scope);
  const id = Math.random().toString(36).slice(2);
  const row = {
    id,
    scope,
    brief: String(req.body?.brief || 'Untitled'),
    url: req.body?.url ?? null,
    caption: req.body?.caption ?? null,
    status: String(req.body?.status || 'Draft'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mem.briefs[scope].unshift(row);
  sseBroadcast(`briefs:${scope}`, 'briefs/create', { id, row });
  res.status(201).json({ id, row });
});

// Briefs: delete
app.delete('/api/briefs/:id', (req, res) => {
  const id = req.params.id;
  for (const scope of Object.keys(mem.briefs)) {
    const list = mem.briefs[scope];
    const idx = list.findIndex((x) => x.id === id);
    if (idx !== -1) {
      list.splice(idx, 1);
      sseBroadcast(`briefs:${scope}`, 'briefs/delete', { id });
      return res.json({ ok: true });
    }
  }
  res.status(404).json({ error: 'Row not found' });
});

// --- Calendar endpoints (preview/memory) ---
// List colored cells for a month: YYYY-MM
app.get('/api/calendar/cells', (req, res) => {
  const month = String(req.query.month || '');
  const cells = [];
  for (const [date, val] of Object.entries(mem.calendar.cells)) {
    if (!month || date.startsWith(month)) cells.push({ date, color: val.color, tz: val.tz || null });
  }
  res.json({ cells });
});

// Set/clear color of a specific date cell
app.post('/api/calendar/cell', (req, res) => {
  const date = String(req.body?.date || '');
  const color = String(req.body?.color || '').trim();
  const tz = req.body?.tz ? String(req.body.tz) : null;
  if (!date || !color) return res.status(400).json({ error: 'date and color are required' });
  mem.calendar.cells[date] = { color, tz: tz || undefined };
  sseBroadcast('calendar:cells', 'calendar/cell', { date, color, tz });
  res.status(201).json({ ok: true });
});

app.delete('/api/calendar/cell', (req, res) => {
  const date = String(req.query.date || '');
  if (!date) return res.status(400).json({ error: 'date is required' });
  delete mem.calendar.cells[date];
  sseBroadcast('calendar:cells', 'calendar/cell', { date, color: null });
  res.json({ ok: true });
});

// Day events
app.get('/api/calendar/day-events', (req, res) => {
  const date = String(req.query.date || '');
  if (!date) return res.status(400).json({ error: 'date is required' });
  const events = mem.calendar.events[date] || [];
  res.json({ events });
});

app.post('/api/calendar/day-events', (req, res) => {
  const date = String(req.body?.date || '');
  const title = String(req.body?.title || '').trim();
  const tz = req.body?.tz ? String(req.body.tz) : null;
  const time = req.body?.time ? String(req.body.time) : null;
  const notes = req.body?.notes ? String(req.body.notes) : null;
  if (!date || !title) return res.status(400).json({ error: 'date and title are required' });
  const id = Math.random().toString(36).slice(2);
  const row = { id, title, tz: tz || undefined, time: time || undefined, notes: notes || undefined };
  mem.calendar.events[date] = mem.calendar.events[date] || [];
  mem.calendar.events[date].push(row);
  sseBroadcast(`calendar:day:${date}`, 'calendar/day/create', { date, event: row });
  res.status(201).json({ id });
});

app.delete('/api/calendar/day-events/:id', (req, res) => {
  const id = String(req.params.id);
  for (const date of Object.keys(mem.calendar.events)) {
    const list = mem.calendar.events[date];
    const idx = list.findIndex((e) => e.id === id);
    if (idx !== -1) {
      list.splice(idx, 1);
      sseBroadcast(`calendar:day:${date}`, 'calendar/day/delete', { id, date });
      return res.json({ ok: true });
    }
  }
  res.status(404).json({ error: 'Event not found' });
});

// Final fallback: serve Svelte index for any non-API route
app.get(/^(?!\/api\/).*/, (_req, res) => sendFile(res, rootIndex));