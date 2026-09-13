import { Request, Response } from "express";
import { db } from "../config/db";
import { supabase, PRODUCT_IMAGES_BUCKET } from "../config/supabase";
import { ProductRow } from "../types";

function getProductImageUrl(objectPath: string): string {
  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

// A cart row belongs either to a logged-in customer or to an anonymous guest cookie
// identity — never both. This resolves which one the current request is shopping as.
type Shopper = { column: "customer_id" | "guest_id"; value: number | string };

function getShopper(req: Request): Shopper {
  if (req.customer) return { column: "customer_id", value: req.customer.customerId };
  return { column: "guest_id", value: req.guestId! };
}

async function serializeCart(shopper: Shopper) {
  const rowsRes = await db.query(
    `SELECT ci.id as cart_item_id, ci.quantity, p.*
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.${shopper.column} = $1
     ORDER BY ci.id ASC`,
    [shopper.value]
  );

  const rows = rowsRes.rows as (ProductRow & { cart_item_id: number; quantity: number })[];

  const items = await Promise.all(
    rows.map(async (r) => {
      const price = Number(r.price);
      const discountAmount = Number(r.discount_amount);
      const finalPrice = Math.max(0, +(price - discountAmount).toFixed(2));

      const imageRes = await db.query(
        "SELECT filename FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC LIMIT 1",
        [r.id]
      );
      const image = imageRes.rows[0] as { filename: string } | undefined;

      return {
        cartItemId: r.cart_item_id,
        productId: r.id,
        name: r.name,
        price,
        discountAmount,
        finalPrice,
        quantity: r.quantity,
        stock: r.stock,
        lineTotal: +(finalPrice * r.quantity).toFixed(2),
        image: image ? getProductImageUrl(image.filename) : null,
        isActive: !!r.is_active,
      };
    })
  );

  const total = +items.reduce((sum, it) => sum + it.lineTotal, 0).toFixed(2);
  return { items, total, itemCount: items.reduce((s, it) => s + it.quantity, 0) };
}

export async function getCart(req: Request, res: Response): Promise<void> {
  const cart = await serializeCart(getShopper(req));
  res.json(cart);
}

export async function addToCart(req: Request, res: Response): Promise<void> {
  const { productId, quantity } = req.body;
  const shopper = getShopper(req);

  const productRes = await db.query("SELECT * FROM products WHERE id = $1 AND is_active = 1", [productId]);
  const product = productRes.rows[0] as ProductRow | undefined;

  if (!product) {
    res.status(404).json({ error: "Product not found." });
    return;
  }

  const existingRes = await db.query(
    `SELECT * FROM cart_items WHERE ${shopper.column} = $1 AND product_id = $2`,
    [shopper.value, productId]
  );
  const existing = existingRes.rows[0] as { id: number; quantity: number } | undefined;

  const desiredQty = (existing?.quantity || 0) + quantity;
  if (desiredQty > product.stock) {
    res.status(400).json({ error: "الكمية المطلوبة غير متوفرة في المخزون." });
    return;
  }

  if (existing) {
    await db.query("UPDATE cart_items SET quantity = $1 WHERE id = $2", [desiredQty, existing.id]);
  } else {
    await db.query(
      `INSERT INTO cart_items (${shopper.column}, product_id, quantity) VALUES ($1, $2, $3)`,
      [shopper.value, productId, quantity]
    );
  }

  const cart = await serializeCart(shopper);
  res.status(201).json(cart);
}

export async function updateCartItem(req: Request, res: Response): Promise<void> {
  const shopper = getShopper(req);
  const { productId } = req.params as unknown as { productId: number };
  const { quantity } = req.body;

  const productRes = await db.query("SELECT * FROM products WHERE id = $1", [productId]);
  const product = productRes.rows[0] as ProductRow | undefined;

  if (!product) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  if (quantity > product.stock) {
    res.status(400).json({ error: "الكمية المطلوبة غير متوفرة في المخزون." });
    return;
  }

  const result = await db.query(
    `UPDATE cart_items SET quantity = $1 WHERE ${shopper.column} = $2 AND product_id = $3`,
    [quantity, shopper.value, productId]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ error: "Item not found in cart." });
    return;
  }

  const cart = await serializeCart(shopper);
  res.json(cart);
}

export async function removeCartItem(req: Request, res: Response): Promise<void> {
  const shopper = getShopper(req);
  const { productId } = req.params as unknown as { productId: number };

  await db.query(
    `DELETE FROM cart_items WHERE ${shopper.column} = $1 AND product_id = $2`,
    [shopper.value, productId]
  );

  const cart = await serializeCart(shopper);
  res.json(cart);
}

export async function clearCart(req: Request, res: Response): Promise<void> {
  const shopper = getShopper(req);

  await db.query(`DELETE FROM cart_items WHERE ${shopper.column} = $1`, [shopper.value]);

  const cart = await serializeCart(shopper);
  res.json(cart);
}