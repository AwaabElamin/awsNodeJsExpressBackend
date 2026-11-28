import express from "express";
import cors from "cors";
import adminRoutes from "./routes/adminRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import { connection } from "./connection.js";

export function createRouter(env = process.env) {
  const router = express.Router();
  const origins = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://injaz.info",
    "https://www.injaz.info",
    ...(env.BUILDSUDAN_FRONTEND_URL || "").split(",").map(value => value.trim()).filter(Boolean),
  ]);
  router.use(cors({
    origin(origin, callback) {
      callback(origin && !origins.has(origin) ? new Error("CORS origin not allowed") : null, true);
    },
  }));
  router.use(express.json({ limit: "10mb" }));
  router.get("/health", (req, res) => res.json({ status: "ok", service: "buildsudan-backend" }));
  router.use("/requests", applicationRoutes);
  router.use("/applications", applicationRoutes);
  router.use("/settings", settingsRoutes);
  router.use("/admin", adminRoutes);
  router.use("/contact", contactRoutes);
  router.use((req, res) => res.status(404).json({ message: "Not found" }));
  router.use((error, req, res, next) => {
    if (error.type === "entity.too.large") return res.status(413).json({ message: "Request body too large" });
    if (error.type === "entity.parse.failed" || error.status === 400) {
      return res.status(400).json({ message: "Invalid JSON request body" });
    }
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("BuildSudan request failed:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  });
  return router;
}

export function connect(uri, dbName) {
  // Avoid implicit schema/index creation and startup writes. Existing data stays untouched.
  return connection.openUri(uri, { dbName, autoIndex: false, autoCreate: false });
}
