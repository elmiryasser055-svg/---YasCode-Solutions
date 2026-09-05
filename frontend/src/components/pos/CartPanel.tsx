// src/components/pos/CartPanel.tsx
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Trash2, ShoppingCart, Weight, Package } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface CartItem {
  productId: number;
  name: string;
  barcode: string | null;
  unitType: "piece" | "weight";
  sellingPrice: number;
  quantity: number;
}

interface Props {
  items: CartItem[];
  discount: number;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
  onSetDiscount: (discount: number) => void;
  subtotal: number;
  total: number;
}

export const CartPanel = memo(function CartPanel({
  items,
  discount,
  onUpdateQuantity,
  onRemove,
  onSetDiscount,
  subtotal,
  total,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-sm)]">
      {/* Header - ⭐ أضفنا flex-shrink-0 حتى لا يتغير ارتفاعه */}
      <div className="flex-shrink-0 bg-gradient-to-br from-[var(--color-primary-600)] to-[var(--color-primary-700)] p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <ShoppingCart className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t("pos.cart")}</h2>
              <p className="text-xs text-white/80">
                {items.length} {items.length === 1 ? "منتج" : "منتجات"}
              </p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-xs text-white/70">الإجمالي</p>
            <motion.p
              key={total.toFixed(2)}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-black tabular-nums"
            >
              {total.toFixed(2)}
            </motion.p>
          </div>
        </div>
      </div>

      {/* Items List - ⭐ تأخذ كل المساحة المتبقية وتتمرر */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full flex-col items-center justify-center gap-3 text-[var(--text-muted)]"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--bg-hover)]">
                <ShoppingCart className="h-10 w-10 opacity-40" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium">السلة فارغة</p>
              <p className="text-xs">امسح الباركود أو اختر منتجًا سريعًا</p>
            </motion.div>
          ) : (
            items.map((item) => {
              const lineTotal = item.sellingPrice * item.quantity;
              return (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0, padding: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className="mb-2 overflow-hidden rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-sm transition-colors hover:border-[var(--color-primary-200)]"
                >
                  {/* القسم العلوي: معلومات المنتج */}
                  <div className="flex items-start justify-between gap-2 p-2.5 pb-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-[var(--text-primary)]">
                        {item.name}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-[var(--text-muted)]">
                        <span className="flex items-center gap-1 rounded-md bg-[var(--bg-hover)] px-1.5 py-0.5">
                          {item.unitType === "weight" ? (
                            <Weight className="h-3 w-3" />
                          ) : (
                            <Package className="h-3 w-3" />
                          )}
                          {item.unitType === "weight" ? "وزن" : "قطعة"}
                        </span>
                        <span className="tabular-nums">{item.sellingPrice.toFixed(2)} د.ج / وحدة</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemove(item.productId)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--color-danger-50)] hover:text-[var(--color-danger-500)]"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>

                  {/* القسم السفلي: الكمية والإجمالي */}
                  <div className="flex items-center justify-between border-t border-dashed border-[var(--border-light)] bg-[var(--bg-hover)] px-2.5 py-1.5">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1.5">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors hover:border-[var(--color-danger-300)] hover:bg-[var(--color-danger-50)] hover:text-[var(--color-danger-600)]"
                      >
                        <Minus className="h-4 w-4" strokeWidth={2.5} />
                      </motion.button>

                      <input
                        type="number"
                        min={1}
                        step={item.unitType === "weight" ? 0.01 : 1}
                        value={item.quantity}
                        onChange={(e) => onUpdateQuantity(item.productId, Number(e.target.value))}
                        className="h-8 w-16 rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] text-center text-base font-bold text-[var(--text-primary)] outline-none focus:border-[var(--color-primary-400)]"
                        data-barcode-ignore="true"
                      />

                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors hover:border-[var(--color-success-300)] hover:bg-[var(--color-success-50)] hover:text-[var(--color-success-600)]"
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                      </motion.button>
                    </div>

                    {/* Line Total */}
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-medium text-[var(--text-muted)]">الإجمالي</span>
                      <motion.p
                        key={lineTotal.toFixed(2)}
                        initial={{ scale: 1.1, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-base font-black tabular-nums text-[var(--color-primary-700)]"
                      >
                        {lineTotal.toFixed(2)}
                      </motion.p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Summary - ⭐ أضفنا flex-shrink-0 حتى لا يختفي أو يضغط */}
      <div className="flex-shrink-0 border-t border-[var(--border-light)] bg-[var(--bg-hover)] p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <span>{t("pos.subtotal")}</span>
            <span className="font-medium tabular-nums">{subtotal.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <span>{t("pos.discount")}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={subtotal}
                value={discount}
                onChange={(e) => onSetDiscount(Number(e.target.value))}
                className="w-20 rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] p-1 text-right text-sm font-semibold outline-none focus:border-[var(--color-primary-400)]"
                data-barcode-ignore="true"
              />
              <button
                onClick={() => onSetDiscount(0)}
                className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--color-danger-500)]"
              >
                إلغاء
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-2">
            <span className="text-base font-bold text-[var(--text-primary)]">{t("pos.total")}</span>
            <motion.span
              key={total.toFixed(2)}
              initial={{ scale: 1.15, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-black tabular-nums text-[var(--color-primary-700)]"
            >
              {total.toFixed(2)}
            </motion.span>
          </div>
        </div>
      </div>
    </div>
  );
});