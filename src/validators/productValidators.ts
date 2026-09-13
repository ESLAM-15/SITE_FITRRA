import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Multipart form fields arrive as strings, so we coerce numeric fields.
export const productCreateSchema = z.object({
  name: z.string().trim().min(2, "Product name is required.").max(150),
  description: z.string().trim().min(1, "Description is required.").max(3000),
  price: z.coerce.number().min(0, "Price cannot be negative.").max(1000000),
  discountAmount: z.coerce.number().min(0, "Discount cannot be negative.").max(1000000).optional().default(0),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative.").max(1000000),
});

// Multipart form fields send booleans as the strings "true"/"false", and
// z.coerce.boolean() would turn *both* into `true` (JS treats any non-empty
// string as truthy), which meant unchecking "isActive" in the admin panel
// could never actually hide a product. Parse the string explicitly instead.
const isActiveField = z.preprocess((val) => {
  if (typeof val === "string") return val === "true" || val === "1";
  return val;
}, z.boolean());

export const productUpdateSchema = productCreateSchema.partial().extend({
  isActive: isActiveField.optional(),
  // comma separated list of product_images.id to remove
  removeImageIds: z.string().optional(),
});

export const productListQuerySchema = z.object({
  search: z.string().trim().max(150).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});
