"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
require("dotenv/config");
const pg_1 = require("pg");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
}
console.log("DB URL:", process.env.DATABASE_URL);
exports.pool = new pg_1.Pool({
    connectionString: databaseUrl,
});
//# sourceMappingURL=db.js.map