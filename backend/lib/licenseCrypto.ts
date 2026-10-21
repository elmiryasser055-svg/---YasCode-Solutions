// lib/licenseCrypto.ts
//
// نفس منطق التحقق الموجود عندك في backend/lib/licenseCrypto.ts بمشروع الـ POS.
// السيرفر يحتاج يتحقق من التوقيع أيضًا (وليس فقط الجهاز)، وإلا أي شخص يقدر يبعث
// طلب activate مزيّف بـ clientId عشوائي بدون امتلاك مفتاح حقيقي، ويحجز الـ clientId
// قبل الزبون الحقيقي (هجوم بسيط جدًا لو ما تحقّقناش من التوقيع هنا أيضًا).

import crypto from "node:crypto";

export interface LicensePayload {
  clientId: string;
  clientName: string;
  issuedAt: string;
  expiresAt: string;
}

interface SignedLicense {
  payload: LicensePayload;
  signature: string;
}

export type VerifyResult =
  | { valid: true; payload: LicensePayload }
  | { valid: false; reason: "MALFORMED" | "BAD_SIGNATURE" };

export function verifyLicense(licenseKey: string, publicKeyPem: string): VerifyResult {
  let signed: SignedLicense;
  try {
    const json = Buffer.from(licenseKey, "base64url").toString("utf-8");
    signed = JSON.parse(json);
    if (!signed.payload || !signed.signature) throw new Error("shape");
  } catch {
    return { valid: false, reason: "MALFORMED" };
  }

  try {
    const publicKey = crypto.createPublicKey(publicKeyPem);
    const data = Buffer.from(JSON.stringify(signed.payload), "utf-8");
    const signatureBuf = Buffer.from(signed.signature, "base64");
    const ok = crypto.verify(null, data, publicKey, signatureBuf);
    return ok ? { valid: true, payload: signed.payload } : { valid: false, reason: "BAD_SIGNATURE" };
  } catch {
    return { valid: false, reason: "BAD_SIGNATURE" };
  }
}