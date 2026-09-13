import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/db";
import { supabase, PRODUCT_IMAGES_BUCKET } from "../config/supabase";
import { ReviewRow } from "../types";

// نستخدم نفس الـ bucket بتاع صور المنتجات، لكن جوه مجلد فرعي "reviews/" حتى لا نحتاج
// إنشاء bucket إضافي في Supabase Storage.
async function uploadReviewImage(file: Express.Multer.File): Promise<string> {
  const ext = file.originalname.split(".").pop() || "jpg";
  const objectPath = `reviews/${uuidv4()}.${ext}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload screenshot: ${error.message}`);
  }

  return objectPath;
}

async function deleteReviewImage(objectPath: string): Promise<void> {
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([objectPath]);
  if (error) {
    console.error("Failed to delete review screenshot from storage:", error.message);
  }
}

function getReviewImageUrl(objectPath: string): string {
  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

function serializeReview(r: ReviewRow) {
  return {
    id: r.id,
    type: r.type,
    customerName: r.customer_name,
    rating: r.rating ? Number(r.rating) : null,
    comment: r.comment,
    image: r.image_filename ? getReviewImageUrl(r.image_filename) : null,
    createdAt: r.created_at,
  };
}

// GET /api/reviews - public. Storefront-wide (not tied to a single product), newest first.
export async function listReviews(_req: Request, res: Response): Promise<void> {
  const result = await db.query("SELECT * FROM reviews WHERE is_approved = 1 ORDER BY created_at DESC");
  const rows = result.rows as ReviewRow[];
  res.json({ reviews: rows.map(serializeReview) });
}

// GET /api/reviews/me - customer only. Lets the frontend know whether to show the
// "add a review" form or a thank-you note (one review per customer).
export async function myReviewStatus(req: Request, res: Response): Promise<void> {
  const result = await db.query(
    "SELECT * FROM reviews WHERE customer_id = $1 AND type = 'customer'",
    [req.customer!.customerId]
  );
  const existing = result.rows[0] as ReviewRow | undefined;
  res.json({ hasReviewed: !!existing, review: existing ? serializeReview(existing) : null });
}

// POST /api/reviews - customer only. Enforced one review per customer (DB unique index too).
export async function createReview(req: Request, res: Response): Promise<void> {
  const customerId = req.customer!.customerId;

  const existingRes = await db.query(
    "SELECT id FROM reviews WHERE customer_id = $1 AND type = 'customer'",
    [customerId]
  );
  if (existingRes.rows.length > 0) {
    res.status(409).json({ error: "لقد قمتِ بإضافة تقييم من قبل. شكراً لكِ!" });
    return;
  }

  const customerRes = await db.query("SELECT name FROM customers WHERE id = $1", [customerId]);
  const customer = customerRes.rows[0] as { name: string } | undefined;

  const { rating, comment } = req.body;

  try {
    const result = await db.query(
      "INSERT INTO reviews (type, customer_id, customer_name, rating, comment) VALUES ('customer', $1, $2, $3, $4) RETURNING *",
      [customerId, customer?.name || "عميلة فِطْره", rating, comment]
    );
    const row = result.rows[0] as ReviewRow;
    res.status(201).json(serializeReview(row));
  } catch {
    // Race condition safety net: the unique index also blocks a second insert.
    res.status(409).json({ error: "لقد قمتِ بإضافة تقييم من قبل. شكراً لكِ!" });
  }
}

// GET /api/admin/reviews - admin, everything including hidden entries.
export async function adminListReviews(_req: Request, res: Response): Promise<void> {
  const result = await db.query("SELECT * FROM reviews ORDER BY created_at DESC");
  const rows = result.rows as ReviewRow[];
  res.json({ reviews: rows.map(serializeReview) });
}

// POST /api/admin/reviews - admin uploads a screenshot review (e.g. from Instagram/WhatsApp).
export async function adminCreateScreenshotReview(req: Request, res: Response): Promise<void> {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    res.status(400).json({ error: "من فضلك ارفعي صورة السكرين شوت." });
    return;
  }

  let objectPath: string;
  try {
    objectPath = await uploadReviewImage(file);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to upload screenshot." });
    return;
  }

  const { caption } = req.body;

  try {
    const result = await db.query(
      "INSERT INTO reviews (type, customer_name, comment, image_filename) VALUES ('screenshot', NULL, $1, $2) RETURNING *",
      [caption || null, objectPath]
    );
    const row = result.rows[0] as ReviewRow;
    res.status(201).json(serializeReview(row));
  } catch (err: any) {
    await deleteReviewImage(objectPath);
    res.status(500).json({ error: err.message || "Failed to save screenshot review." });
  }
}

// DELETE /api/admin/reviews/:id - admin, removes any review (customer text or screenshot).
export async function deleteReview(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as { id: number };

  const result = await db.query("SELECT * FROM reviews WHERE id = $1", [id]);
  const row = result.rows[0] as ReviewRow | undefined;

  if (!row) {
    res.status(404).json({ error: "التقييم غير موجود." });
    return;
  }

  await db.query("DELETE FROM reviews WHERE id = $1", [id]);

  if (row.image_filename) {
    await deleteReviewImage(row.image_filename);
  }

  res.json({ message: "تم حذف التقييم." });
}
