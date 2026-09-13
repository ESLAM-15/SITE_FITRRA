import { z } from "zod";

export const addToCartSchema = z.object({
  productId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").max(999),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").max(999),
});

export const cartItemParamSchema = z.object({
  productId: z.coerce.number().int().positive(),
});
