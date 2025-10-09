import path from "path";
import os from "os";
import { createServer } from "./index";
import * as express from "express";

const app = createServer();
const port = process.env.PORT || 3000;

// In production, serve the built SPA files
const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, "../spa");

// Serve static files
app.use(express.static(distPath));

// Handle React Router - serve index.html for all non-API/auth routes
// Exclude /api/, /health, and /auth to allow backend handlers for those paths.
app.get(/^(?!\/(?:api\/|health|auth\/)).*/, (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
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
