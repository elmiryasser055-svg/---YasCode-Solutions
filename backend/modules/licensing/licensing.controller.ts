// backend/modules/licensing/licensing.controller.ts
//
// منطق العمل (مثل auth.controller.ts) — يستدعي licenseCrypto من lib/ ويستخدم licensing.service
// للقراءة/الكتابة. هذا هو الملف الذي تستدعيه ipc.ts وأيضًا أي موديول آخر يحتاج assertLicenseActive
// (مثلاً sales.controller.ts قبل إتمام أي عملية بيع).

import { verifyLicense } from "../../lib/licenseCrypto";
import { getCurrentLicense, replaceLicense, touchLastSeen } from "./licensing.service";
import type { ActivateLicenseInput } from "./licensing.schema";

// ⚠️ استبدل هذا بمحتوى public.pem الناتج عن أداة التوليد الداخلية (خارج هذا الـ repo)
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEARpZm+Xo/Ca9Hqc/HEpy1U3q6HtxS1SiiuQRg/wRkV+k=
-----END PUBLIC KEY-----
`;

const CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

export type LicenseStatus =
  | { state: "NOT_ACTIVATED" }
  | { state: "ACTIVE"; clientName: string; expiresAt: string; daysLeft: number }
  | { state: "EXPIRED"; clientName: string; expiresAt: string }
  | { state: "TAMPERED" };

export function activateLicense(input: ActivateLicenseInput): { ok: true } | { ok: false; error: string } {
  const result = verifyLicense(input.licenseKey, PUBLIC_KEY_PEM);

  if (!result.valid) {
    return {
      ok: false,
      error: result.reason === "MALFORMED" ? "صيغة المفتاح غير صحيحة" : "المفتاح غير صالح أو تم التلاعب به",
    };
  }

  const now = new Date();
  if (new Date(result.payload.expiresAt).getTime() < now.getTime()) {
    return { ok: false, error: "هذا المفتاح منتهي الصلاحية أصلاً" };
  }

  replaceLicense({
    licenseKey: input.licenseKey,
    clientId: result.payload.clientId,
    clientName: result.payload.clientName,
    activatedAt: now.toISOString(),
    expiresAt: result.payload.expiresAt,
    lastSeenAt: now.toISOString(),
  });

  return { ok: true };
}

export function checkLicenseStatus(): LicenseStatus {
  const row = getCurrentLicense();
  if (!row) return { state: "NOT_ACTIVATED" };

  const now = new Date();
  const nowMs = now.getTime();
  const lastSeenMs = new Date(row.lastSeenAt).getTime();

  // حماية من تراجع ساعة النظام (محاولة تفادي انتهاء الاشتراك)
  if (nowMs < lastSeenMs - CLOCK_TOLERANCE_MS) {
    return { state: "TAMPERED" };
  }

  touchLastSeen(row.id, now.toISOString());

  const expiresMs = new Date(row.expiresAt).getTime();
  if (nowMs > expiresMs) {
    return { state: "EXPIRED", clientName: row.clientName, expiresAt: row.expiresAt };
  }

  const daysLeft = Math.ceil((expiresMs - nowMs) / (24 * 60 * 60 * 1000));
  return { state: "ACTIVE", clientName: row.clientName, expiresAt: row.expiresAt, daysLeft };
}

/**
 * يُستدعى من موديولات أخرى (خصوصًا sales.controller.ts) قبل أي عملية حساسة،
 * لمنع الالتفاف على القفل عبر ترك التطبيق مفتوحًا من قبل انتهاء الترخيص.
 */
export function assertLicenseActive(): void {
  const status = checkLicenseStatus();
  if (status.state !== "ACTIVE") {
    throw new Error("LICENSE_INACTIVE");
  }
}