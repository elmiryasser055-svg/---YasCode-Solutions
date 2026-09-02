// src/components/pos/SaleScreen.tsx
//
// محدَّث لسدّ فجوات: (1) طباعة فعلية بعد البيع، (2) إلغاء/إعادة طباعة من نفس
// الشاشة، (3) اختصارات لوحة مفاتيح، (4) ⭐ تعديل فاتورة كاملة، (5) ⭐ إرجاع
// جزئي لمنتج واحد.

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/ipcClient";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useCartStore } from "../../store/cartStore";
import { useCashRegisterStore } from "../../store/cashRegisterStore";
import { useIsOwner } from "../../store/authStore";
import { EditSaleForm, type EditableSaleItem } from "./EditSaleForm";
import { ReturnForm } from "./ReturnForm";

interface LastSale {
  id: number;
  saleNumber: string;
  total: number;
  discount: number;
  items: EditableSaleItem[];
}

type ActivePanel = "none" | "cancel" | "edit" | "return";

export function SaleScreen() {
  const { t } = useTranslation();
  const isOwner = useIsOwner();
  const { items, discount, addItem, updateQuantity, removeItem, subtotal, total, clear } =
    useCartStore();
  const openSessionId = useCashRegisterStore((s) => s.openSessionId);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<LastSale | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [activePanel, setActivePanel] = useState<ActivePanel>("none");
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  async function handleBarcodeScan(barcode: string) {
    setScanError(null);
    try {
      const results = await api().products.search({ query: barcode });
      if (!results.ok || results.data.items.length === 0) {
        setScanError(`لم يُعثر على منتج بالباركود: ${barcode}`);
        return;
      }
      const product = results.data.items[0] as any;
      addItem({
        productId: product.id,
        name: product.name,
        barcode: product.barcode,
        unitType: product.unitType,
        sellingPrice: product.sellingPrice,
      });
    } catch {
      setScanError("تعذّر البحث عن المنتج، حاول مجددًا.");
    }
  }

  // تعطيل معالج الباركود العام أثناء فتح أي لوحة حتى لا يتعارض معها
  useBarcodeScanner({ onScan: handleBarcodeScan, enabled: activePanel === "none" });

  const createSale = useIpcMutation(api().sales.create, {
    onSuccess: async (sale: any) => {
      clear();
      setLastSale({
        id: sale.id,
        saleNumber: sale.saleNumber,
        total: sale.total,
        discount: sale.discount,
        // ⭐ نحتفظ بالبنود هنا (اسم/كمية/سعر) لاستخدامها لاحقًا في EditSaleForm
        // دون أي استدعاء إضافي — sales.editSale لا يحتاج معرّف sale_item إطلاقًا
        items: sale.items.map((i: any) => ({
          productId: i.productId,
          name: i.productNameSnapshot,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
      setActivePanel("none");
      // ⭐ طباعة تلقائية بعد نجاح البيع فعليًا في القاعدة — منفصلة تمامًا عن
      // transaction البيع نفسه: فشل الطباعة هنا لا يعني فشل البيع.
      setPrintStatus("جاري الطباعة...");
      try {
        const result = await api().printing.printSaleTicket({ saleId: sale.id });
        setPrintStatus(result.ok ? "تمت الطباعة ✓" : `تعذّرت الطباعة: ${result.error}`);
      } catch {
        setPrintStatus("تعذّرت الطباعة — تحقق من اتصال الطابعة.");
      }
    },
  });

  const cancelSale = useIpcMutation(api().sales.cancel, {
    onSuccess: () => {
      setActivePanel("none");
      setCancelReason("");
      setLastSale(null);
    },
  });

  async function handleCompleteSale() {
    if (!openSessionId) {
      setScanError("لا توجد جلسة صندوق مفتوحة. الرجاء فتح جلسة أولاً.");
      return;
    }
    if (items.length === 0) return;
    await createSale.mutate({
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      discount,
      cashRegisterSessionId: openSessionId,
    });
  }

  async function handleReprint() {
    if (!lastSale) return;
    setPrintStatus("جاري إعادة الطباعة...");
    const result = await api().printing.printSaleTicket({ saleId: lastSale.id });
    setPrintStatus(result.ok ? "تمت إعادة الطباعة ✓" : `تعذّرت الطباعة: ${result.error}`);
  }

  // ⭐ اختصارات لوحة المفاتيح
  useKeyboardShortcuts(
    {
      F2: () => searchInputRef.current?.focus(),
      F4: () => handleCompleteSale(),
      Escape: () => {
        if (activePanel !== "none") setActivePanel("none");
        else clear();
      },
    },
    true
  );

  return (
    <div className="flex h-full gap-4 p-4" dir="auto">
      <div className="flex-1">
        <input
          ref={searchInputRef}
          className="w-full rounded-md border p-3"
          placeholder={t("pos.searchPlaceholder") ?? ""}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-barcode-ignore="true"
        />
        <p className="mt-1 text-xs text-gray-400">
          F2: التركيز على البحث · F4: إتمام البيع · Esc: تفريغ السلة
        </p>
        {scanError && <p className="mt-2 text-sm text-red-600">{scanError}</p>}

        {/* بطاقة آخر عملية بيع: طباعة/إعادة طباعة/إلغاء/تعديل/إرجاع بدون مغادرة الشاشة */}
        {lastSale && (
          <div className="mt-4 rounded-lg border bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">آخر عملية بيع: #{lastSale.saleNumber}</p>
                <p className="text-sm text-gray-500">الإجمالي: {lastSale.total.toFixed(2)}</p>
                {printStatus && <p className="text-xs text-gray-500">{printStatus}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleReprint} className="rounded border px-3 py-1 text-sm">
                  {t("pos.reprintTicket")}
                </button>
                {isOwner && (
                  <>
                    <button
                      onClick={() => setActivePanel("edit")}
                      className="rounded border border-blue-500 px-3 py-1 text-sm text-blue-600"
                    >
                      تعديل الفاتورة
                    </button>
                    <button
                      onClick={() => setActivePanel("return")}
                      className="rounded border border-orange-500 px-3 py-1 text-sm text-orange-600"
                    >
                      إرجاع منتج
                    </button>
                    <button
                      onClick={() => setActivePanel("cancel")}
                      className="rounded border border-red-500 px-3 py-1 text-sm text-red-600"
                    >
                      {t("pos.cancelSale")}
                    </button>
                  </>
                )}
              </div>
            </div>

            {activePanel === "cancel" && (
              <div className="mt-3 space-y-2 border-t pt-3">
                <input
                  className="w-full rounded border p-2 text-sm"
                  placeholder="سبب الإلغاء (إلزامي)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  data-barcode-ignore="true"
                />
                {cancelSale.error && <p className="text-sm text-red-600">{cancelSale.error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => cancelSale.mutate({ saleId: lastSale.id, reason: cancelReason })}
                    disabled={cancelSale.isLoading || cancelReason.length < 3}
                    className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
                  >
                    تأكيد الإلغاء
                  </button>
                  <button
                    onClick={() => setActivePanel("none")}
                    className="rounded border px-3 py-1 text-sm"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            )}

            {activePanel === "edit" && (
              <EditSaleForm
                saleId={lastSale.id}
                initialItems={lastSale.items}
                initialDiscount={lastSale.discount}
                onDone={() => {
                  setActivePanel("none");
                  setLastSale(null); // البيانات المحلية أصبحت قديمة بعد التعديل — أبسط حل هو إخفاء البطاقة
                }}
                onCancel={() => setActivePanel("none")}
              />
            )}

            {activePanel === "return" && (
              <ReturnForm
                saleId={lastSale.id}
                onDone={() => setActivePanel("none")}
                onCancel={() => setActivePanel("none")}
              />
            )}
          </div>
        )}
      </div>

      <aside className="w-96 rounded-lg border p-4">
        <h2 className="mb-3 font-semibold">{t("pos.cart")}</h2>

        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.productId} className="flex items-center justify-between text-sm">
              <span>{item.name}</span>
              <input
                type="number"
                className="w-16 rounded border p-1 text-center"
                value={item.quantity}
                onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                data-barcode-ignore="true"
              />
              <span>{(item.sellingPrice * item.quantity).toFixed(2)}</span>
              <button onClick={() => removeItem(item.productId)} className="text-red-500">
                ×
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span>{t("pos.subtotal")}</span>
            <span>{subtotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>{t("pos.total")}</span>
            <span>{total().toFixed(2)}</span>
          </div>
        </div>

        {createSale.error && <p className="mt-2 text-sm text-red-600">{createSale.error}</p>}

        <button
          onClick={handleCompleteSale}
          disabled={createSale.isLoading || items.length === 0}
          className="mt-4 w-full rounded-md bg-green-600 py-3 font-semibold text-white disabled:opacity-50"
        >
          {createSale.isLoading ? t("common.loading") : `${t("pos.completeSale")} (F4)`}
        </button>
      </aside>
    </div>
  );
}
