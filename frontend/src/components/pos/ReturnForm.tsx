// src/components/pos/ReturnForm.tsx
//
// إرجاع جزئي لمنتج من فاتورة — returns module (الباك-إند).
//
// ✅ محدَّث: كان هذا الملف يعيد استخدام `sales:reprint` كحل مؤقت لجلب معرّفات
// sale_item الحقيقية (بأثر جانبي: طباعة فعلية إضافية عند كل فتح للنموذج).
// الآن يستخدم `sales:get` المخصصة (قراءة فقط، بلا أي أثر جانبي) — القيد
// التقني الذي كان موثَّقًا هنا سابقًا لم يعد موجودًا.

import { useEffect, useState } from "react";
import { api } from "../../lib/ipcClient";
import { useIpcMutation } from "../../hooks/useIpcMutation";

interface SaleItemWithId {
  id: number;
  productNameSnapshot: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  saleId: number;
  onDone: () => void;
  onCancel: () => void;
}

export function ReturnForm({ saleId, onDone, onCancel }: Props) {
  const [items, setItems] = useState<SaleItemWithId[] | null>(null);
  const [alreadyReturned, setAlreadyReturned] = useState<Record<number, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");

  const createReturn = useIpcMutation(api().returns.create, { onSuccess: onDone });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const saleResult = await api().sales.get({ saleId });
      const returnsResult = await api().returns.getForSale(saleId);
      if (cancelled) return;

      if (!saleResult.ok) {
        setLoadError(saleResult.error);
        return;
      }
      setItems(saleResult.data.items as SaleItemWithId[]);

      if (returnsResult.ok) {
        const totals: Record<number, number> = {};
        for (const r of returnsResult.data as any[]) {
          totals[r.saleItemId] = (totals[r.saleItemId] ?? 0) + r.quantity;
        }
        setAlreadyReturned(totals);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [saleId]);

  function remainingFor(item: SaleItemWithId) {
    return item.quantity - (alreadyReturned[item.id] ?? 0);
  }

  async function handleSubmit() {
    if (!selectedItemId || quantity <= 0 || reason.length < 2) return;
    await createReturn.mutate({ saleItemId: selectedItemId, quantity, reason });
  }

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      <h4 className="text-sm font-semibold">إرجاع منتج من الفاتورة</h4>

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {!items && !loadError && <p className="text-sm text-gray-400">جاري التحميل...</p>}

      {items && (
        <>
          <select
            className="w-full rounded border p-2 text-sm"
            value={selectedItemId ?? ""}
            onChange={(e) => setSelectedItemId(Number(e.target.value) || null)}
          >
            <option value="">اختر منتجًا...</option>
            {items.map((item) => {
              const remaining = remainingFor(item);
              return (
                <option key={item.id} value={item.id} disabled={remaining <= 0}>
                  {item.productNameSnapshot} — المتبقي القابل للإرجاع: {remaining}
                </option>
              );
            })}
          </select>

          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              className="w-24 rounded border p-2 text-sm"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              placeholder="الكمية"
              data-barcode-ignore="true"
            />
            <input
              className="flex-1 rounded border p-2 text-sm"
              placeholder="سبب الإرجاع"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-barcode-ignore="true"
            />
          </div>

          {createReturn.error && <p className="text-sm text-red-600">{createReturn.error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={createReturn.isLoading || !selectedItemId || reason.length < 2}
              className="rounded bg-orange-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              {createReturn.isLoading ? "جاري الإرجاع..." : "تأكيد الإرجاع"}
            </button>
            <button onClick={onCancel} className="rounded border px-3 py-1 text-sm">
              إلغاء
            </button>
          </div>
        </>
      )}
    </div>
  );
}
