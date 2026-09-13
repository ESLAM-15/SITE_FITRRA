import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { db } from "../config/db";
import { hashPassword, comparePassword } from "../utils/password";
import { signCustomerToken } from "../utils/jwt";
import { CustomerRow } from "../types";
import { env } from "../config/env";

const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;

const cookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

// A shopper who added items to their cart before logging in has them stored against a
// guest cookie identity. Once they log in or register, fold those items into their real
// account cart (summing quantities, capped to stock) so nothing they picked gets lost.
async function mergeGuestCart(req: Request, res: Response, customerId: number): Promise<void> {
  const guestId = req.cookies?.guest_id;
  if (!guestId) return;

  const guestItemsRes = await db.query(
    "SELECT product_id, quantity FROM cart_items WHERE guest_id = $1",
    [guestId]
  );
  const guestItems = guestItemsRes.rows as { product_id: number; quantity: number }[];

  for (const item of guestItems) {
    const productRes = await db.query(
      "SELECT stock FROM products WHERE id = $1",
      [item.product_id]
    );
    const product = productRes.rows[0] as { stock: number } | undefined;
    if (!product) continue;

    const existingRes = await db.query(
      "SELECT id, quantity FROM cart_items WHERE customer_id = $1 AND product_id = $2",
      [customerId, item.product_id]
    );
    const existing = existingRes.rows[0] as { id: number; quantity: number } | undefined;

    const desiredQty = Math.min((existing?.quantity || 0) + item.quantity, product.stock);
    if (desiredQty <= 0) continue;

    if (existing) {
      await db.query("UPDATE cart_items SET quantity = $1 WHERE id = $2", [desiredQty, existing.id]);
    } else {
      await db.query(
        "INSERT INTO cart_items (customer_id, product_id, quantity) VALUES ($1, $2, $3)",
        [customerId, item.product_id, desiredQty]
      );
    }
  }

  await db.query("DELETE FROM cart_items WHERE guest_id = $1", [guestId]);
  res.clearCookie("guest_id", { path: "/" });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password, phone } = req.body;

  const existingRes = await db.query("SELECT id FROM customers WHERE email = $1", [email]);
  if (existingRes.rows.length > 0) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const passwordHash = await hashPassword(password);
  const result = await db.query(
    "INSERT INTO customers (name, email, password_hash, phone) VALUES ($1, $2, $3, $4) RETURNING id",
    [name, email, passwordHash, phone || null]
  );
  const newId = result.rows[0].id;

  const token = signCustomerToken({ role: "customer", customerId: newId, email });
  res.cookie("customer_token", token, cookieOptions);
  await mergeGuestCart(req, res, newId);
  res.status(201).json({ id: newId, name, email });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const result = await db.query("SELECT * FROM customers WHERE email = $1", [email]);
  const customer = result.rows[0] as CustomerRow | undefined;

  if (!customer || !customer.password_hash) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const valid = await comparePassword(password, customer.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = signCustomerToken({ role: "customer", customerId: customer.id, email: customer.email });
  res.cookie("customer_token", token, cookieOptions);
  await mergeGuestCart(req, res, customer.id);
  res.json({ id: customer.id, name: customer.name, email: customer.email });
}

// POST /api/auth/google - sign in (or silently create an account) using a Google ID token
// issued by Google Identity Services on the frontend. Lets a customer use their Google
// account instead of registering a new email/password account.
export async function googleLogin(req: Request, res: Response): Promise<void> {
  if (!googleClient || !env.googleClientId) {
    res.status(503).json({ error: "Google sign-in is not configured on this server." });
    return;
  }

  const { credential } = req.body;

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch {
    res.status(401).json({ error: "Invalid Google credential." });
    return;
  }

  if (!payload || !payload.email) {
    res.status(401).json({ error: "Invalid Google credential." });
    return;
  }

  const googleId = payload.sub;
  const email = payload.email.toLowerCase();
  const name = payload.name || email.split("@")[0];

  const googleRes = await db.query("SELECT * FROM customers WHERE google_id = $1", [googleId]);
  let customer = googleRes.rows[0] as CustomerRow | undefined;

  if (!customer) {
    // No account linked to this Google ID yet — link by email if one already exists,
    // otherwise create a brand-new account automatically (no separate registration step).
    const emailRes = await db.query("SELECT * FROM customers WHERE email = $1", [email]);
    const byEmail = emailRes.rows[0] as CustomerRow | undefined;

    if (byEmail) {
      await db.query("UPDATE customers SET google_id = $1 WHERE id = $2", [googleId, byEmail.id]);
      customer = { ...byEmail, google_id: googleId };
    } else {
      const insertRes = await db.query(
        "INSERT INTO customers (name, email, password_hash, google_id, phone) VALUES ($1, $2, NULL, $3, NULL) RETURNING *",
        [name, email, googleId]
      );
      customer = insertRes.rows[0] as CustomerRow;
    }
  }

  const token = signCustomerToken({ role: "customer", customerId: customer.id, email: customer.email });
  res.cookie("customer_token", token, cookieOptions);
  await mergeGuestCart(req, res, customer.id);
  res.json({ id: customer.id, name: customer.name, email: customer.email });
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie("customer_token", { path: "/" });
  res.json({ message: "Logged out." });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.customer) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  const result = await db.query(
    "SELECT id, name, email, phone FROM customers WHERE id = $1",
    [req.customer.customerId]
  );
  const customer = result.rows[0];

  if (!customer) {
    res.status(401).json({ error: "Account no longer exists." });
    return;
  }

  res.json(customer);
}