import { Router } from "express";
import { register, login, logout, me, googleLogin } from "../controllers/authController";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema, googleAuthSchema } from "../validators/authValidators";
import { requireCustomer } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/google", authLimiter, validate(googleAuthSchema), googleLogin);
router.post("/logout", logout);
router.get("/me", requireCustomer, me);

export default router;
