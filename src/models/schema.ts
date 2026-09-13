import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { env } from "../config/env";

export async function initSchema(db: Pool): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      google_id TEXT UNIQUE,
      phone TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
      discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS product_images (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      guest_id TEXT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CHECK ((customer_id IS NOT NULL) OR (guest_id IS NOT NULL))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      guest_id TEXT,
      total_amount NUMERIC(10, 2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      payment_method TEXT NOT NULL DEFAULT 'online_card',
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      area TEXT NOT NULL,
      street TEXT NOT NULL,
      building TEXT NOT NULL,
      floor TEXT,
      apartment TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      unit_price NUMERIC(10, 2) NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal NUMERIC(10, 2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'customer' CHECK (type IN ('customer', 'screenshot')),
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      customer_name TEXT,
      rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
      comment TEXT,
      image_filename TEXT,
      is_approved INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_per_customer
      ON reviews(customer_id) WHERE customer_id IS NOT NULL AND type = 'customer';

    CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_customer_product
      ON cart_items(customer_id, product_id) WHERE customer_id IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_guest_product
      ON cart_items(guest_id, product_id) WHERE guest_id IS NOT NULL;
  `);

  // Migration: convert the old percentage-based discount column to a fixed amount.
  // Safe to run on every startup — each step only acts if the old shape still exists.
  await db.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'discount_percent'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'discount_amount'
      ) THEN
        ALTER TABLE products RENAME COLUMN discount_percent TO discount_amount;
      END IF;
    END $$;

    DO $$
    DECLARE
      cname text;
    BEGIN
      FOR cname IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'products'
          AND con.contype = 'c'
          AND att.attname = 'discount_amount'
      LOOP
        EXECUTE format('ALTER TABLE products DROP CONSTRAINT %I', cname);
      END LOOP;
    END $$;

    ALTER TABLE products ALTER COLUMN discount_amount TYPE NUMERIC(10, 2);
    ALTER TABLE products ALTER COLUMN discount_amount SET DEFAULT 0;
    ALTER TABLE products ADD CONSTRAINT products_discount_amount_check CHECK (discount_amount >= 0);
  `);

  // Create initial Admin user if not exists
  const adminRes = await db.query("SELECT COUNT(*) as c FROM admins");
  const adminCount = parseInt(adminRes.rows[0].c, 10);

  if (adminCount === 0) {
    const hash = bcrypt.hashSync(env.adminPassword, 12);
    await db.query(
      "INSERT INTO admins (username, password_hash) VALUES ($1, $2)",
      [env.adminUsername, hash]
    );
    // eslint-disable-next-line no-console
    console.log(`Seeded initial admin account: username="${env.adminUsername}". Change the password after first login.`);
  }
}