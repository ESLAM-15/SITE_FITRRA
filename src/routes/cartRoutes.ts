import { Router } from "express";
import { getCart, addToCart, updateCartItem, removeCartItem, clearCart } from "../controllers/cartController";
import { validate } from "../middleware/validate";
import { addToCartSchema, updateCartItemSchema, cartItemParamSchema } from "../validators/cartValidators";
import { identifyShopper } from "../middleware/auth";

const router = Router();
// Guests can shop without an account: identifyShopper attaches either the logged-in
// customer or an anonymous guest cookie identity, and never blocks the request.
router.use(identifyShopper);

router.get("/", getCart);
router.post("/items", validate(addToCartSchema), addToCart);
router.put("/items/:productId", validate(cartItemParamSchema, "params"), validate(updateCartItemSchema), updateCartItem);
router.delete("/items/:productId", validate(cartItemParamSchema, "params"), removeCartItem);
router.delete("/", clearCart);

export default router;
