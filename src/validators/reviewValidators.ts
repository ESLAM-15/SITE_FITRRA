import { z } from "zod";

export const reviewCreateSchema = z.object({
  rating: z.coerce.number().int().min(1, "من فضلك اختاري تقييمًا.").max(5),
  comment: z.string().trim().min(2, "من فضلك اكتبي رأيك.").max(1000),
});

// Multipart form field arriving alongside the uploaded screenshot file.
export const reviewScreenshotSchema = z.object({
  caption: z.string().trim().max(200).optional(),
});
