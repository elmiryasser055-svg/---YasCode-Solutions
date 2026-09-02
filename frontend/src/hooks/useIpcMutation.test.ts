// src/hooks/useIpcMutation.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useIpcMutation } from "./useIpcMutation";

describe("useIpcMutation", () => {
  it("يبدأ بحالة idle: لا تحميل، لا خطأ، لا بيانات", () => {
    const { result } = renderHook(() => useIpcMutation(vi.fn()));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });

  it("⭐ ينجح: يضبط data ويستدعي onSuccess عند نجاح العملية", async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true, data: { id: 1 } });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useIpcMutation(fn, { onSuccess }));

    await act(async () => {
      await result.current.mutate({ some: "input" });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({ id: 1 });
    expect(result.current.error).toBeNull();
    expect(onSuccess).toHaveBeenCalledWith({ id: 1 });
  });

  it("⭐ يفشل: يضبط error ولا يضبط data عند فشل العملية (ok: false)", async () => {
    const fn = vi.fn().mockResolvedValue({ ok: false, error: "خطأ في التحقق" });
    const onError = vi.fn();
    const { result } = renderHook(() => useIpcMutation(fn, { onError }));

    await act(async () => {
      try {
        await result.current.mutate({});
      } catch {
        // متوقع: mutate يعيد رمي الخطأ عمدًا (راجع تعليق الكود في useIpcMutation.ts)
      }
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe("خطأ في التحقق");
    expect(result.current.data).toBeNull();
    expect(onError).toHaveBeenCalledWith("خطأ في التحقق");
  });

  it("isLoading يكون true أثناء تنفيذ العملية", async () => {
    let resolvePromise: (value: { ok: true; data: string }) => void;
    const fn = vi.fn(
      () =>
        new Promise<{ ok: true; data: string }>((resolve) => {
          resolvePromise = resolve;
        })
    );
    const { result } = renderHook(() => useIpcMutation(fn));

    act(() => {
      result.current.mutate({});
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => {
      resolvePromise!({ ok: true, data: "done" });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
