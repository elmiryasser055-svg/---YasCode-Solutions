// middleware/ipcValidate.ts
// كل مدخل قادم من الـ renderer يُتحقق منه عبر Zod schema قبل وصوله لأي
// controller أو service — بغض النظر عن كون المصدر نافذة Electron محلية
// وليست شبكة عامة؛ المدخل يبقى "غير موثوق" من حيث المبدأ (دفاع متعدد الطبقات).

import type { ZodType, z } from "zod";
import { ValidationError } from "./errors";

/**
 * ⚠️ إصلاح حرج: كان التوقيع السابق يستخدم `ZodSchema<TSchema>` (= اختصار لـ
 * `ZodType<TSchema, ZodTypeDef, TSchema>`) الذي يُجبر TypeScript على اعتبار
 * نوع "ما قبل التحقق" و"ما بعد التحقق" **متطابقين** — غير صحيح لأي حقل فيه
 * `.default(...)`: قبل التحقق الحقل اختياري (`number | undefined`)، بعده
 * مضمون القيمة (`number`). هذا كان يُسرّب النوع الاختياري الخاطئ إلى كل
 * service بالمشروع تقريبًا (أي schema فيه `.default()`: pageSize, discount,
 * amountPaid, copies, lowStockThreshold...)، فيرفض TypeScript تمرير القيمة
 * الصحيحة (المضمونة) لأنه يظن أنها قد تكون undefined.
 *
 * الحل: `z.output<TSchemaType>` يستخرج صراحة النوع **بعد** التحقق والقيم
 * الافتراضية — وهو ما يصل فعليًا لأي handler هنا (`result.data`).
 */
export function withValidation<TSchemaType extends ZodType<any, any, any>, TOutput>(
  schema: TSchemaType,
  handler: (input: z.output<TSchemaType>) => Promise<TOutput>
) {
  return async (rawInput: unknown): Promise<TOutput> => {
    const result = schema.safeParse(rawInput);
    if (!result.success) {
      // رسالة عامة للمستخدم؛ التفاصيل الكاملة (أي حقل فشل) تُسجَّل فقط إن احتجنا للتدقيق
      throw new ValidationError();
    }
    return handler(result.data);
  };
}
