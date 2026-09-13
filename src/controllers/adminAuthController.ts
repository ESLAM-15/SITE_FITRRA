import { Request, Response } from "express";
import { db } from "../config/db";
import { comparePassword } from "../utils/password";
import { signAdminToken } from "../utils/jwt";
import { AdminRow } from "../types";
import { env } from "../config/env";

const cookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: "strict" as const,
  maxAge: 12 * 60 * 60 * 1000,
  path: "/",
};

export async function adminLogin(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;

  // استعلام PostgreSQL باستخدام $1 بدلاً من ?
  const result = await db.query("SELECT * FROM admins WHERE username = $1", [username]);
  const admin = result.rows[0] as AdminRow | undefined;

  if (!admin) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }

  const valid = await comparePassword(password, admin.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }

  const token = signAdminToken({ role: "admin", adminId: admin.id, username: admin.username });
  res.cookie("admin_token", token, cookieOptions);
  res.json({ id: admin.id, username: admin.username });
}

export function adminLogout(_req: Request, res: Response): void {
  res.clearCookie("admin_token", { path: "/" });
  res.json({ message: "Logged out." });
}

export function adminMe(req: Request, res: Response): void {
  if (!req.admin) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }
  res.json({ id: req.admin.adminId, username: req.admin.username });
}