import "dotenv/config";
import { pool } from "../src/db";

async function main() {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE,
      password_hash text,
      google_id text,
      name text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS scans (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      disease text NOT NULL,
      confidence double precision NOT NULL,
      severity text NOT NULL,
      summary text NOT NULL,
      recommendations jsonb NOT NULL,
      provider text NOT NULL,
      image_url text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  console.log("Users and scans tables ready");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
