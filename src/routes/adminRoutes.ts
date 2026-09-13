import { Router } from "express";
import { adminLogin, adminLogout, adminMe } from "../controllers/adminAuthController";
import { validate } from "../middleware/validate";
import { adminLoginSchema } from "../validators/authValidators";
import { requireAdmin } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/login", authLimiter, validate(adminLoginSchema), adminLogin);
router.post("/logout", adminLogout);
router.get("/me", requireAdmin, adminMe);

export default router;
