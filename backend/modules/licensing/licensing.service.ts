// backend/modules/licensing/licensing.service.ts
//
// طبقة الوصول للبيانات فقط (مثل products.service.ts) — بدون منطق تحقق من التوقيع،
// هذا مسؤولية licenseCrypto.ts في backend/lib/. الـ controller هو من يربط الاثنين.

import { eq } from "drizzle-orm";
import { getDb } from "../../lib/db"; // عدّل الاسم إذا دالتك مختلفة التسمية في db.ts
import { licenseTable } from "../../../db/schema";

export interface LicenseRow {
  id: number;
  licenseKey: string;
  clientId: string;
  clientName: string;
  activatedAt: string;
  expiresAt: string;
  lastSeenAt: string;
}

export function getCurrentLicense(): LicenseRow | undefined {
  const db = getDb();
  return db.select().from(licenseTable).get();
}

/** يحذف أي ترخيص سابق ويثبّت الجديد كسجل وحيد حالي */
export function replaceLicense(row: Omit<LicenseRow, "id">): void {
  const db = getDb();
  db.delete(licenseTable).run();
  db.insert(licenseTable).values(row).run();
}

export function touchLastSeen(id: number, nowIso: string): void {
  const db = getDb();
  db.update(licenseTable).set({ lastSeenAt: nowIso }).where(eq(licenseTable.id, id)).run();
}