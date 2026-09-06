// src/components/suppliers/SupplierDetail.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { NewPurchaseForm } from "../purchases/NewPurchaseForm";
import { toast } from "../../lib/toast";
import { useTranslation } from "react-i18next";

interface Props {
  supplierId: number;
  supplierName: string;
  onClose: () => void;
}

export function SupplierDetail({ supplierId, supplierName, onClose }: Props) {
  const { t } = useTranslation();
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [showNewPurchase, setShowNewPurchase] = useState(false);
  
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  const debt = useIpcQuery(
    () => api().suppliers.getDebt({ id: supplierId }), 
    [supplierId, refreshKey]
  );
  
  const purchases = useIpcQuery(
    () => api().purchases.listBySupplier(supplierId), 
    [supplierId, refreshKey]
  );

  if (purchases.error) console.error("Purchases Error:", purchases.error);

  const recordPayment = useIpcMutation(api().purchases.recordSupplierPayment, {
    onSuccess: () => {
      triggerRefresh();
      setPaymentAmount(0);
      toast.success(t("suppliers.paymentSuccess"));
    },
    onError: (err) => toast.error(err),
  });

  const getStatusBadgeClass = (status: string) => {
    if (status === "paid") return "yc-badge-green";
    if (status === "partial") return "yc-badge-amber";
    return "yc-badge-red";
  };

  const translateStatus = (status: string) => {
    if (status === "paid") return t("suppliers.status_paid");
    if (status === "partial") return t("suppliers.status_partial");
    return t("suppliers.status_unpaid");
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl h-[90vh] bg-[var(--bg-card)] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-light)] p-5 bg-[var(--color-gray-50)]">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{supplierName}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {t("suppliers.current_debt")}{" "}
              <span className={`font-bold ${debt.data && debt.data > 0 ? "text-[var(--color-danger-600)]" : "text-[var(--color-success-600)]"}`}>
                {debt.isLoading ? "..." : `${debt.data ?? 0} ${t("reports.currency")}`}
              </span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--color-gray-200)] rounded-md p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Payment Form */}
          <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border border-[var(--border-light)] bg-white">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-[var(--text-secondary)] mb-1">{t("suppliers.record_new_payment")}</label>
              <input
                type="number"
                className="yc-input"
                placeholder={t("suppliers.payment_amount_placeholder")}
                value={paymentAmount || ""}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                data-barcode-ignore="true"
              />
            </div>
            <button
              onClick={() => recordPayment.mutate({ supplierId, amount: paymentAmount, purchaseId: null })}
              disabled={recordPayment.isLoading || paymentAmount <= 0}
              className="yc-btn-success"
            >
              {recordPayment.isLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              )}
              <span>{t("suppliers.confirm_payment")}</span>
            </button>
          </div>

          {/* New Purchase Form Toggle */}
          <button
            onClick={() => setShowNewPurchase((v) => !v)}
            className={`yc-btn-secondary ${showNewPurchase ? "bg-[var(--color-gray-100)]" : ""}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            {showNewPurchase ? t("suppliers.close_purchase_form") : t("suppliers.new_purchase_invoice")}
          </button>

          {showNewPurchase && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <NewPurchaseForm
                supplierId={supplierId}
                onDone={() => {
                  setShowNewPurchase(false);
                  triggerRefresh();
                  toast.success(t("suppliers.purchaseSuccess"));
                }}
              />
            </motion.div>
          )}

          {/* Purchase History Table */}
          <div className="yc-card p-0">
            <div className="border-b border-[var(--border-light)] p-4">
              <h3 className="font-semibold text-[var(--text-primary)]">{t("suppliers.invoice_history")}</h3>
            </div>
            {purchases.isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="animate-spin-slow h-8 w-8 rounded-full border-4 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)]"></div>
              </div>
            ) : purchases.error ? (
              <div className="p-8 text-center text-[var(--color-danger-600)]">
                {t("suppliers.fetch_invoice_error", { error: purchases.error })}
              </div>
            ) : (
              <div className="overflow-auto">
                <table className="yc-table">
                  <thead>
                    <tr>
                      <th>{t("suppliers.col_date")}</th>
                      <th>{t("suppliers.col_total")}</th>
                      <th>{t("suppliers.col_paid")}</th>
                      <th>{t("suppliers.col_status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(purchases.data ?? []).map((p: any) => (
                      <motion.tr
                        key={p.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <td className="text-[var(--text-secondary)]">{p.purchaseDate}</td>
                        <td className="font-medium text-[var(--text-primary)]">{p.totalAmount} {t("reports.currency")}</td>
                        <td className="text-[var(--text-secondary)]">{p.amountPaid} {t("reports.currency")}</td>
                        <td>
                          <span className={`yc-badge ${getStatusBadgeClass(p.status)}`}>
                            {translateStatus(p.status)}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                    {!purchases.isLoading && (purchases.data ?? []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">
                          {t("suppliers.empty_invoices")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}