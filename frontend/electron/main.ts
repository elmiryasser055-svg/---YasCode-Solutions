// frontend/electron/main.ts
//
// نقطة الإقلاع الفعلية لـ Electron — تربط كل ما بنيناه في المراحل 3-5 سويًا:
// تحميل env → فتح قاعدة البيانات (مع migrations) → تسجيل كل قنوات IPC →
// تشغيل النسخ الاحتياطي الدوري → فتح النافذة.

import { app, BrowserWindow } from "electron";
import path from "node:path";
import { loadEnv } from "../../backend/lib/env";
import { initDatabase, closeDatabase } from "../../backend/lib/db";
import { registerAllIpcHandlers } from "../../backend/modules/registerAllIpcHandlers";
import { startBackupScheduler } from "../../backend/lib/backup";
import { configureLogger } from "../../backend/lib/logger";

const isDev = process.env.NODE_ENV === "development";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // إجباري أمنيًا — راجع back-end.md § 5 و front-end.md § 6
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    // dist-electron/frontend/electron/main.js → ../../../dist/index.html = جذر المشروع/dist/index.html
    win.loadFile(path.join(__dirname, "../../../dist/index.html"));
  }
}

app.whenReady().then(() => {
  // ⭐ حساب مسار قاعدة البيانات وملف الـ log هنا فقط (حيث Electron متاح
  // فعليًا)، ثم تمريرهما صراحة — lib/env.ts وlib/logger.ts لم يعودا يعرفان
  // شيئًا عن Electron (راجع التعليقات في كلا الملفين لتفاصيل هذا الإصلاح)
  configureLogger(app.getPath("userData"));
  loadEnv({
    DB_PATH: process.env.DB_PATH || path.join(app.getPath("userData"), "store.sqlite"),
  });

  // ⭐ إصلاح حرج: مسار drizzle/migrations لا يمكن حسابه بأمان عبر __dirname
  // داخل lib/db.ts لأنه يختلف جذريًا بين وضع التطوير (بعد تصريف tsc إلى
  // dist-electron) ووضع الإنتاج المُعبَّأ (asar + extraResources) — راجع
  // التعليق المفصَّل في lib/db.ts. Electron وحده يعرف الفرق بثقة عبر
  // app.isPackaged، لذا الحساب يحدث هنا حصرًا:
  const migrationsFolder = app.isPackaged
    ? path.join(process.resourcesPath, "drizzle/migrations") // يطابق extraResources في package.json
    : path.join(app.getAppPath(), "drizzle/migrations"); // في التطوير: app.getAppPath() = جذر المشروع دائمًا، بغضّ النظر عن عمق تعشيش dist-electron

  initDatabase(migrationsFolder); // يطبّق migrations تلقائيًا (مع نسخة احتياطية قبلها، راجع المرحلة 3)
  registerAllIpcHandlers();
  startBackupScheduler();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  closeDatabase();
  if (process.platform !== "darwin") app.quit();
});
