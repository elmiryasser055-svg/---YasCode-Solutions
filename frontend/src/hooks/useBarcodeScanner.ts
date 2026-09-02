// src/hooks/useBarcodeScanner.ts
//
// قارئ الباركود يعمل كـ "keyboard wedge": يُرسل الأحرف كأنها كتابة سريعة جدًا
// ثم Enter. هذا الـ hook يميّز مسح الباركود عن الكتابة اليدوية العادية عبر
// قياس الفارق الزمني بين الحروف المتتالية (threshold قابل للتهيئة من الإعدادات
// لاحقًا حسب سرعة القارئ الفعلي المستخدم في المحل).

import { useEffect, useRef } from "react";

const DEFAULT_MAX_INTER_CHAR_DELAY_MS = 40; // القراءات الآلية أسرع بكثير من أي كتابة يدوية حقيقية
const MIN_BARCODE_LENGTH = 4;

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  maxInterCharDelayMs?: number;
  enabled?: boolean;
}

export function useBarcodeScanner({
  onScan,
  maxInterCharDelayMs = DEFAULT_MAX_INTER_CHAR_DELAY_MS,
  enabled = true,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef("");
  const lastCharTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // نتجاهل الإدخال داخل حقول نصية عادية (بحث يدوي بالاسم مثلاً) حتى لا نتعارض
      // مع الكتابة الطبيعية للمستخدم — القارئ عادة يُوجَّه لحقل مخصص أو للصفحة ككل
      const target = e.target as HTMLElement;
      if (target.dataset.barcodeIgnore === "true") return;

      const now = Date.now();
      const delay = now - lastCharTimeRef.current;
      lastCharTimeRef.current = now;

      if (e.key === "Enter") {
        if (bufferRef.current.length >= MIN_BARCODE_LENGTH) {
          onScan(bufferRef.current);
        }
        bufferRef.current = "";
        return;
      }

      if (e.key.length !== 1) return; // تجاهل Shift, Tab, أسهم...

      // إن كان الفارق كبيرًا، هذه بداية إدخال جديد (كتابة يدوية بطيئة أو بداية مسح جديد)
      if (delay > maxInterCharDelayMs) {
        bufferRef.current = e.key;
      } else {
        bufferRef.current += e.key;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan, maxInterCharDelayMs, enabled]);
}
