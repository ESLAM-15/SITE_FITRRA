import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { env } from "../config/env";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: "Not found." });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }
  if (err && typeof err.message === "string" && err.message.includes("Only JPG")) {
    res.status(400).json({ error: err.message });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);

  // إظهار تفاصيل الخطأ الحقيقية لتحديد السبب المباشر على Vercel
  res.status(err?.status || 500).json({
    error: err?.message || String(err),
    details: env.isProduction ? undefined : err?.stack,
  });
}