import type { IncomingMessage, ServerResponse } from "http";
import { createServer } from "../server";

// Create the Express app once per lambda instance
const app = createServer();

// Vercel serverless function entry. Delegate to Express.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}