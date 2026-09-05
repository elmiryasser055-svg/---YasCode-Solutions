// src/components/layout/ConfirmDialogHost.tsx
// نفس الـlogic والـAPI بالضبط — تحديث UI فقط ليطابق global.css

import { useEffect, useRef } from "react";
import { useConfirmStore, resolveConfirm } from "../../store/confirmStore";
import { AlertTriangle, HelpCircle } from "lucide-react";

export function ConfirmDialogHost() {
  const { isOpen, message, danger } = useConfirmStore();
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") resolveConfirm(false);
      if (e.key === "Enter") resolveConfirm(true);
    }

    document.addEventListener("keydown", handleKeyDown);
    // فوكس افتراضي على "إلغاء" للعمليات الخطيرة — أمان إضافي ضد ضغط عرضي
    const timer = setTimeout(() => {
      (danger ? cancelBtnRef : confirmBtnRef).current?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, danger]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-describedby="confirm-dialog-message"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgb(15 23 42 / 0.45)", backdropFilter: "blur(2px)" }}
        onClick={() => resolveConfirm(false)}
      />

      {/* Dialog */}
      <div
        className="yc-card relative w-full max-w-sm !p-6 animate-fade-in-scale"
        style={{ boxShadow: "var(--shadow-xl)" }}
        dir="auto"
      >
        {/* Icon */}
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: danger ? "var(--color-danger-50)" : "var(--color-primary-50)" }}
        >
          {danger ? (
            <AlertTriangle
              className="h-7 w-7"
              style={{ color: "var(--color-danger-500)" }}
              strokeWidth={1.75}
            />
          ) : (
            <HelpCircle
              className="h-7 w-7"
              style={{ color: "var(--color-primary-600)" }}
              strokeWidth={1.75}
            />
          )}
        </div>

        <p
          id="confirm-dialog-message"
          className="mb-6 text-center text-sm leading-relaxed text-[var(--text-primary)]"
        >
          {message}
        </p>

        <div className="flex gap-3">
          <button
            ref={cancelBtnRef}
            onClick={() => resolveConfirm(false)}
            className="yc-btn-secondary flex-1"
          >
            إلغاء
          </button>
          <button
            ref={confirmBtnRef}
            onClick={() => resolveConfirm(true)}
            className={danger ? "yc-btn-danger flex-1" : "yc-btn-primary flex-1"}
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}