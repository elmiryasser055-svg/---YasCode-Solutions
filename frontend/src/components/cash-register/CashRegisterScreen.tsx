// src/components/cash-register/CashRegisterScreen.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/ipcClient";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { useCashRegisterStore } from "../../store/cashRegisterStore";
import { toast } from "../../lib/toast";

export function CashRegisterScreen() {
  const { t } = useTranslation();
  const { openSessionId, refresh } = useCashRegisterStore();

  const [openingAmount, setOpeningAmount] = useState(0);
  const [actualAmount, setActualAmount] = useState(0);
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [closedSummary, setClosedSummary] = useState<Record<string, unknown> | null>(null);

  const openSession = useIpcMutation(api().cashRegister.open, { 
    onSuccess: () => {
      refresh();
      toast.success(t("cashRegister.openSuccess"));
    },
    onError: (err) => toast.error(err),
  });
  
  const closeSession = useIpcMutation(api().cashRegister.close, {
    onSuccess: (data) => {
      setClosedSummary(data);
      refresh();
      toast.success(t("cashRegister.closeSuccess"));
    },
    onError: (err) => toast.error(err),
  });
  
  const recordExpense = useIpcMutation(api().cashRegister.recordExpense, {
    onSuccess: () => {
      setExpenseCategory("");
      setExpenseAmount(0);
      toast.success(t("cashRegister.expenseSuccess"));
    },
    onError: (err) => toast.error(err),
  });

  // لا جلسة مفتوحة: شاشة فتح جلسة فقط
  if (!openSessionId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="yc-card text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success-50)] text-[var(--color-success-600)]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
            </div>
            <h2 className="mb-1 text-xl font-bold text-[var(--text-primary)]">{t("cashRegister.openSession")}</h2>
            <p className="mb-4 text-sm text-[var(--text-secondary)]">{t("cashRegister.openSessionDesc")}</p>
            
            <div className="space-y-4 text-start">
              <label className="block">
                <span className="text-sm text-[var(--text-secondary)] mb-1 block">{t("cashRegister.openingAmount")}</span>
                <input
                  type="number"
                  className="yc-input text-lg font-bold"
                  value={openingAmount || ""}
                  onChange={(e) => setOpeningAmount(Number(e.target.value))}
                  data-barcode-ignore="true"
                  placeholder="0.00"
                />
              </label>
              <button
                onClick={() => openSession.mutate({ openingAmount })}
                disabled={openSession.isLoading}
                className="yc-btn-success w-full py-3"
              >
                {openSession.isLoading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
                )}
                <span>{t("cashRegister.openSession")}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // حساب الفرق لعرضه بألوان دلالية
  const difference = Number(closedSummary?.difference ?? 0);
  const differenceColor = difference === 0 ? "text-[var(--color-success-600)]" : "text-[var(--color-danger-600)]";

  return (
    <div className="grid h-full grid-cols-1 gap-6 p-6 md:grid-cols-2">
      {/* تسجيل مصروف */}
      <motion.section 
        initial={{ opacity: 0, x: -10 }} 
        animate={{ opacity: 1, x: 0 }}
        className="yc-card flex flex-col"
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-warning-100)] text-[var(--color-warning-600)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h2 className="font-bold text-lg text-[var(--text-primary)]">{t("cashRegister.recordExpense")}</h2>
        </div>

        <div className="flex-1 space-y-3">
          <label className="block">
            <span className="text-sm text-[var(--text-secondary)] mb-1 block">{t("cashRegister.expenseCategoryLabel")}</span>
            <input
              className="yc-input"
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              data-barcode-ignore="true"
              placeholder={t("cashRegister.expenseCategoryPlaceholder")}
            />
          </label>
          <label className="block">
            <span className="text-sm text-[var(--text-secondary)] mb-1 block">{t("cashRegister.amount")}</span>
            <input
              type="number"
              className="yc-input"
              value={expenseAmount || ""}
              onChange={(e) => setExpenseAmount(Number(e.target.value))}
              data-barcode-ignore="true"
              placeholder="0.00"
            />
          </label>
        </div>

        <button
          onClick={() => recordExpense.mutate({ sessionId: openSessionId, category: expenseCategory, amount: expenseAmount })}
          disabled={recordExpense.isLoading || !expenseCategory || expenseAmount <= 0}
          className="w-full py-3 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          style={{ background: "linear-gradient(135deg, var(--color-warning-500), var(--color-warning-600))" }}
        >
          {recordExpense.isLoading ? (
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
          ) : (
            t("cashRegister.recordExpense")
          )}
        </button>
      </motion.section>

      {/* إغلاق الجلسة */}
      <motion.section 
        initial={{ opacity: 0, x: 10 }} 
        animate={{ opacity: 1, x: 0 }}
        className="yc-card flex flex-col"
      >
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-danger-100)] text-[var(--color-danger-600)]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 17l-4 4m0 0l-4-4m4 4V3"></path></svg>
          </div>
          <h2 className="font-bold text-lg text-[var(--text-primary)]">{t("cashRegister.closeSession")}</h2>
        </div>

        <div className="flex-1 space-y-3">
          <label className="block">
            <span className="text-sm text-[var(--text-secondary)] mb-1 block">{t("cashRegister.actualAmount")} {t("cashRegister.afterManualCount")}</span>
            <input
              type="number"
              className="yc-input text-lg font-bold"
              value={actualAmount || ""}
              onChange={(e) => setActualAmount(Number(e.target.value))}
              data-barcode-ignore="true"
              placeholder="0.00"
            />
          </label>

          <AnimatePresence>
            {closedSummary && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 rounded-lg border border-[var(--border-light)] bg-[var(--color-gray-50)] p-4 space-y-2 text-sm overflow-hidden"
              >
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{t("cashRegister.expectedAmount")}:</span>
                  <span className="font-bold text-[var(--text-primary)]">{String(closedSummary.expectedAmount)} {t("cashRegister.currency")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">{t("cashRegister.actualAmount")}:</span>
                  <span className="font-bold text-[var(--text-primary)]">{String(closedSummary.actualAmount)} {t("cashRegister.currency")}</span>
                </div>
                <div className="border-t border-[var(--border-light)] mt-2 pt-2 flex justify-between">
                  <span className="text-[var(--text-secondary)]">{t("cashRegister.difference")}:</span>
                  <span className={`font-bold ${differenceColor}`}>{difference} {t("cashRegister.currency")}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => closeSession.mutate({ sessionId: openSessionId, actualAmount })}
          disabled={closeSession.isLoading}
          className="yc-btn-danger w-full py-3 mt-4"
        >
          {closeSession.isLoading ? (
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          )}
          <span>{t("cashRegister.closeSession")}</span>
        </button>
      </motion.section>
    </div>
  );
}