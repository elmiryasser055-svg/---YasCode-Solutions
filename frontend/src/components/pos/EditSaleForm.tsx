// src/components/pos/EditSaleForm.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/ipcClient";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { Plus, Trash2, Loader2, TriangleAlert, CircleAlert, PackageOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface EditableSaleItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface UpdatedSaleResult {
  id: number;
  saleNumber: string;
  discount: number;
  items: EditableSaleItem[];
  total: number;
}

interface Props {
  saleId: number;
  saleNumber: string;
  initialItems: EditableSaleItem[];
  initialDiscount: number;
  onDone: (updatedSale: UpdatedSaleResult) => void;
  onCancel: () => void;
}

export function EditSaleForm({ saleId, saleNumber, initialItems, initialDiscount, onDone, onCancel }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<EditableSaleItem[]>(initialItems);
  const [discount, setDiscount] = useState(initialDiscount);
  const [reason, setReason] = useState(t("editSale.noReason"));
  const [addQuery, setAddQuery] = useState("");

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const total = subtotal - discount;
  const invalidDiscount = discount > subtotal;

  const editSale = useIpcMutation(api().sales.edit, {
    onSuccess: () =>
      onDone({
        id: saleId,
        saleNumber,
        discount,
        items,
        total,
      }),
  });

  function updateQuantity(productId: number, quantity: number) {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
  }

  function removeItem(productId: number) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  async function handleAddProduct() {
    if (!addQuery.trim()) return;
    const result = await api().products.search({ query: addQuery });
    if (!result.ok || result.data.items.length === 0) return;
    const product = result.data.items[0] as any;

    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, unitPrice: product.sellingPrice }];
    });
    setAddQuery("");
  }

  async function handleSubmit() {
    if (items.length === 0 || invalidDiscount) return;
    const finalReason = reason.trim() === "" ? t("editSale.noReason") : reason.trim();
    await editSale.mutate({
      saleId,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      discount,
      reason: finalReason,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="yc-input flex-1"
          placeholder={t("editSale.addPlaceholder")}
          value={addQuery}
          onChange={(e) => setAddQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddProduct()}
          data-barcode-ignore="true"
        />
        <button onClick={handleAddProduct} className="yc-btn-secondary !px-3 !py-2 !text-sm">
          <Plus className="h-4 w-4" strokeWidth={2} />
          {t("editSale.add")}
        </button>
      </div>

      {items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius-md)] py-6 text-center"
          style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
        >
          <PackageOpen className="h-7 w-7" strokeWidth={1.25} />
          <p className="text-sm">{t("editSale.noProducts")}</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.li
                key={item.productId}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm"
                style={{ background: "var(--bg-hover)" }}
              >
                <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{item.name}</span>
                <input
                  type="number"
                  min={0}
                  className="w-16 rounded-[var(--radius-sm)] border p-1 text-center"
                  style={{ borderColor: "var(--border-light)", background: "var(--bg-card)" }}
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                  data-barcode-ignore="true"
                />
                <span className="w-16 text-right font-medium text-[var(--text-primary)]">
                  {(item.unitPrice * item.quantity).toFixed(2)}
                </span>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  title={t("editSale.deleteProduct")}
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-[var(--text-secondary)]">
          {t("editSale.discountLabel")}
          <input
            type="number"
            className="w-20 rounded-[var(--radius-sm)] border p-1"
            style={{
              borderColor: invalidDiscount ? "var(--color-danger-500)" : "var(--border-light)",
              background: "var(--bg-card)",
            }}
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            data-barcode-ignore="true"
          />
        </label>
        <span
          className="font-semibold"
          style={{ color: invalidDiscount ? "var(--color-danger-600)" : "var(--text-primary)" }}
        >
          {t("editSale.newTotal")} {total.toFixed(2)}
        </span>
      </div>

      <AnimatePresence>
        {invalidDiscount && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 overflow-hidden rounded-[var(--radius-sm)] p-2 text-sm"
            style={{ background: "var(--color-danger-50)", color: "var(--color-danger-600)" }}
          >
            <CircleAlert className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
            <span>{t("editSale.invalidDiscount")}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        className="yc-input"
        placeholder={t("editSale.reasonPlaceholder")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        data-barcode-ignore="true"
      />

      <AnimatePresence>
        {editSale.error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 overflow-hidden rounded-[var(--radius-sm)] p-2 text-sm"
            style={{ background: "var(--color-danger-50)", color: "var(--color-danger-600)" }}
          >
            <TriangleAlert className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
            <span>{editSale.error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={editSale.isLoading || items.length === 0 || invalidDiscount}
          className="yc-btn-primary !px-4 !py-1.5 !text-sm"
        >
          {editSale.isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("editSale.saving")}
            </>
          ) : (
            t("editSale.save")
          )}
        </motion.button>
        <button onClick={onCancel} className="yc-btn-secondary !px-3 !py-1.5 !text-sm">
          {t("pos.cancel")}
        </button>
      </div>
    </div>
  );
}