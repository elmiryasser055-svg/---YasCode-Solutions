// src/hooks/useKeyboardShortcuts.ts
//
// يسدّ فجوة: "اختصارات لوحة المفاتيح لتسريع العمل" كانت مطلوبة صراحة في
// تحليل المرحلة 1 (ProjectAnalysis.md) ولم تُبنَ بعد. هذا hook عام يُستخدم
// في أي شاشة (بدأنا بـ SaleScreen، لأنها الأكثر إلحاحًا لسرعة العمل).

import { useEffect } from "react";

type ShortcutMap = Record<string, (e: KeyboardEvent) => void>;

/**
 * مفاتيح الاختصار تُكتب كنص: "F4"، "Escape"، "Ctrl+P"...
 * `enabled=false` مفيد لتعطيل الاختصارات مؤقتًا (مثال: أثناء فتح نافذة حوار
 * فوق الشاشة الرئيسية حتى لا تتفعّل اختصارات الخلفية بالخطأ).
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const parts: string[] = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      const combo = parts.join("+");

      const handler = shortcuts[combo];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}
