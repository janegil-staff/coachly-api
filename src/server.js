import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { config } from "./config/env.js";
import { connectDb, disconnectDb } from "./config/db.js";

import authRoutes from "./routes/auth.js";
import shareRoutes from "./routes/share.js";
import questionnaireRoutes from "./routes/questionnaires.js";
import inviteRoutes from "./routes/invite.js";
import relationshipRoutes from "./routes/relationships.js";
import logRoutes from "./routes/logs.js";
import workoutRoutes from "./routes/workouts.js";
import messageRoutes from "./routes/messages.js";
import coachRoutes from "./routes/coach.js";
import scoreRoutes from "./routes/scores.js";
import exerciseRoutes from "./routes/exercises.js";
import userRoutes from "./routes/user.js";

const app = express();

// ── Security & logging ────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow no-origin requests (mobile apps, curl) and any whitelisted origin
      if (!origin) return cb(null, true);
      if (config.corsOrigins.length === 0) return cb(null, true);
      if (config.corsOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
if (config.isDev) app.use(morgan("dev"));

// ── Health check ─────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    env: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/questionnaires", questionnaireRoutes);
app.use("/api/invite", inviteRoutes);
app.use("/api/relationships", relationshipRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/coach", coachRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/user", userRoutes);

// ── 404 handler ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// ── Global error handler ─────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  const payload = {
    error: err.message || "Internal server error",
    code: err.code || undefined,
    details: err.details || undefined,
  };
  if (status >= 500) {
    console.error("[error]", err);
  }
  if (config.isDev && status >= 500) payload.stack = err.stack;
  res.status(status).json(payload);
});

// ── Boot ──────────────────────────────────────────────────────────────────
async function start() {
  await connectDb();
  const server = app.listen(config.port, () => {
    console.log(
      `[server] coachly-api listening on :${config.port} (${config.nodeEnv})`,
    );
  });

  const shutdown = async (signal) => {
    console.log(`[server] received ${signal}, shutting down...`);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});

export default app;
