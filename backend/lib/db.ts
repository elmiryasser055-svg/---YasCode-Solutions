// lib/db.ts
// إنشاء اتصال SQLite وحيد (singleton) عبر better-sqlite3 + Drizzle،
// مع تفعيل WAL mode (حماية من فقدان البيانات عند انقطاع الكهرباء)
// وتشغيل الـ migrations تلقائيًا عند كل إقلاع بعد أخذ نسخة احتياطية.

import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import path from "node:path";
import { getEnv } from "./env";
import * as schema from "../../db/schema"; // schema.ts الناتج عن المرحلة 2
import { logger } from "./logger";

let sqlite: Database.Database | null = null;
let db: BetterSQLite3Database<typeof schema> | null = null;

function backupBeforeMigration(dbPath: string) {
  if (!fs.existsSync(dbPath)) return; // أول تشغيل، لا يوجد ملف لنسخه بعد
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${dbPath}.bak-${timestamp}`;
  fs.copyFileSync(dbPath, backupPath);
  logger.info(`تم أخذ نسخة احتياطية قبل تطبيق التحديثات: ${backupPath}`);
}

export function initDatabase(migrationsFolder?: string): BetterSQLite3Database<typeof schema> {
  if (db) return db;

  const { DB_PATH } = getEnv();
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  backupBeforeMigration(DB_PATH);

  sqlite = new Database(DB_PATH);
  // WAL mode: يسمح بقراءة/كتابة متزامنة بأمان أكبر، وأهم شيء —
  // يقلل بشكل كبير احتمال تلف الملف عند انقطاع الكهرباء المفاجئ أثناء الكتابة
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON"); // فرض قيود العلاقات (foreign keys) في SQLite صراحة

  db = drizzle(sqlite, { schema });

  // ⚠️ إصلاح حرج: __dirname هنا يشير إلى مكان الملف المُصرَّف فعليًا وقت
  // التشغيل (dist-electron/backend/lib بعد tsc، وليس backend/lib المصدر) —
  // مجلد drizzle/migrations لا يُنسخ إلى dist-electron أبدًا (tsc يُصرِّف
  // ملفات .ts فقط)، فحساب المسار via `path.join(__dirname, "../../drizzle/migrations")`
  // كان يشير لمجلد غير موجود بعد التصريف، رغم نجاحه أثناء الاختبارات (حيث
  // vitest ينفّذ الكود من مكانه الأصلي مباشرة بلا تصريف منفصل).
  //
  // الحل: المسار يُمرَّر الآن صراحة من main.ts (حيث Electron يعرف بدقة عبر
  // app.getAppPath()/app.isPackaged أين المشروع فعليًا)، مع احتفاظ هذا الملف
  // بنفس السلوك القديم كـ fallback افتراضي — يبقى صحيحًا فقط في سياق
  // الاختبارات (vitest) التي لا تمرّ بخطوة تصريف منفصلة.
  const resolvedMigrationsFolder = migrationsFolder ?? path.join(__dirname, "../../drizzle/migrations");

  try {
    migrate(db, { migrationsFolder: resolvedMigrationsFolder });
    logger.info(`تم تطبيق كل الـ migrations بنجاح من: ${resolvedMigrationsFolder}`);
  } catch (err) {
    logger.error("فشل تطبيق الـ migrations — التطبيق سيتوقف لتفادي العمل بحالة بيانات غير متناسقة.", err);
    throw err;
  }

  return db;
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) throw new Error("Database not initialized — call initDatabase() first in main.ts");
  return db;
}

/** يُستدعى عند إغلاق التطبيق لضمان إغلاق نظيف للملف (flush WAL) */
export function closeDatabase() {
  sqlite?.close();
}

/**
 * يُستخدم فقط من ملفات الاختبار: يصفّر الـ singleton بين كل اختبار حتى لا
 * يتسرّب اتصال قاعدة بيانات (أو حالتها) من اختبار سابق إلى التالي. بدون هذا،
 * initDatabase() في الاختبار الثاني كانت ستُعيد نفس اتصال الاختبار الأول
 * (المُغلَق أصلاً) بسبب الـ singleton.
 */
export function resetDbForTests() {
  try {
    sqlite?.close();
  } catch {
    // الاتصال قد يكون مغلقًا مسبقًا؛ لا مشكلة في تجاهل ذلك هنا تحديدًا
  }
  sqlite = null;
  db = null;
}
