// backend/middleware/ipcValidate.test.ts
//
// ⭐ يمنع تكرار خطأ حقيقي وقع فعليًا: withValidation كان يستخدم generics
// خاطئة تجعل TypeScript يظن أن الحقول ذات .default() قد تكون undefined بعد
// التحقق، رغم أنها مضمونة القيمة فعليًا في runtime. هذا الاختبار يثبت
// السلوك الصحيح في runtime (والنوع الصحيح يُتحقق منه بشكل منفصل عبر
// `tsc --noEmit` كما هو موثَّق في RUNNING.md).

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { withValidation } from "./ipcValidate";

const schemaWithDefault = z.object({
  name: z.string(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).default(30),
});

describe("withValidation — القيم الافتراضية", () => {
  it("⭐ يملأ القيم الافتراضية فعليًا قبل استدعاء الـ handler (لا تصل undefined)", async () => {
    const handler = withValidation(schemaWithDefault, async (input) => {
      // لو كان النوع خاطئًا (اختياريًا) هذا لن يُكتشف هنا، لكن التحقق الحقيقي
      // من صحة النوع في وقت التصريف (tsc) — هذا الاختبار يثبت القيمة الفعلية runtime
      return input;
    });

    const result = await handler({ name: "منتج" }); // page/pageSize غير مُرسلَين إطلاقًا
    expect(result).toEqual({ name: "منتج", page: 1, pageSize: 30 });
  });

  it("يحترم القيم المُرسلة صراحة بدل الافتراضية", async () => {
    const handler = withValidation(schemaWithDefault, async (input) => input);
    const result = await handler({ name: "منتج", page: 3, pageSize: 10 });
    expect(result).toEqual({ name: "منتج", page: 3, pageSize: 10 });
  });

  it("يرمي ValidationError عند فشل التحقق", async () => {
    const handler = withValidation(schemaWithDefault, async (input) => input);
    await expect(handler({ page: "ليس رقمًا" })).rejects.toThrow();
  });
});
