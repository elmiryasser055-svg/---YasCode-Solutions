// backend/middleware/authorize.test.ts
//
// يغطي "Security tests" الموثّقة في back-end.md § 4: التأكد أن requireRole
// يرفض فعليًا جلسة cashier لعمليات owner-only، وليس فقط أن الكود "يبدو" صحيحًا.

import { describe, it, expect } from "vitest";
import { requireRole } from "./ipcAuthorize";
import { ForbiddenError } from "./errors";
import type { Session } from "../lib/auth";

const cashierSession: Session = { token: "t", userId: 1, role: "cashier", lastActivityAt: Date.now() };
const ownerSession: Session = { token: "t", userId: 2, role: "owner", lastActivityAt: Date.now() };

describe("requireRole", () => {
  it("يرفض جلسة cashier لعملية owner-only", async () => {
    const handler = requireRole(["owner"], async () => "sensitive-data");
    await expect(handler(undefined, cashierSession)).rejects.toThrow(ForbiddenError);
  });

  it("يسمح لجلسة owner بنفس العملية", async () => {
    const handler = requireRole(["owner"], async () => "sensitive-data");
    await expect(handler(undefined, ownerSession)).resolves.toBe("sensitive-data");
  });
});
