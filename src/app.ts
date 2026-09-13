import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import { env } from "./config/env";
import db from "./config/db";
import { initSchema } from "./models/schema";
import { generalLimiter } from "./middleware/rateLimiter";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/authRoutes";
import adminAuthRoutes from "./routes/adminRoutes";
import { publicProductRouter, adminProductRouter } from "./routes/productRoutes";
import cartRoutes from "./routes/cartRoutes";
import { customerOrderRouter, adminOrderRouter } from "./routes/orderRoutes";
import { publicReviewRouter, adminReviewRouter } from "./routes/reviewRoutes";

const app = express();
// لتفعيل التوافق مع Vercel Proxy
app.set("trust proxy", 1);

// --- Security headers ---
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: env.clientOrigin || true,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

if (!env.isProduction) {
  app.use(morgan("dev"));
}

app.use(generalLimiter);

// --- 0. Ensure DB schema is ready ---
// On Vercel every request may hit a fresh serverless instance ("cold start"), so we
// can't rely on a one-time startup script like a traditional server. Instead we run
// the (idempotent, CREATE-TABLE-IF-NOT-EXISTS) schema setup lazily on first use per
// instance and cache the promise so concurrent requests share it instead of racing.
let schemaReadyPromise: Promise<void> | null = null;

function ensureSchemaReady(): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = initSchema(db).catch((err) => {
      // Reset so the next request can retry instead of every future request
      // failing forever because of one transient DB error.
      schemaReadyPromise = null;
      throw err;
    });
  }
  return schemaReadyPromise;
}

app.use((req, res, next) => {
  ensureSchemaReady()
    .then(() => next())
    .catch(next);
});

// --- 1. Static Assets Middlewares ---
app.use(express.static(path.join(process.cwd(), "public")));
app.use("/admin", express.static(path.join(process.cwd(), "admin")));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// --- 2. API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/admin/auth", adminAuthRoutes);

app.use("/api/products", publicProductRouter);
app.use("/api/admin/products", adminProductRouter);

app.use("/api/cart", cartRoutes);

app.use("/api/orders", customerOrderRouter);
app.use("/api/admin/orders", adminOrderRouter);

app.use("/api/reviews", publicReviewRouter);
app.use("/api/admin/reviews", adminReviewRouter);

// Handle API Not Found
app.use("/api", notFoundHandler);

// --- 3. Frontend Fallback Routes ---
// app.get(["/admin", "/admin/*"], (req, res, next) => {
//   const rootAdminPath = path.join(process.cwd(), "admin", "index.html");
//   const distAdminPath = path.join(process.cwd(), "dist", "admin", "index.html");

//   if (fs.existsSync(rootAdminPath)) {
//     return res.sendFile(rootAdminPath);
//   } else if (fs.existsSync(distAdminPath)) {
//     return res.sendFile(distAdminPath);
//   }

//   return res.status(404).json({ error: "Admin index.html file not found on server." });
// });

app.get(["/admin", "/admin/"], (req, res, next) => {
  const rootAdminPath = path.join(process.cwd(), "admin", "login.html");
  const distAdminPath = path.join(process.cwd(), "dist", "admin", "login.html");

  if (fs.existsSync(rootAdminPath)) {
    return res.sendFile(rootAdminPath);
  } else if (fs.existsSync(distAdminPath)) {
    return res.sendFile(distAdminPath);
  }

  return res.status(404).json({ error: "Admin login.html file not found on server." });
});

// Handle Global Not Found for any unmapped route

app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;