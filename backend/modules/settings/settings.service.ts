// modules/settings/settings.service.ts
//
// ⭐ يسدّ فجوة: جدول app_settings كان معرَّفًا في السكيمة (المرحلة 2) بلا أي
// service/ipc يقرأ أو يكتب فيه — لا طريقة كانت موجودة لضبط اللغة الافتراضية،
// اسم الطابعة، أو عدد أيام تنبيه الصلاحية من واجهة الإعدادات.

import { eq } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { appSettings, auditLog } from "../../../db/schema";
import type { Session } from "../../lib/auth";

/** قيم افتراضية تُستخدم إن لم يُخصّص المالك قيمة بعد (لا تُكتب في الجدول تلقائيًا) */
export const SETTINGS_DEFAULTS: Record<string, string> = {
  language: "ar",
  printerName: "",
  expiryWarningDays: "30",
};

export async function getSetting(key: string): Promise<string> {
  const db = getDb();
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
  return row?.value ?? SETTINGS_DEFAULTS[key] ?? "";
}

/**
 * كل الإعدادات دفعة واحدة (افتراضية + المخصّصة) — تُستخدم عادة عند إقلاع
 * الواجهة (مثلاً لتحديد اللغة الابتدائية) **قبل** حتى تسجيل الدخول، لذا
 * هذه العملية تحديدًا لا تتطلب مصادقة (راجع تبرير ذلك في back-end.md § التحديث).
 */
export async function getAllSettings(): Promise<Record<string, string>> {
  const db = getDb();
  const rows = await db.query.appSettings.findMany();
  const result: Record<string, string> = { ...SETTINGS_DEFAULTS };
  for (const row of rows) result[row.key] = row.value;
  return result;
}

export async function setSetting(input: { key: string; value: string }, session: Session) {
  const db = getDb();
  const existing = await db.query.appSettings.findFirst({ where: eq(appSettings.key, input.key) });

  if (existing) {
    await db.update(appSettings).set({ value: input.value }).where(eq(appSettings.key, input.key));
  } else {
    await db.insert(appSettings).values({ key: input.key, value: input.value });
  }

  await db.insert(auditLog).values({
    userId: session.userId,
    action: "settings_change",
    entityType: "app_settings",
    entityId: 0, // app_settings مفتاحه نصّي (key) لا رقمي؛ التفاصيل الكاملة في newValue
    oldValue: existing ? JSON.stringify({ [input.key]: existing.value }) : null,
    newValue: JSON.stringify({ [input.key]: input.value }),
  });

  return { key: input.key, value: input.value };
}
