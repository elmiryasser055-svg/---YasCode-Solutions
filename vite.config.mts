// vite.config.mts (في جذر المشروع)
//
// ⚠️ الامتداد .mts (وليس .ts) إجباري هنا — اكتُشف فعليًا أثناء إضافة
// vitest.workspace.ts (لاحقًا في المشروع): بما أن package.json لا يحتوي
// "type": "module" (المشروع CommonJS افتراضيًا لأجل main.ts في Electron)،
// فإن Node/esbuild يحاولان تحميل vite.config.ts عبر require() عند تشغيل
// vitest، بينما "vite" و"@vitejs/plugin-react" حزم ESM-only في إصداراتهما
// الحالية — ما يُفشل التحميل بخطأ "ESM file cannot be loaded by require".
// الامتداد .mts يفرض معاملة الملف كـ ESM بشكل صريح بغضّ النظر عن إعداد
// package.json، ويحلّ المشكلة نهائيًا دون التأثير على بقية المشروع.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "frontend",
  plugins: [react()],
  build: {
    outDir: "../dist", // جذر المشروع/dist — يطابق المسار المستخدم في electron/main.ts
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
