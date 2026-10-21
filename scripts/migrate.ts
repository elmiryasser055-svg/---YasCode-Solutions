// migrate.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const DB_PATH = process.env.DB_PATH ?? "./pos.db";
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

console.log("⏳ جارٍ تطبيق الهجرات وإنشاء الجداول...");

try {
  migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("✅ تم إنشاء جميع الجداول بنجاح!");
} catch (error) {
  console.error("❌ حدث خطأ أثناء إنشاء الجداول:", error);
} finally {
  sqlite.close();
}