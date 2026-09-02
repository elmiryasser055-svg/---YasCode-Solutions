// src/components/layout/ConfirmDialogHost.tsx
// يُركَّب مرة واحدة في App.tsx فقط — يقرأ حالته من confirmStore ويظهر تلقائيًا
// عند استدعاء confirm() من أي مكان في التطبيق.

import { useConfirmStore, resolveConfirm } from "../../store/confirmStore";

export function ConfirmDialogHost() {
  const { isOpen, message, danger } = useConfirmStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-96 rounded-lg bg-white p-5 shadow-xl" dir="auto">
        <p className="mb-5 text-sm text-gray-800">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => resolveConfirm(false)}
            className="rounded-md border px-4 py-2 text-sm"
            autoFocus
          >
            إلغاء
          </button>
          <button
            onClick={() => resolveConfirm(true)}
            className={`rounded-md px-4 py-2 text-sm text-white ${
              danger ? "bg-red-600" : "bg-blue-600"
            }`}
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
}
