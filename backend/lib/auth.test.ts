// backend/lib/auth.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { hashPassword, verifyPassword } from "./auth";
import { assertNotRateLimited, recordFailedAttempt, clearAttempts, RateLimitError } from "./rateLimit";

describe("hashPassword / verifyPassword", () => {
  it("يتحقق من كلمة المرور الصحيحة وحدها", async () => {
    const hash = await hashPassword("MyStrongPass123");
    expect(await verifyPassword("MyStrongPass123", hash)).toBe(true);
    expect(await verifyPassword("WrongPassword", hash)).toBe(false);
  });
});

describe("rate limiting", () => {
  const username = `test-user-${Date.now()}`; // اسم فريد لكل تشغيل، لتفادي تداخل الحالة بين الاختبارات

  beforeEach(() => {
    clearAttempts(username);
  });

  it("⭐ يقفل الحساب بعد 5 محاولات فاشلة متتالية", () => {
    for (let i = 0; i < 5; i++) {
      expect(() => assertNotRateLimited(username)).not.toThrow();
      recordFailedAttempt(username);
    }
    expect(() => assertNotRateLimited(username)).toThrow(RateLimitError);
  });

  it("يصفّر العدّاد بعد نجاح تسجيل الدخول", () => {
    recordFailedAttempt(username);
    recordFailedAttempt(username);
    clearAttempts(username);
    expect(() => assertNotRateLimited(username)).not.toThrow();
  });
});
