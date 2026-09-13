import { Router } from "express";
import {
  listProducts,
  getProduct,
  adminListProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController";
import { validate } from "../middleware/validate";
import { idParamSchema, productCreateSchema, productUpdateSchema, productListQuerySchema } from "../validators/productValidators";
import { requireAdmin } from "../middleware/auth";
import { uploadProductImages } from "../middleware/upload";

// Public routes: GET /api/products, GET /api/products/:id
export const publicProductRouter = Router();
publicProductRouter.get("/", validate(productListQuerySchema, "query"), listProducts);
publicProductRouter.get("/:id", validate(idParamSchema, "params"), getProduct);

// Admin routes: mounted at /api/admin/products, protected + image upload aware
export const adminProductRouter = Router();
adminProductRouter.use(requireAdmin);
adminProductRouter.get("/", validate(productListQuerySchema, "query"), adminListProducts);
adminProductRouter.post(
  "/",
  uploadProductImages,
  validate(productCreateSchema),
  createProduct
);
adminProductRouter.put(
  "/:id",
  validate(idParamSchema, "params"),
  uploadProductImages,
  validate(productUpdateSchema),
  updateProduct
);
adminProductRouter.delete("/:id", validate(idParamSchema, "params"), deleteProduct);
