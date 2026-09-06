// src/components/pos/PaymentPanel.tsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Banknote, Calculator, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  total: number;
  receivedAmount: string;
  onReceivedChange: (value: string) => void;
  onComplete: () => void;
  isLoading: boolean;
  disabled: boolean;
  openSessionId: number | null;
}

const CASH_PRESETS = [100, 200, 500, 1000, 2000, 5000];

export function PaymentPanel({
  total,
  receivedAmount,
  onReceivedChange,
  onComplete,
  isLoading,
  disabled,
  openSessionId,
}: Props) {
  const { t } = useTranslation();
  const [showCalc, setShowCalc] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const receivedNum = receivedAmount.trim() === "" ? 0 : Number(receivedAmount);
  const change = receivedNum - total;
  const isExact = Math.abs(change) < 0.01;
  const isInsufficient = change < -0.01;
  const hasValue = receivedAmount.trim() !== "";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const target = e.target as HTMLElement;
        if (target.tagName === "BUTTON" && target.type !== "submit") {
          return;
        }

        e.preventDefault();
        if (!disabled && !isLoading) {
          if (isInsufficient || !hasValue) {
            onReceivedChange(total.toFixed(2));
          }
          onComplete();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, isLoading, isInsufficient, hasValue, total, onReceivedChange, onComplete]);

  const handlePresetClick = (value: string) => {
    onReceivedChange(value);
    inputRef.current?.focus();
  };

  return (
    <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-success-50)] text-[var(--color-success-600)]">
          <Banknote className="h-4 w-4" strokeWidth={2.5} />
        </div>
        <h3 className="text-sm font-bold text-[var(--text-primary)]">{t("paymentPanel.cashPayment")}</h3>
      </div>

      <div className="relative mb-3">
        <input
          ref={inputRef}
          type="number"
          min={0}
          step={0.01}
          placeholder={t("paymentPanel.receivedPlaceholder")}
          value={receivedAmount}
          onChange={(e) => onReceivedChange(e.target.value)}
          className="w-full rounded-xl border-2 border-[var(--border-light)] bg-[var(--bg-hover)] py-3 pr-4 pl-12 text-right text-xl font-bold text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary-400)]"
          style={{
            borderColor: isInsufficient ? "var(--color-danger-400)" : undefined,
          }}
          data-barcode-ignore="true"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">
          {t("paymentPanel.currency")}
        </span>
        {hasValue && (
          <button
            onClick={() => {
              onReceivedChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--color-danger-500)]"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-1.5">
        <button
          onClick={() => handlePresetClick(total.toFixed(2))}
          className="col-span-3 rounded-lg bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] py-2 text-xs font-bold text-white shadow-md transition-transform active:scale-95"
        >
          {t("paymentPanel.exactAmount")} ({total.toFixed(2)})
        </button>
        {CASH_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(String(preset))}
            className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-hover)] py-2 text-xs font-bold text-[var(--text-secondary)] transition-all hover:border-[var(--color-primary-300)] hover:text-[var(--color-primary-700)] active:scale-95"
          >
            {preset}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {hasValue && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden"
          >
            <div
              className={`flex items-center justify-between rounded-xl p-3 ${
                isInsufficient
                  ? "bg-[var(--color-danger-50)] text-[var(--color-danger-600)]"
                  : isExact
                  ? "bg-[var(--color-success-50)] text-[var(--color-success-600)]"
                  : "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
              }`}
            >
              <div className="flex items-center gap-2">
                {isInsufficient ? (
                  <AlertCircle className="h-5 w-5" strokeWidth={2} />
                ) : (
                  <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
                )}
                <span className="text-sm font-bold">
                  {isInsufficient ? t("paymentPanel.insufficient") : isExact ? t("paymentPanel.exact") : t("paymentPanel.change")}
                </span>
              </div>
              <span className="text-xl font-black tabular-nums">
                {isInsufficient ? (Math.abs(change).toFixed(2)) : (change.toFixed(2))}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onComplete}
        disabled={disabled || isLoading || isInsufficient}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:shadow-none"
        style={{
          background: disabled || isInsufficient
            ? "var(--text-muted)"
            : "linear-gradient(135deg, var(--color-success-500), var(--color-success-600))",
        }}
      >
        {isLoading ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            {t("paymentPanel.processing")}
          </>
        ) : (
          <>
            <Wallet className="h-5 w-5" strokeWidth={2} />
            {t("pos.completeSale")}
          </>
        )}
      </motion.button>

      {!openSessionId && (
        <p className="mt-2 text-center text-xs text-[var(--color-danger-500)]">
          {t("paymentPanel.openRegisterFirst")}
        </p>
      )}
    </div>
  );
}