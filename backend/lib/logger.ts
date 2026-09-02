// lib/logger.ts
//
// نفصل بشكل صارم بين:
// - السجل الكامل (تفاصيل تقنية، stack trace) → يُكتب فقط في ملف log محلي
// - الرسالة الموجّهة للمستخدم عبر الواجهة → دائمًا رسالة عامة آمنة
//
// هذا يحقق متطلب "Error Handling آمن" من المرحلة 3: لا تسريب أسماء
// جداول/أعمدة/مسارات ملفات في أي رسالة تصل للـ renderer.
//
// ⚠️ إصلاح بنيوي (نفس مبدأ lib/env.ts): كان هذا الملف يستورد `app` من
// "electron" وينفّذ app.getPath("userData") كـ side effect عند التحميل
// مباشرة — ما يكسر أي استيراد لهذا الملف خارج Electron فعليًا (سكربتات،
// اختبارات). الآن مسار ملف الـ log يُضبط عبر configureLogger() صراحة من
// main.ts، مع قيمة افتراضية آمنة (مجلد "./logs" نسبي) تعمل في أي سياق حتى
// بلا استدعاء configureLogger — مفيد تحديدًا للاختبارات.

import fs from "node:fs";
import path from "node:path";

let logFilePath = path.join(process.cwd(), "logs", "app.log");
let initialized = false;

function ensureLogFile() {
  if (initialized) return;
  fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
  initialized = true;
}

/** يُستدعى مرة واحدة من main.ts (Electron) بمسار مجلد بيانات المستخدم الفعلي */
export function configureLogger(logDirectory: string) {
  logFilePath = path.join(logDirectory, "app.log");
  initialized = false; // إجبار إعادة إنشاء المجلد الجديد عند أول كتابة قادمة
}

function write(level: "INFO" | "ERROR" | "WARN", message: string, meta?: unknown) {
  ensureLogFile();
  const line = `[${new Date().toISOString()}] [${level}] ${message}${
    meta ? " " + safeStringify(meta) : ""
  }\n`;
  fs.appendFileSync(logFilePath, line);
}

function safeStringify(value: unknown): string {
  try {
    if (value instanceof Error) {
      return JSON.stringify({ message: value.message, stack: value.stack });
    }
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => write("INFO", message, meta),
  warn: (message: string, meta?: unknown) => write("WARN", message, meta),
  error: (message: string, meta?: unknown) => write("ERROR", message, meta),
};
