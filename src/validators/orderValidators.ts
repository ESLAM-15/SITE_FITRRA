import { z } from "zod";

export const cashOnDeliveryPaymentSchema = z.object({
  method: z.literal("cash_on_delivery"),
});

export const onlineCardPaymentSchema = z.object({
  method: z.literal("online_card"),
  cardholderName: z.string().trim().min(2).max(150),
  cardNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{13,19}$/, "Card number must be 13-19 digits."),
  expiry: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\/[0-9]{2}$/, "Expiry must be in MM/YY format."),
  cvv: z.string().trim().regex(/^[0-9]{3,4}$/, "CVV must be 3-4 digits."),
});

const paymentSchema = z.discriminatedUnion("method", [cashOnDeliveryPaymentSchema, onlineCardPaymentSchema]);

export const createOrderSchema = z.object({
  address: z.object({
    fullName: z.string().trim().min(2, "Full name is required.").max(150),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s]{7,20}$/, "Invalid phone number."),
    country: z.string().trim().min(2, "Country is required.").max(100),
    city: z.string().trim().min(2, "City is required.").max(100),
    area: z.string().trim().min(2, "Area / district is required.").max(150),
    street: z.string().trim().min(2, "Street is required.").max(200),
    building: z.string().trim().min(1, "Building number is required.").max(50),
    floor: z.string().trim().max(50).optional().or(z.literal("")),
    apartment: z.string().trim().max(50).optional().or(z.literal("")),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  }),
  payment: paymentSchema,
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
});

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
