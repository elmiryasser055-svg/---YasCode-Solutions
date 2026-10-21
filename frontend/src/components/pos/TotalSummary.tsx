// src/components/pos/TotalSummary.tsx
import { Receipt } from "lucide-react";

interface TotalSummaryProps {
  total: number;
  currency: string;
  label: string;
}

export function TotalSummary({ total, currency, label }: TotalSummaryProps) {
  return (
    <div className="rounded-2xl border-2 border-[var(--color-primary-200)] bg-gradient-to-br from-[var(--color-primary-50)] to-[var(--bg-card)] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {label}
          </span>
          <span className="text-4xl font-black tabular-nums text-[var(--color-primary-700)] mt-1 drop-shadow-sm">
            {total.toFixed(2)}
          </span>
        </div>
        <div className="flex items-baseline gap-1 ml-2">
          <span className="text-xl font-bold text-[var(--color-primary-500)]">
            {currency}
          </span>
          <Receipt className="h-10 w-10 text-[var(--color-primary-300)]" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}