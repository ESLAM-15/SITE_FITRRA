import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { verifyAdminToken, verifyCustomerToken } from "../utils/jwt";
import { env } from "../config/env";

const GUEST_COOKIE = "guest_id";
const GUEST_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: "lax" as const, // guest cart must survive normal top-level navigation, not just same-site fetches
  maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
  path: "/",
};

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.admin_token;
  if (!token) {
    res.status(401).json({ error: "Admin authentication required." });
    return;
  }
  try {
    req.admin = verifyAdminToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired admin session." });
  }
}

export function requireCustomer(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.customer_token;
  if (!token) {
    res.status(401).json({ error: "You must be logged in." });
    return;
  }
  try {
    req.customer = verifyCustomerToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }
}

export function optionalCustomer(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.customer_token;
  if (token) {
    try {
      req.customer = verifyCustomerToken(token);
    } catch {
      // ignore invalid token, treat as guest
    }
  }
  next();
}

// Lets customers shop (browse, cart, checkout) without creating an account.
// If a valid customer session exists, use it as before. Otherwise, fall back to an
// anonymous guest identity stored in a long-lived httpOnly cookie so a guest's cart
// survives across requests and page loads without ever requiring login.
export function identifyShopper(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.customer_token;
  if (token) {
    try {
      req.customer = verifyCustomerToken(token);
      next();
      return;
    } catch {
      // fall through to guest handling below
    }
  }

  let guestId = req.cookies?.[GUEST_COOKIE];
  if (!guestId) {
    guestId = uuidv4();
    res.cookie(GUEST_COOKIE, guestId, GUEST_COOKIE_OPTIONS);
  }
  req.guestId = guestId;
  next();
}
