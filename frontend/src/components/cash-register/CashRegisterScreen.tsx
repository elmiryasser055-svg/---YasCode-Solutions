// src/components/cash-register/CashRegisterScreen.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/ipcClient";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { useCashRegisterStore } from "../../store/cashRegisterStore";

export function CashRegisterScreen() {
  const { t } = useTranslation();
  const { openSessionId, refresh } = useCashRegisterStore();

  const [openingAmount, setOpeningAmount] = useState(0);
  const [actualAmount, setActualAmount] = useState(0);
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [closedSummary, setClosedSummary] = useState<Record<string, unknown> | null>(null);

  const openSession = useIpcMutation(api().cashRegister.open, { onSuccess: refresh });
  const closeSession = useIpcMutation(api().cashRegister.close, {
    onSuccess: (data) => {
      setClosedSummary(data);
      refresh();
    },
  });
  const recordExpense = useIpcMutation(api().cashRegister.recordExpense, {
    onSuccess: () => {
      setExpenseCategory("");
      setExpenseAmount(0);
    },
  });

  // لا جلسة مفتوحة: شاشة فتح جلسة فقط
  if (!openSessionId) {
    return (
      <div className="mx-auto mt-10 max-w-sm space-y-3 rounded-lg border p-6">
        <h2 className="text-lg font-bold">{t("cashRegister.openSession")}</h2>
        <label className="block text-sm">
          {t("cashRegister.openingAmount")}
          <input
            type="number"
            className="mt-1 w-full rounded border p-2"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(Number(e.target.value))}
            data-barcode-ignore="true"
          />
        </label>
        {openSession.error && <p className="text-sm text-red-600">{openSession.error}</p>}
        <button
          onClick={() => openSession.mutate({ openingAmount })}
          disabled={openSession.isLoading}
          className="w-full rounded-md bg-green-600 py-2 text-white disabled:opacity-50"
        >
          {openSession.isLoading ? t("common.loading") : t("cashRegister.openSession")}
        </button>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-2 gap-4 p-4">
      {/* تسجيل مصروف */}
      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">تسجيل مصروف</h2>
        <input
          className="w-full rounded border p-2 text-sm"
          placeholder="الفئة (كهرباء، نقل...)"
          value={expenseCategory}
          onChange={(e) => setExpenseCategory(e.target.value)}
          data-barcode-ignore="true"
        />
        <input
          type="number"
          className="w-full rounded border p-2 text-sm"
          placeholder="المبلغ"
          value={expenseAmount || ""}
          onChange={(e) => setExpenseAmount(Number(e.target.value))}
          data-barcode-ignore="true"
        />
        {recordExpense.error && <p className="text-sm text-red-600">{recordExpense.error}</p>}
        <button
          onClick={() =>
            recordExpense.mutate({ sessionId: openSessionId, category: expenseCategory, amount: expenseAmount })
          }
          disabled={recordExpense.isLoading || !expenseCategory || expenseAmount <= 0}
          className="w-full rounded-md bg-orange-600 py-2 text-sm text-white disabled:opacity-50"
        >
          تسجيل المصروف
        </button>
      </section>

      {/* إغلاق الجلسة */}
      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">{t("cashRegister.closeSession")}</h2>
        <label className="block text-sm">
          {t("cashRegister.actualAmount")} (بعد العدّ اليدوي)
          <input
            type="number"
            className="mt-1 w-full rounded border p-2"
            value={actualAmount}
            onChange={(e) => setActualAmount(Number(e.target.value))}
            data-barcode-ignore="true"
          />
        </label>
        {closeSession.error && <p className="text-sm text-red-600">{closeSession.error}</p>}
        <button
          onClick={() => closeSession.mutate({ sessionId: openSessionId, actualAmount })}
          disabled={closeSession.isLoading}
          className="w-full rounded-md bg-red-600 py-2 text-sm text-white disabled:opacity-50"
        >
          {t("cashRegister.closeSession")}
        </button>

        {closedSummary && (
          <div className="mt-2 rounded bg-gray-50 p-3 text-sm">
            <p>
              {t("cashRegister.expectedAmount")}: {String(closedSummary.expectedAmount)}
            </p>
            <p>
              {t("cashRegister.actualAmount")}: {String(closedSummary.actualAmount)}
            </p>
            <p className="font-semibold">
              {t("cashRegister.difference")}: {String(closedSummary.difference)}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
