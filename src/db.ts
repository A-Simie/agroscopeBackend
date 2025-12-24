import "dotenv/config";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}
console.log("DB URL:", process.env.DATABASE_URL);

export const pool = new Pool({
  connectionString: databaseUrl,
});
