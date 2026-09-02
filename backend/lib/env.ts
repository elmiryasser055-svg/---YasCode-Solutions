// lib/env.ts
//
// ⚠️ إصلاح بنيوي مهم: هذا الملف كان يستورد `app` من "electron" مباشرة لتحديد
// مسار قاعدة البيانات الافتراضي — ما يعني أن أي كود يستورد هذا الملف (حتى
// بشكل غير مباشر عبر lib/db.ts) يفشل فورًا خارج عملية Electron فعلية. هذا كسر
// سكربت seed-owner.ts سابقًا (احتاج إعادة تنفيذ منطق مستقل بديل)، وكان
// سيكسر أي اختبار unit/integration يستورد lib/db.ts.
//
// الحل: env.ts لا يعرف شيئًا عن Electron إطلاقًا الآن. المسار الافتراضي
// لقاعدة البيانات يُحسب في frontend/electron/main.ts (حيث Electron متاح
// فعليًا) ويُمرَّر إلى loadEnv() كـ override صريح. هذا يجعل env.ts (وبالتالي
// db.ts وكل الموديولات) قابلة للاستيراد والاختبار في أي سياق Node عادي.

import { z } from "zod";

const envSchema = z.object({
  // مسار قاعدة البيانات — إلزامي الآن (لا قيمة افتراضية ضمنية هنا)، يُمرَّر
  // صراحة من نقطة الإقلاع المناسبة لكل سياق (Electron main.ts، سكربت CLI، اختبار)
  DB_PATH: z.string().min(1, "DB_PATH مطلوب — مرّره عبر loadEnv({ DB_PATH }) أو process.env.DB_PATH"),
  // مفتاح تشفير محلي لأي بيانات حساسة (مثال: نسخ احتياطي مشفّر لاحقًا)
  LOCAL_ENCRYPTION_KEY: z.string().min(32).optional(),
  // بيئة التشغيل
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  // عدد أيام "قرب انتهاء الصلاحية" الافتراضي (قابل للتعديل من app_settings لاحقًا)
  DEFAULT_EXPIRY_WARNING_DAYS: z.coerce.number().int().positive().default(30),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * يُستدعى مرة واحدة عند إقلاع أي نقطة دخول (Electron main.ts، سكربت CLI،
 * إعداد اختبار). `overrides` تسمح بحقن القيم بدل الاعتماد فقط على
 * process.env — ضروري خصوصًا لـ DB_PATH الذي يختلف مصدره حسب السياق.
 *
 * يرمي خطأ عاديًا (وليس app.quit()/process.exit المرتبطين بـ Electron) إن
 * كانت الإعدادات غير صالحة — كل سياق استدعاء يقرر بنفسه كيف يتعامل مع الخطأ
 * (Electron main.ts يستدعي app.quit() في catch خاص به، الاختبارات تلتقطه بـ expect().toThrow()).
 */
export function loadEnv(overrides: Partial<Record<keyof Env, string>> = {}): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse({
    DB_PATH: overrides.DB_PATH ?? process.env.DB_PATH,
    LOCAL_ENCRYPTION_KEY: overrides.LOCAL_ENCRYPTION_KEY ?? process.env.LOCAL_ENCRYPTION_KEY,
    NODE_ENV: overrides.NODE_ENV ?? process.env.NODE_ENV,
    DEFAULT_EXPIRY_WARNING_DAYS:
      overrides.DEFAULT_EXPIRY_WARNING_DAYS ?? process.env.DEFAULT_EXPIRY_WARNING_DAYS,
  });

  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment configuration:", result.error.format());
    throw new Error("Invalid environment configuration — راجع الرسالة أعلاه لمعرفة الحقل الناقص.");
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function getEnv(): Env {
  if (!cachedEnv) {
    throw new Error("Env not loaded yet — call loadEnv() during app startup first.");
  }
  return cachedEnv;
}

/** يُستخدم فقط من ملفات الاختبار لإعادة الضبط بين كل اختبار (كل اختبار يحتاج DB_PATH خاصًا به عادة) */
export function resetEnvForTests() {
  cachedEnv = null;
}
