// src/components/inventory/StockAdjustmentForm.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { api } from "../../lib/ipcClient";
import { useIpcMutation } from "../../hooks/useIpcMutation";

interface Props {
  productId: number;
  productName: string;
  currentQuantity: number;
  onDone: () => void;
  onClose: () => void;
}

const QUICK_AMOUNTS = [1, 5, 10, 50];

export function StockAdjustmentForm({ productId, productName, currentQuantity, onDone, onClose }: Props) {
  const { t } = useTranslation();
  
  const [mode, setMode] = useState<"difference" | "exact">("difference");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState(t("stockAdjustment.noReason"));

  const mutationFn = mode === "difference" ? api().inventory.adjustStock : api().inventory.correctInventory;
  
  const adjustStock = useIpcMutation(mutationFn as any, {
    onSuccess: onDone,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    let payload: any;
    if (mode === "difference") {
      const finalQuantity = direction === "in" ? Math.abs(amount) : -Math.abs(amount);
      payload = { productId, quantityChange: finalQuantity, reason };
    } else {
      payload = { productId, newQuantity: Math.abs(amount), reason };
    }

    await adjustStock.mutate(payload);
  }

  const handleQuickAmount = (val: number) => {
    if (mode === "exact") {
      setAmount(val);
    } else {
      setAmount((prev) => prev + val);
    }
  };

  return (
    <div className="yc-card h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg text-[var(--text-primary)]">{productName}</h3>
          <p className="text-sm text-[var(--text-muted)]">
            {t("stockAdjustment.currentRecordedQty")} <span className="font-bold text-[var(--text-primary)]">{currentQuantity}</span>
          </p>
        </div>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      {/* Toggle Mode */}
      <div className="grid grid-cols-2 gap-2 bg-[var(--color-gray-100)] p-1 rounded-lg mb-4">
        <button
          type="button"
          onClick={() => setMode("difference")}
          className={`py-2 rounded-md text-xs font-medium transition-all ${mode === "difference" ? "bg-white shadow-sm text-[var(--color-primary-600)]" : "text-[var(--text-secondary)]"}`}
        >
          {t("stockAdjustment.modeDifference")}
        </button>
        <button
          type="button"
          onClick={() => setMode("exact")}
          className={`py-2 rounded-md text-xs font-medium transition-all ${mode === "exact" ? "bg-white shadow-sm text-[var(--color-primary-600)]" : "text-[var(--text-secondary)]"}`}
        >
          {t("stockAdjustment.modeExact")}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
        
        {/* Direction Toggle (Only for difference mode) */}
        {mode === "difference" && (
          <div className="grid grid-cols-2 gap-2 bg-[var(--color-gray-100)] p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setDirection("in")}
              className={`py-2 rounded-md text-sm font-medium transition-all ${direction === "in" ? "bg-white shadow-sm text-[var(--color-success-600)]" : "text-[var(--text-secondary)]"}`}
            >
              {t("stockAdjustment.dirIn")}
            </button>
            <button
              type="button"
              onClick={() => setDirection("out")}
              className={`py-2 rounded-md text-sm font-medium transition-all ${direction === "out" ? "bg-white shadow-sm text-[var(--color-danger-600)]" : "text-[var(--text-secondary)]"}`}
            >
              {t("stockAdjustment.dirOut")}
            </button>
          </div>
        )}

        {/* Amount Input & Quick Buttons */}
        <div>
          <label className="block text-sm">
            <span className="text-[var(--text-secondary)] mb-1 block">
              {mode === "exact" ? t("stockAdjustment.labelExact") : t("stockAdjustment.labelDifference")}
            </span>
            <input
              type="number"
              min="0"
              className="yc-input text-lg font-bold"
              value={amount === 0 ? "" : amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0"
              data-barcode-ignore="true"
              required
            />
          </label>
          
          <div className="grid grid-cols-4 gap-2 mt-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleQuickAmount(amt)}
                className="yc-btn-secondary !py-1.5 !px-0 text-sm"
              >
                {mode === "exact" ? amt : `+${amt}`}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-sm">
          <span className="text-[var(--text-secondary)] mb-1 block">{t("stockAdjustment.reason")}</span>
          <textarea
            className="yc-input resize-none"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("stockAdjustment.reasonPlaceholder")}
            data-barcode-ignore="true"
            required
          />
        </label>

        {adjustStock.error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-sm text-[var(--color-danger-600)] bg-[var(--color-danger-50)] p-2 rounded-md animate-shake"
          >
            {adjustStock.error}
          </motion.div>
        )}

        <div className="mt-auto pt-4">
          <button
            type="submit"
            disabled={adjustStock.isLoading || amount <= 0 || reason.length < 2}
            className={`w-full py-3 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === "exact" 
                ? "bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] hover:shadow-lg" 
                : direction === "in" 
                  ? "bg-gradient-to-r from-[var(--color-success-500)] to-[var(--color-success-600)] hover:shadow-lg" 
                  : "bg-gradient-to-r from-[var(--color-danger-500)] to-[var(--color-danger-600)] hover:shadow-lg"
            }`}
          >
            {adjustStock.isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                {t("stockAdjustment.processing")}
              </span>
            ) : (
              mode === "exact" ? t("stockAdjustment.saveInventory") : direction === "in" ? t("stockAdjustment.confirmIn") : t("stockAdjustment.confirmOut")
            )}
          </button>
        </div>
      </form>
    </div>
  );
}