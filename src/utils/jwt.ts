import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AdminTokenPayload, CustomerTokenPayload } from "../types";

const CUSTOMER_EXPIRES_IN = "7d";
const ADMIN_EXPIRES_IN = "12h";

export function signCustomerToken(payload: CustomerTokenPayload): string {
  return jwt.sign(payload, env.jwtCustomerSecret, { expiresIn: CUSTOMER_EXPIRES_IN });
}

export function verifyCustomerToken(token: string): CustomerTokenPayload {
  return jwt.verify(token, env.jwtCustomerSecret) as CustomerTokenPayload;
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, env.jwtAdminSecret, { expiresIn: ADMIN_EXPIRES_IN });
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  return jwt.verify(token, env.jwtAdminSecret) as AdminTokenPayload;
}
