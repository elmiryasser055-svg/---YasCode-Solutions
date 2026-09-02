// e2e/login.spec.ts
//
// اختبار E2E أساسي: يتحقق أن التطبيق يقلع بنجاح ويعرض شاشة تسجيل الدخول.
// يتطلب تشغيل `npm run predist` أولاً (بناء renderer + electron).
//
// ⚠️ راجع الملاحظة في playwright.config.ts: هذا الملف لم يُشغَّل فعليًا في
// بيئة الكتابة (لا شاشة عرض متاحة). صحيح بنيويًا حسب توثيق Playwright
// الرسمي لاختبار Electron، لكن يحتاج تشغيلاً فعليًا للتحقق قبل الاعتماد عليه.

import { test, expect, _electron as electron, type ElectronApplication, type Page } from "@playwright/test";
import path from "node:path";

let app: ElectronApplication;
let window: Page;

test.beforeAll(async () => {
  app = await electron.launch({
    args: [path.join(__dirname, "../dist-electron/frontend/electron/main.js")],
    env: {
      ...process.env,
      NODE_ENV: "test",
      DB_PATH: ":memory:", // قاعدة بيانات معزولة تمامًا لكل تشغيل اختبار — لا تأثير على بيانات حقيقية
    },
  });
  window = await app.firstWindow();
});

test.afterAll(async () => {
  await app.close();
});

test("يعرض شاشة تسجيل الدخول عند الإقلاع (لا يوجد أي حساب مبدئي)", async () => {
  await expect(window.getByPlaceholder("اسم المستخدم")).toBeVisible();
  await expect(window.getByPlaceholder("كلمة المرور")).toBeVisible();
});

test("يعرض رسالة خطأ عند إدخال بيانات دخول خاطئة", async () => {
  await window.getByPlaceholder("اسم المستخدم").fill("غير_موجود");
  await window.getByPlaceholder("كلمة المرور").fill("كلمة_مرور_خاطئة");
  await window.getByRole("button", { name: "دخول" }).click();

  // رسالة خطأ موحّدة (راجع auth.service.ts: لا تمييز بين "مستخدم غير موجود" و"كلمة مرور خاطئة")
  await expect(window.getByText("اسم المستخدم أو كلمة المرور غير صحيحة")).toBeVisible();
});
