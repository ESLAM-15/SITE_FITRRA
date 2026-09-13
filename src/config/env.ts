import dotenv from "dotenv";
import path from "path";

// dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: (process.env.NODE_ENV || "development") === "production",
  databaseUrl: required("DATABASE_URL"),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  jwtCustomerSecret: required("JWT_CUSTOMER_SECRET"),
  jwtAdminSecret: required("JWT_ADMIN_SECRET"),
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "ChangeMe123!",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceKey: required("SUPABASE_SERVICE_ROLE_KEY"),
};