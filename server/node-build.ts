import path from "path";
import os from "os";
import { createServer } from "./index";
import * as express from "express";

const app = createServer();
const port = process.env.PORT || 3000;

// In production, serve SPA by default, NetPiu only under /netpiu
const __dirname = import.meta.dirname;
const spaPath = path.join(__dirname, "../spa");
const netpiuPath = path.join(__dirname, "../netpiu");

// Serve SPA static files
app.use(express.static(spaPath));

// Netpiu assets (absolute '/assets' used by Netpiu build)
app.use('/assets', express.static(path.join(netpiuPath, 'assets')));

// Netpiu routes only under /netpiu
app.get(["/netpiu", /^\/netpiu\/(.*)/], (_req, res) => {
  res.sendFile(path.join(netpiuPath, "index.html"));
});

// Redirect any '/home' access to root
app.get(["/home", /^\/home\/(.*)/], (req, res) => {
  res.redirect(308, "/");
});

// Catch-all: non-API/auth routes go to SPA (/, /home, etc.)
app.get(/^(?!\/(?:api\/|health|auth\/)).*/, (_req, res) => {
  res.sendFile(path.join(spaPath, "index.html"));
});

// Resolve LAN IP for convenience logging
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

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
