// playwright.config.ts
//
// ⚠️ ملاحظة صدق مهمة: هذا الإعداد وملفات e2e/*.spec.ts صحيحة بنيويًا وتتبع
// الطريقة الرسمية الموثَّقة لاختبار تطبيقات Electron بـ Playwright، لكن
// **لم تُشغَّل فعليًا** في بيئة التطوير التي كُتبت فيها (بيئة sandbox بلا
// شاشة عرض/GUI حقيقية، لا يمكنها تشغيل نافذة Electron فعلية). هذا يختلف عن
// اختبارات Vitest في هذا المشروع (backend + frontend) التي شُغِّلت فعليًا
// وأُثبت نجاحها (34/34). يجب تشغيل هذه الاختبارات فعليًا على جهازك (Windows
// أو أي جهاز بشاشة) قبل الوثوق بها الوثوق الكامل الممنوح للاختبارات الأخرى.

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false, // اختبار تطبيق Electron واحد في كل مرة — لا تشغيل متوازٍ لعدة نوافذ تطبيق
  retries: 0,
  reporter: "list",
});
