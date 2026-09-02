// backend/test-utils/setupTestEnv.ts
//
// يُستدعى في beforeEach من كل ملف اختبار يحتاج قاعدة بيانات حقيقية. يستخدم
// initDatabase() الفعلية (وليس نسخة مختصرة موازية) بمسار ":memory:" — بذلك
// الاختبارات تمر عبر **نفس** مسار الكود المستخدم في الإنتاج فعليًا (بما في
// ذلك تطبيق migrations الحقيقية من drizzle/migrations/)، لا محاكاة منفصلة
// قد تنحرف عن الواقع بمرور الوقت.
//
// ممكن هذا كله بعد إصلاح lib/env.ts وlib/logger.ts (إزالة اعتمادهما المباشر
// على Electron) — قبل هذا الإصلاح كان استيراد lib/db.ts من أي اختبار يفشل فورًا.

import { loadEnv, resetEnvForTests } from "../lib/env";
import { initDatabase, resetDbForTests } from "../lib/db";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "../../db/schema";

export function setupTestDb(): BetterSQLite3Database<typeof schema> {
  resetEnvForTests();
  resetDbForTests();
  loadEnv({ DB_PATH: ":memory:", NODE_ENV: "test" });
  return initDatabase();
}
