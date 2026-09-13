import { Router } from "express";
import {
  listReviews,
  myReviewStatus,
  createReview,
  adminListReviews,
  adminCreateScreenshotReview,
  deleteReview,
} from "../controllers/reviewController";
import { validate } from "../middleware/validate";
import { reviewCreateSchema, reviewScreenshotSchema } from "../validators/reviewValidators";
import { idParamSchema } from "../validators/productValidators";
import { requireAdmin, requireCustomer } from "../middleware/auth";
import { uploadReviewScreenshot } from "../middleware/upload";
import { sensitiveActionLimiter } from "../middleware/rateLimiter";

// Public + customer routes, mounted at /api/reviews
export const publicReviewRouter = Router();
publicReviewRouter.get("/", listReviews);
publicReviewRouter.get("/me", requireCustomer, myReviewStatus);
publicReviewRouter.post("/", requireCustomer, sensitiveActionLimiter, validate(reviewCreateSchema), createReview);

// Admin routes, mounted at /api/admin/reviews
export const adminReviewRouter = Router();
adminReviewRouter.use(requireAdmin);
adminReviewRouter.get("/", adminListReviews);
adminReviewRouter.post("/", uploadReviewScreenshot, validate(reviewScreenshotSchema), adminCreateScreenshotReview);
adminReviewRouter.delete("/:id", validate(idParamSchema, "params"), deleteReview);
