// src/hooks/useIpcQuery.ts
//
// نمط موحّد لكل عملية "قراءة" تُنفَّذ تلقائيًا عند تحميل المكوّن أو تغيّر
// اعتمادياتها (مثال: قائمة منتجات، تنبيهات قرب الانتهاء، ملخص جلسة صندوق).

import { useCallback, useEffect, useState } from "react";
import { IpcResult, unwrap } from "../lib/ipcClient";

export function useIpcQuery<TOutput>(
  fn: () => Promise<IpcResult<TOutput>>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<TOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await unwrap(fn());
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع.");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}
