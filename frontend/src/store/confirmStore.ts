// src/store/confirmStore.ts
//
// ⭐ يسدّ فجوة: عمليات حسّاسة (تعطيل منتج، حذف فئة، استعادة نسخة احتياطية)
// كانت تُنفَّذ فورًا بضغطة واحدة بلا أي "هل أنت متأكد؟" — خطر حقيقي في
// تطبيق POS يُستخدم بسرعة طوال اليوم. هذا store + مكوّن واحد (ConfirmDialogHost)
// يوفّران `confirm(message): Promise<boolean>` قابلة للاستدعاء من أي مكوّن،
// بدل تكرار state محلي (isOpen/message) في كل شاشة تحتاج تأكيدًا.

import { create } from "zustand";

interface ConfirmState {
  isOpen: boolean;
  message: string;
  danger: boolean;
  resolver: ((value: boolean) => void) | null;
}

export const useConfirmStore = create<ConfirmState>(() => ({
  isOpen: false,
  message: "",
  danger: false,
  resolver: null,
}));

/**
 * الاستخدام: `if (await confirm("هل أنت متأكد؟")) { ...نفّذ العملية... }`
 * `danger: true` يجعل زر التأكيد أحمر (للعمليات المدمّرة كحذف/استعادة نسخة)
 */
export function confirm(message: string, options?: { danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.setState({
      isOpen: true,
      message,
      danger: options?.danger ?? true, // افتراضيًا "خطير" لأن أغلب استخداماتنا تعطيل/حذف/استعادة
      resolver: resolve,
    });
  });
}

export function resolveConfirm(value: boolean) {
  const { resolver } = useConfirmStore.getState();
  resolver?.(value);
  useConfirmStore.setState({ isOpen: false, message: "", resolver: null });
}
