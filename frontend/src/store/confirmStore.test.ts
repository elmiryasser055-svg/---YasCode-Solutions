// src/store/confirmStore.test.ts
import { describe, it, expect } from "vitest";
import { confirm, resolveConfirm, useConfirmStore } from "./confirmStore";

describe("confirmStore", () => {
  it("confirm() يفتح الحوار ويُحل الـ Promise بـ true عند resolveConfirm(true)", async () => {
    const promise = confirm("هل أنت متأكد؟");
    expect(useConfirmStore.getState().isOpen).toBe(true);
    expect(useConfirmStore.getState().message).toBe("هل أنت متأكد؟");

    resolveConfirm(true);
    const result = await promise;

    expect(result).toBe(true);
    expect(useConfirmStore.getState().isOpen).toBe(false);
  });

  it("resolveConfirm(false) يُحل الـ Promise بـ false", async () => {
    const promise = confirm("متأكد من الحذف؟");
    resolveConfirm(false);
    expect(await promise).toBe(false);
  });

  it("danger افتراضيًا true إن لم يُحدَّد صراحة", () => {
    confirm("رسالة بلا خيارات");
    expect(useConfirmStore.getState().danger).toBe(true);
    resolveConfirm(false);
  });

  it("danger: false يُطبَّق عند تحديده صراحة", () => {
    confirm("رسالة غير خطيرة", { danger: false });
    expect(useConfirmStore.getState().danger).toBe(false);
    resolveConfirm(false);
  });
});
