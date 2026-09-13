import { Request, Response } from "express";
import { db } from "../config/db";
import { ProductRow, OrderRow } from "../types";

type Shopper = { column: "customer_id" | "guest_id"; value: number | string };

function getShopper(req: Request): Shopper {
  if (req.customer) return { column: "customer_id", value: req.customer.customerId };
  return { column: "guest_id", value: req.guestId! };
}

// دالة تحويل الطلب
function formatOrderResponse(order: OrderRow, items: any[]) {
  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    total: Number(order.total_amount),
    address: {
      fullName: order.full_name,
      phone: order.phone,
      country: order.country,
      city: order.city,
      area: order.area,
      street: order.street,
      building: order.building,
      floor: order.floor,
      apartment: order.apartment,
      notes: order.notes,
    },
    items: items.map((item) => ({
      ...item,
      unit_price: Number(item.unit_price),
      subtotal: Number(item.subtotal),
    })),
    createdAt: order.created_at,
  };
}

// POST /api/orders - customer checkout
export async function createOrder(req: Request, res: Response): Promise<void> {
  const shopper = getShopper(req);
  const { address, payment } = req.body;
  const isOnlinePayment = payment?.method === "online_card";

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const cartRowsRes = await client.query(
      `SELECT ci.quantity, p.* FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.${shopper.column} = $1`,
      [shopper.value]
    );
    const cartRows = cartRowsRes.rows as (ProductRow & { quantity: number })[];

    if (cartRows.length === 0) {
      throw Object.assign(new Error("Your cart is empty."), { status: 400 });
    }

    for (const row of cartRows) {
      if (!row.is_active) {
        throw Object.assign(new Error(`"${row.name}" is no longer available.`), { status: 400 });
      }
      if (row.quantity > row.stock) {
        throw Object.assign(
          new Error(`الكمية المطلوبة من "${row.name}" غير متوفرة في المخزون.`),
          { status: 400 }
        );
      }
    }

    const total = +cartRows
      .reduce((sum, r) => sum + Math.max(0, Number(r.price) - Number(r.discount_amount)) * r.quantity, 0)
      .toFixed(2);

    const paymentStatus = isOnlinePayment ? "paid" : "unpaid";
    const paymentMethod = isOnlinePayment ? "online_card" : "cash_on_delivery";

    const orderResult = await client.query(
      `INSERT INTO orders
        (${shopper.column}, total_amount, status, payment_status, payment_method,
         full_name, phone, country, city, area, street, building, floor, apartment, notes)
       VALUES ($1, $2, 'processing', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        shopper.value,
        total,
        paymentStatus,
        paymentMethod,
        address.fullName,
        address.phone,
        address.country,
        address.city,
        address.area,
        address.street,
        address.building,
        address.floor || null,
        address.apartment || null,
        address.notes || null,
      ]
    );

    const orderId = orderResult.rows[0].id;

    for (const row of cartRows) {
      const price = Number(row.price);
      const discountAmount = Number(row.discount_amount);
      const finalPrice = Math.max(0, +(price - discountAmount).toFixed(2));

      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, row.id, row.name, finalPrice, row.quantity, +(finalPrice * row.quantity).toFixed(2)]
      );

      await client.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [row.quantity, row.id]);
    }

    await client.query(`DELETE FROM cart_items WHERE ${shopper.column} = $1`, [shopper.value]);

    const createdOrderRes = await client.query("SELECT * FROM orders WHERE id = $1", [orderId]);
    const order = createdOrderRes.rows[0] as OrderRow;

    const itemsRes = await client.query(
      "SELECT product_id, product_name, unit_price, quantity, subtotal FROM order_items WHERE order_id = $1",
      [orderId]
    );

    await client.query("COMMIT");

    res.status(201).json(formatOrderResponse(order, itemsRes.rows));
  } catch (err: any) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    res.status(err.status || 500).json({ error: err.message || "Failed to create order." });
  } finally {
    client.release();
  }
}

// GET /api/orders - customer's own orders
export async function listMyOrders(req: Request, res: Response): Promise<void> {
  const customerId = req.customer!.customerId;
  const ordersRes = await db.query(
    "SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC",
    [customerId]
  );
  const orders = ordersRes.rows as OrderRow[];

  if (orders.length === 0) {
    res.json([]);
    return;
  }

  const orderIds = orders.map((o) => o.id);
  const itemsRes = await db.query(
    "SELECT order_id, product_id, product_name, unit_price, quantity, subtotal FROM order_items WHERE order_id = ANY($1)",
    [orderIds]
  );

  const formatted = orders.map((order) => {
    const items = itemsRes.rows.filter((item) => item.order_id === order.id);
    return formatOrderResponse(order, items);
  });

  res.json(formatted);
}

// GET /api/orders/:id - customer's own single order
export async function getMyOrder(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as { id: number };
  const result = await db.query(
    "SELECT * FROM orders WHERE id = $1 AND customer_id = $2",
    [id, req.customer!.customerId]
  );
  const order = result.rows[0] as OrderRow | undefined;

  if (!order) {
    res.status(404).json({ error: "Order not found." });
    return;
  }

  const itemsRes = await db.query(
    "SELECT product_id, product_name, unit_price, quantity, subtotal FROM order_items WHERE order_id = $1",
    [order.id]
  );

  res.json(formatOrderResponse(order, itemsRes.rows));
}

// GET /api/admin/orders - admin, all orders
export async function adminListOrders(_req: Request, res: Response): Promise<void> {
  const ordersRes = await db.query("SELECT * FROM orders ORDER BY created_at DESC");
  const orders = ordersRes.rows as OrderRow[];

  if (orders.length === 0) {
    res.json([]);
    return;
  }

  const orderIds = orders.map((o) => o.id);
  const itemsRes = await db.query(
    "SELECT order_id, product_id, product_name, unit_price, quantity, subtotal FROM order_items WHERE order_id = ANY($1)",
    [orderIds]
  );

  const formatted = orders.map((order) => {
    const items = itemsRes.rows.filter((item) => item.order_id === order.id);
    return formatOrderResponse(order, items);
  });

  res.json(formatted);
}

// PATCH /api/admin/orders/:id/status - admin
export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params as unknown as { id: number };
  const { status } = req.body;

  const result = await db.query("UPDATE orders SET status = $1 WHERE id = $2", [status, id]);
  if (result.rowCount === 0) {
    res.status(404).json({ error: "Order not found." });
    return;
  }

  const orderRes = await db.query("SELECT * FROM orders WHERE id = $1", [id]);
  const order = orderRes.rows[0] as OrderRow;

  const itemsRes = await db.query(
    "SELECT product_id, product_name, unit_price, quantity, subtotal FROM order_items WHERE order_id = $1",
    [order.id]
  );

  res.json(formatOrderResponse(order, itemsRes.rows));
}