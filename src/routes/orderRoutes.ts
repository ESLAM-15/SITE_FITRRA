import { Router } from "express";
import { createOrder, listMyOrders, getMyOrder, adminListOrders, updateOrderStatus } from "../controllers/orderController";
import { validate } from "../middleware/validate";
import { createOrderSchema, orderStatusUpdateSchema, orderIdParamSchema } from "../validators/orderValidators";
import { requireAdmin, requireCustomer, identifyShopper } from "../middleware/auth";
import { sensitiveActionLimiter } from "../middleware/rateLimiter";

// Customer-facing routes, mounted at /api/orders
export const customerOrderRouter = Router();
// Placing an order works for guests too (identifyShopper never blocks the request).
customerOrderRouter.post("/", identifyShopper, sensitiveActionLimiter, validate(createOrderSchema), createOrder);
// Order history is tied to an account, so these two still require a real login.
customerOrderRouter.get("/", requireCustomer, listMyOrders);
customerOrderRouter.get("/:id", requireCustomer, validate(orderIdParamSchema, "params"), getMyOrder);

// Admin routes, mounted at /api/admin/orders
export const adminOrderRouter = Router();
adminOrderRouter.use(requireAdmin);
adminOrderRouter.get("/", adminListOrders);
adminOrderRouter.patch(
  "/:id/status",
  validate(orderIdParamSchema, "params"),
  validate(orderStatusUpdateSchema),
  updateOrderStatus
);
