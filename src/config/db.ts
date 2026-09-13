import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// تصدير متوافق مع كافة الطرق
export const db = pool;
export default pool;