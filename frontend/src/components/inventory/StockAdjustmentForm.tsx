// src/components/inventory/StockAdjustmentForm.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/ipcClient";
import { useIpcMutation } from "../../hooks/useIpcMutation";

interface Props {
  productId: number;
  productName: string;
  onDone: () => void;
}

/** نموذج بسيط لتعديل الكمية يدويًا (stock in/out) — owner فقط (مفروض في الباك-إند أيضًا) */
export function StockAdjustmentForm({ productId, productName, onDone }: Props) {
  const { t } = useTranslation();
  const [quantityChange, setQuantityChange] = useState(0);
  const [reason, setReason] = useState("");

  const adjustStock = useIpcMutation(api().inventory.adjustStock, {
    onSuccess: onDone,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await adjustStock.mutate({ productId, quantityChange, reason });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <h3 className="font-semibold">{productName}</h3>

      <label className="block text-sm">
        الكمية (موجب = إضافة، سالب = إخراج)
        <input
          type="number"
          className="mt-1 w-full rounded border p-2"
          value={quantityChange}
          onChange={(e) => setQuantityChange(Number(e.target.value))}
          data-barcode-ignore="true"
        />
      </label>

      <label className="block text-sm">
        السبب
        <input
          type="text"
          className="mt-1 w-full rounded border p-2"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="مثال: تلف، هدية، تصحيح جرد..."
          data-barcode-ignore="true"
        />
      </label>

      {adjustStock.error && <p className="text-sm text-red-600">{adjustStock.error}</p>}

      <button
        type="submit"
        disabled={adjustStock.isLoading || quantityChange === 0 || reason.length < 2}
        className="w-full rounded-md bg-blue-600 py-2 text-white disabled:opacity-50"
      >
        {adjustStock.isLoading ? t("common.loading") : t("common.confirm")}
      </button>
    </form>
  );
}
