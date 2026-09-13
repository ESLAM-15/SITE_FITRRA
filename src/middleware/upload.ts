import multer from "multer";
import path from "path";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
    cb(new Error("Only JPG, PNG or WEBP image files are allowed."));
    return;
  }
  cb(null, true);
}

// استخدام الذاكرة المؤقتة (Memory Storage) لكلا الخيارين لمنع الاعتماد على الملفات المحلية في Vercel
const memoryStorage = multer.memoryStorage();

// Middleware الخاص برفع صور المنتجات (حتى 6 صور)
export const uploadProductImages = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6,
  },
}).array("images", 6);

// Middleware الخاص برفع صور المراجعات (صورة واحدة فقط)
export const uploadReviewScreenshot = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
}).single("screenshot");