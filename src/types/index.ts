export interface AdminTokenPayload {
  role: "admin";
  adminId: number;
  username: string;
}

export interface CustomerTokenPayload {
  role: "customer";
  customerId: number;
  email: string;
}

export interface ProductRow {
  id: number;
  name: string;
  description: string;
  price: number;
  discount_amount: number;
  stock: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ProductImageRow {
  id: number;
  product_id: number;
  filename: string;
  sort_order: number;
}

export interface CustomerRow {
  id: number;
  name: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  phone: string | null;
  created_at: string;
}

export interface AdminRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface CartItemRow {
  id: number;
  customer_id: number | null;
  guest_id: string | null;
  product_id: number;
  quantity: number;
}

export interface OrderRow {
  id: number;
  customer_id: number | null;
  guest_id: string | null;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_method: string;
  full_name: string;
  phone: string;
  country: string;
  city: string;
  area: string;
  street: string;
  building: string;
  floor: string | null;
  apartment: string | null;
  notes: string | null;
  created_at: string;
}

export interface ReviewRow {
  id: number;
  type: "customer" | "screenshot";
  customer_id: number | null;
  customer_name: string | null;
  rating: number | null;
  comment: string | null;
  image_filename: string | null;
  is_approved: number;
  created_at: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
      customer?: CustomerTokenPayload;
      guestId?: string;
    }
  }
}
