// middleware/ipcErrorHandler.ts
//
// في تطبيق REST تقليدي هذا يكافئ errorHandler.ts. هنا الغلاف يُطبَّق حول
// كل ipcMain.handle بدل أن يكون middleware مركزي في السلسلة (Electron لا يدعم
// سلسلة middleware حول IPC بشكل مدمج)، لكن الأثر مطابق: كل خطأ غير متوقع
// يُسجَّل بالكامل داخليًا، ويصل للـ renderer برسالة عامة آمنة فقط.

import { logger } from "../lib/logger";
import { RateLimitError } from "../lib/rateLimit";
import { AppError } from "./errors";

export type IpcHandler<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

export function withErrorHandling<TInput, TOutput>(
  channelName: string,
  handler: IpcHandler<TInput, TOutput>
): IpcHandler<TInput, { ok: true; data: TOutput } | { ok: false; error: string }> {
  return async (input) => {
    try {
      const data = await handler(input);
      return { ok: true, data };
    } catch (err) {
      if (err instanceof AppError) {
        // خطأ متوقع (تحقق فشل، صلاحيات، منطق عمل) — رسالته آمنة للعرض مباشرة
        return { ok: false, error: err.message };
      }
      if (err instanceof RateLimitError) {
        return { ok: false, error: err.message };
      }
      // خطأ غير متوقع (DB، bug...) — لا نُسرّب أي تفاصيل تقنية
      logger.error(`خطأ غير متوقع في القناة ${channelName}`, err);
      return { ok: false, error: "حدث خطأ غير متوقع، الرجاء المحاولة مرة أخرى." };
    }
  };
}
