import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/db";
import { supabase, PRODUCT_IMAGES_BUCKET } from "../config/supabase";
import { ProductRow, ProductImageRow } from "../types";

async function uploadProductImage(file: Express.Multer.File): Promise<string> {
  const ext = file.originalname.split(".").pop() || "jpg";
  const objectPath = `${uuidv4()}.${ext}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  return objectPath;
}

async function deleteProductImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
  if (error) {
    console.error("Failed to delete images from storage:", error.message);
  }
}

function getProductImageUrl(objectPath: string): string {
  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

function serializeProduct(product: ProductRow, images: ProductImageRow[]) {
  const price = Number(product.price);
  const discountAmount = Number(product.discount_amount);
  const discounted = Math.max(0, +(price - discountAmount).toFixed(2));

  const formattedImages = images.map((img) => ({
    id: img.id,
    url: getProductImageUrl(img.filename),
    sortOrder: img.sort_order,
  }));

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price,
    discountAmount,
    finalPrice: discounted,
    stock: product.stock,
    inStock: product.stock > 0,
    isActive: !!product.is_active,
    images: formattedImages.map((img) => img.url),
    imageDetails: formattedImages,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

async function getImages(productId: number): Promise<ProductImageRow[]> {
  const result = await db.query(
    "SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC, id ASC",
    [productId]
  );
  return result.rows as ProductImageRow[];
}

// GET /api/products - public, only active products
export async function listProducts(req: Request, res: Response): Promise<void> {
  const { search, page = 1, limit = 10 } = req.query as unknown as { search?: string; page: number; limit: number };
  const offset = (page - 1) * limit;

  let where = "WHERE is_active = 1";
  const params: any[] = [];

  if (search) {
    params.push(`%${search}%`);
    where += ` AND name ILIKE $${params.length}`;
  }

  const countRes = await db.query(`SELECT COUNT(*) as c FROM products ${where}`, params);
  const total = parseInt(countRes.rows[0].c, 10);

  const limitParamIndex = params.length + 1;
  const offsetParamIndex = params.length + 2;

  const rowsRes = await db.query(
    `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
    [...params, limit, offset]
  );
  const rows = rowsRes.rows as ProductRow[];

  if (rows.length === 0) {
    res.json({ products: [], total: 0, page: Number(page), limit: Number(limit), totalPages: 1 });
    return;
  }

  const productIds = rows.map((p) => p.id);
  const imagesRes = await db.query(
    "SELECT * FROM product_images WHERE product_id = ANY($1) ORDER BY sort_order ASC, id ASC",
    [productIds]
  );
  const allImages = imagesRes.rows as ProductImageRow[];

  const products = rows.map((p) => {
    const productImages = allImages.filter((img) => img.product_id === p.id);
    return serializeProduct(p, productImages);
  });

  res.json({ products, total, page: Number(page), limit: Number(limit), totalPages: Math.max(1, Math.ceil(total / limit)) });
}

// GET /api/products/:id - public
export async function getProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as { id: number };
  const result = await db.query("SELECT * FROM products WHERE id = $1 AND is_active = 1", [id]);
  const product = result.rows[0] as ProductRow | undefined;

  if (!product) {
    res.status(404).json({ error: "Product not found." });
    return;
  }

  const images = await getImages(product.id);
  res.json(serializeProduct(product, images));
}

// GET /api/admin/products - admin, optimized batch fetch
export async function adminListProducts(req: Request, res: Response): Promise<void> {
  const { search, page = 1, limit = 10 } = req.query as unknown as { search?: string; page: number; limit: number };
  const offset = (page - 1) * limit;

  let where = "WHERE 1=1";
  const params: any[] = [];

  if (search) {
    params.push(`%${search}%`);
    where += ` AND name ILIKE $${params.length}`;
  }

  const countRes = await db.query(`SELECT COUNT(*) as c FROM products ${where}`, params);
  const total = parseInt(countRes.rows[0].c, 10);

  const limitParamIndex = params.length + 1;
  const offsetParamIndex = params.length + 2;

  const rowsRes = await db.query(
    `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
    [...params, limit, offset]
  );
  const rows = rowsRes.rows as ProductRow[];

  if (rows.length === 0) {
    res.json({ products: [], total: 0, page: Number(page), limit: Number(limit), totalPages: 1 });
    return;
  }

  const productIds = rows.map((p) => p.id);
  const imagesRes = await db.query(
    "SELECT * FROM product_images WHERE product_id = ANY($1) ORDER BY sort_order ASC, id ASC",
    [productIds]
  );
  const allImages = imagesRes.rows as ProductImageRow[];

  const products = rows.map((p) => {
    const productImages = allImages.filter((img) => img.product_id === p.id);
    return serializeProduct(p, productImages);
  });

  res.json({ products, total, page: Number(page), limit: Number(limit), totalPages: Math.max(1, Math.ceil(total / limit)) });
}

// POST /api/admin/products - admin, multipart with up to 6 images
export async function createProduct(req: Request, res: Response): Promise<void> {
  const { name, description, price, discountAmount, stock } = req.body;
  const files = (req.files as Express.Multer.File[]) || [];

  let uploadedPaths: string[];
  try {
    uploadedPaths = await Promise.all(files.map((file) => uploadProductImage(file)));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to upload images." });
    return;
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const productRes = await client.query(
      "INSERT INTO products (name, description, price, discount_amount, stock) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [name, description, price, discountAmount ?? 0, stock]
    );
    const productId = productRes.rows[0].id;

    for (let idx = 0; idx < uploadedPaths.length; idx++) {
      await client.query(
        "INSERT INTO product_images (product_id, filename, sort_order) VALUES ($1, $2, $3)",
        [productId, uploadedPaths[idx], idx]
      );
    }

    await client.query("COMMIT");

    const newProductRes = await db.query("SELECT * FROM products WHERE id = $1", [productId]);
    const product = newProductRes.rows[0] as ProductRow;
    const images = await getImages(productId);

    res.status(201).json(serializeProduct(product, images));
  } catch (err: any) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    await deleteProductImages(uploadedPaths);
    res.status(500).json({ error: err.message || "Failed to create product." });
  } finally {
    client.release();
  }
}

// PUT /api/admin/products/:id - admin, multipart, can add new images + remove old ones
export async function updateProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as { id: number };

  const existingRes = await db.query("SELECT * FROM products WHERE id = $1", [id]);
  const existing = existingRes.rows[0] as ProductRow | undefined;

  if (!existing) {
    res.status(404).json({ error: "Product not found." });
    return;
  }

  const { name, description, price, discountAmount, stock, isActive, removeImageIds } = req.body;
  const files = (req.files as Express.Multer.File[]) || [];

  let uploadedPaths: string[];
  try {
    uploadedPaths = await Promise.all(files.map((file) => uploadProductImage(file)));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to upload images." });
    return;
  }

  const client = await db.connect();
  const pathsToDeleteFromStorage: string[] = [];

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        discount_amount = COALESCE($4, discount_amount),
        stock = COALESCE($5, stock),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
      WHERE id = $7`,
      [
        name ?? null,
        description ?? null,
        price ?? null,
        discountAmount ?? null,
        stock ?? null,
        isActive === undefined ? null : isActive ? 1 : 0,
        id,
      ]
    );

    if (removeImageIds) {
      const ids = String(removeImageIds)
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n));

      if (ids.length > 0) {
        const placeholders = ids.map((_, i) => `$${i + 2}`).join(",");
        const toDeleteRes = await client.query(
          `SELECT * FROM product_images WHERE product_id = $1 AND id IN (${placeholders})`,
          [id, ...ids]
        );
        const toDelete = toDeleteRes.rows as ProductImageRow[];

        for (const img of toDelete) {
          await client.query("DELETE FROM product_images WHERE id = $1", [img.id]);
          pathsToDeleteFromStorage.push(img.filename);
        }
      }
    }

    if (uploadedPaths.length > 0) {
      const maxRes = await client.query(
        "SELECT COALESCE(MAX(sort_order), -1) as m FROM product_images WHERE product_id = $1",
        [id]
      );
      const currentMax = Number(maxRes.rows[0].m);

      for (let idx = 0; idx < uploadedPaths.length; idx++) {
        await client.query(
          "INSERT INTO product_images (product_id, filename, sort_order) VALUES ($1, $2, $3)",
          [id, uploadedPaths[idx], currentMax + 1 + idx]
        );
      }
    }

    await client.query("COMMIT");

    await deleteProductImages(pathsToDeleteFromStorage);

    const updatedRes = await db.query("SELECT * FROM products WHERE id = $1", [id]);
    const product = updatedRes.rows[0] as ProductRow;
    const images = await getImages(id);

    res.json(serializeProduct(product, images));
  } catch (err: any) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    await deleteProductImages(uploadedPaths);
    res.status(500).json({ error: err.message || "Failed to update product." });
  } finally {
    client.release();
  }
}

// DELETE /api/admin/products/:id - admin
export async function deleteProduct(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as { id: number };
  const images = await getImages(id);

  const result = await db.query("DELETE FROM products WHERE id = $1", [id]);

  if (result.rowCount === 0) {
    res.status(404).json({ error: "Product not found." });
    return;
  }

  await deleteProductImages(images.map((img) => img.filename));

  res.json({ message: "Product deleted." });
}