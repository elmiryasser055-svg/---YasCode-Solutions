// vitest.workspace.ts
//
// المشروع يحتوي بيئتي اختبار مختلفتين تمامًا:
// - الباك-إند: Node عادي (better-sqlite3، لا DOM إطلاقًا)
// - الفرونت-إند: jsdom (مكوّنات React تحتاج DOM وهمي)
//
// vitest workspace يسمح بتشغيل الاثنين معًا عبر أمر واحد (npm run test:unit)
// بإعدادات منفصلة تمامًا لكل منهما، بدل الاضطرار لأمرين منفصلين أو تسوية
// إعداد واحد غير مناسب لأي من الجانبين.

import path from "node:path";
import { defineWorkspace } from "vitest/config";

const rootDir = path.dirname(new URL(import.meta.url).pathname);

export default defineWorkspace([
  {
    test: {
      name: "backend",
      environment: "node",
      include: ["backend/**/*.test.ts"],
    },
  },
  {
    // ⚠️ إجباري: بلا هذا، أي ملف .tsx في الاختبارات يفشل بخطأ "React is not
    // defined" لأن esbuild الافتراضي يستخدم classic JSX transform بينما
    // المشروع مبني على automatic transform (نفس إعداد tsconfig.json: jsx: "react-jsx")
    esbuild: { jsx: "automatic" },
    test: {
      name: "frontend",
      environment: "jsdom",
      include: ["frontend/src/**/*.test.{ts,tsx}"],
      setupFiles: [path.join(rootDir, "frontend/src/test-setup.ts")],
      globals: true,
    },
  },
]);
