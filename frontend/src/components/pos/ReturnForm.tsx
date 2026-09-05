// src/components/pos/ReturnForm.tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/ipcClient";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { Loader2, TriangleAlert, CircleAlert } from "lucide-react";

interface SaleItemWithId {
  id: number;
  productId: number; // ⭐ أضفنا هذا الحقل لمطابقة المنتج في المتجر
  productNameSnapshot: string;
  quantity: number;
  unitPrice: number;
}

// ⭐ نضيف واجهة لنتيجة الإرجاع لإرسالها للأب
export interface ReturnResult {
  productId: number;
  returnedQty: number;
  unitPrice: number;
}

interface Props {
  saleId: number;
  onDone: (result: ReturnResult) => void; // ⭐ تعديل لتمرير النتيجة
  onCancel: () => void;
}

export function ReturnForm({ saleId, onDone, onCancel }: Props) {
  const [items, setItems] = useState<SaleItemWithId[] | null>(null);
  const [alreadyReturned, setAlreadyReturned] = useState<Record<number, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("لا يوجد سبب");

  // ⭐ تعديل onSuccess لإرسال البيانات بدل استدعاء onDone فارغة
  const createReturn = useIpcMutation(api().returns.create, {
    onSuccess: () => {
      if (selectedItem) {
        onDone({
          productId: selectedItem.productId,
          returnedQty: quantity,
          unitPrice: selectedItem.unitPrice,
        });
      }
    },
  });

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

  const selectedItem = items?.find((i) => i.id === selectedItemId) ?? null;
  const remaining = selectedItem ? remainingFor(selectedItem) : null;
  const exceedsRemaining = remaining !== null && quantity > remaining;

  async function handleSubmit() {
    if (!selectedItemId || quantity <= 0 || exceedsRemaining) return;
    const finalReason = reason.trim() === "" ? "لا يوجد" : reason.trim();
    await createReturn.mutate({ saleItemId: selectedItemId, quantity, reason: finalReason });
  }

  return (
    <div className="space-y-3">
      {loadError && (
        <div
          className="flex items-center gap-2 rounded-[var(--radius-sm)] p-2 text-sm"
          style={{ background: "var(--color-danger-50)", color: "var(--color-danger-600)" }}
        >
          <TriangleAlert className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
          <span>{loadError}</span>
        </div>
      )}

      {!items && !loadError && (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          <span>جاري التحميل...</span>
        </div>
      )}

      {items && (
        <>
          <select
            className="yc-input"
            value={selectedItemId ?? ""}
            onChange={(e) => setSelectedItemId(Number(e.target.value) || null)}
          >
            <option value="">اختر منتجًا...</option>
            {items.map((item) => {
              const rem = remainingFor(item);
              return (
                <option key={item.id} value={item.id} disabled={rem <= 0}>
                  {item.productNameSnapshot} — المتبكي القابل للإرجاع: {rem}
                </option>
              );
            })}
          </select>

          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={remaining ?? undefined}
              className="yc-input w-24"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              placeholder="الكمية"
              data-barcode-ignore="true"
            />
            <input
              className="yc-input flex-1"
              placeholder="سبب الإرجاع"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-barcode-ignore="true"
            />
          </div>

          <AnimatePresence>
            {exceedsRemaining && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 overflow-hidden rounded-[var(--radius-sm)] p-2 text-sm"
                style={{ background: "var(--color-warning-50)", color: "var(--color-warning-600)" }}
              >
                <CircleAlert className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
                <span>الكمية المدخلة أكبر من المتبقي القابل للإرجاع ({remaining})</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {createReturn.error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 overflow-hidden rounded-[var(--radius-sm)] p-2 text-sm"
                style={{ background: "var(--color-danger-50)", color: "var(--color-danger-600)" }}
              >
                <TriangleAlert className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
                <span>{createReturn.error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={createReturn.isLoading || !selectedItemId || exceedsRemaining}
              className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, var(--color-warning-500), var(--color-warning-600))",
                opacity: createReturn.isLoading || !selectedItemId || exceedsRemaining ? 0.5 : 1,
              }}
            >
              {createReturn.isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  جاري الإرجاع...
                </>
              ) : (
                "تأكيد الإرجاع"
              )}
            </motion.button>
            <button onClick={onCancel} className="yc-btn-secondary !px-3 !py-1.5 !text-sm">
              إلغاء
            </button>
          </div>
        </>
      )}
    </div>
  );
}