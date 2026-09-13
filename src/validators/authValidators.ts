import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address.").max(150),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(200)
    .regex(/[a-z]/, "Password must contain a lowercase letter.")
    .regex(/[A-Z]/, "Password must contain an uppercase letter.")
    .regex(/[0-9]/, "Password must contain a number."),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,20}$/, "Invalid phone number.")
    .optional()
    .or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address."),
  password: z.string().min(1, "Password is required.").max(200),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(10, "Missing Google credential."),
});

export const adminLoginSchema = z.object({
  username: z.string().trim().min(3).max(100),
  password: z.string().min(1).max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
