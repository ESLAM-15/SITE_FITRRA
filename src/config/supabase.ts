import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// عميل Supabase واحد بيتعمل مرة واحدة وبيتصدّر لاستخدامه في أي مكان محتاج يرفع أو يمسح صور
export const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
});

export const PRODUCT_IMAGES_BUCKET = "product-images";