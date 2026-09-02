// src/hooks/useIpcMutation.ts
//
// نمط موحّد لكل عملية "كتابة" عبر IPC (إنشاء بيع، تعديل منتج، فتح صندوق...).
// كل مكوّن في التطبيق يستخدم نفس الشكل: { mutate, isLoading, error, data } —
// بدل تكرار useState×3 (loading/error/data) في كل مكوّن يدويًا.

import { useCallback, useState } from "react";
import { IpcResult, unwrap } from "../lib/ipcClient";

interface UseIpcMutationOptions<TOutput> {
  onSuccess?: (data: TOutput) => void;
  onError?: (message: string) => void;
}

export function useIpcMutation<TInput, TOutput>(
  fn: (input: TInput) => Promise<IpcResult<TOutput>>,
  options?: UseIpcMutationOptions<TOutput>
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TOutput | null>(null);

  const mutate = useCallback(
    async (input: TInput) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await unwrap(fn(input));
        setData(result);
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
        setError(message);
        options?.onError?.(message);
        // نُعيد رمي الخطأ حتى يستطيع المستدعي التعامل معه محليًا إن أراد (مثلاً إيقاف spinner إضافي)
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fn, options]
  );

  return { mutate, isLoading, error, data, reset: () => setError(null) };
}
