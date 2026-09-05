// src/components/pos/SaleScreen.tsx
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/ipcClient";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useSound } from "../../hooks/useSound";
import { useCartStore } from "../../store/cartStore";
import { useCashRegisterStore } from "../../store/cashRegisterStore";
import { useIsOwner } from "../../store/authStore";
import { useSalesStore } from "../../store/cartStore";
import { toast } from "../../lib/toast";

import { SearchBar } from "./SearchBar";
import { QuickProducts } from "./QuickProducts";
import { CartPanel } from "./CartPanel";
import { PaymentPanel } from "./PaymentPanel";
import { LastSaleItemsTable } from "./LastSaleItemsTable";
import { EditSaleForm, type EditableSaleItem } from "./EditSaleForm";
import { ReturnForm } from "./ReturnForm";
import { Modal } from "../layout/Modal";

import { Printer, Pencil, RotateCcw, X, Receipt, Wallet, PlusCircle } from "lucide-react";

type ActivePanel = "none" | "cancel" | "edit" | "return" | "reprint";

export type SaleRecord = {
  id: number;
  saleNumber: string;
  total: number;
  discount: number;
  items: EditableSaleItem[];
};

export function SaleScreen() {
  const { t } = useTranslation();
  const isOwner = useIsOwner();
  const cart = useCartStore();
  const openSessionId = useCashRegisterStore((s) => s.openSessionId);
  const { playSuccess, playError, playScan } = useSound();

  const recentSales = useSalesStore((s) => s.recentSales);
  const addRecentSale = useSalesStore((s) => s.addRecentSale);
  const updateRecentSale = useSalesStore((s) => s.updateRecentSale);
  const removeRecentSale = useSalesStore((s) => s.removeRecentSale);
  const updateRecentSaleAfterReturn = useSalesStore((s) => s.updateRecentSaleAfterReturn);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>("none");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // ⭐ حالة نافذة السعر الحر
  const [isCustomPriceModalOpen, setIsCustomPriceModalOpen] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");

  const [cancelReason, setCancelReason] = useState("لا يوجد سبب");
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const [reprinting, setReprinting] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState("");

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const result = await api().products.search({ query, page: 1, pageSize: 8 });
        if (!cancelled) {
          setSearchResults(result.ok ? result.data.items ?? [] : []);
        }
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const addProductToCart = useCallback(
    async (query: string, isBarcode = false) => {
      setScanError(null);
      try {
        const results = await api().products.search({ query, page: 1, pageSize: 5 });
        if (!results.ok || results.data.items.length === 0) {
          setScanError(isBarcode ? `لم يُعثر على منتج بالباركود: ${query}` : `لا نتائج لـ: ${query}`);
          playError();
          return;
        }
        const product = results.data.items[0] as any;
        cart.addItem({
          productId: product.id,
          name: product.name,
          barcode: product.barcode,
          unitType: product.unitType,
          sellingPrice: product.sellingPrice,
        });
        playScan();
        setSearchQuery("");
      } catch {
        setScanError("تعذّر البحث عن المنتج، حاول مجددًا.");
        playError();
      }
    },
    [cart, playScan, playError]
  );

  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      setSearchResults([]);
      await addProductToCart(barcode, true);
    },
    [addProductToCart]
  );

  const selectSearchResult = useCallback(
    (product: any) => {
      cart.addItem({
        productId: product.id,
        name: product.name,
        barcode: product.barcode,
        unitType: product.unitType,
        sellingPrice: product.sellingPrice,
      });
      playScan();
      setSearchQuery("");
      setSearchResults([]);
    },
    [cart, playScan]
  );

  useBarcodeScanner({ onScan: handleBarcodeScan, enabled: activePanel === "none" && !isPaymentModalOpen && !isCustomPriceModalOpen });

  const createSale = useIpcMutation(api().sales.create, {
    onSuccess: async (sale: any) => {
      cart.clear();
      setReceivedAmount("");
      setIsPaymentModalOpen(false);

      const record: SaleRecord = {
        id: sale.id,
        saleNumber: sale.saleNumber,
        total: sale.total,
        discount: sale.discount,
        items: sale.items.map((i: any) => ({
          productId: i.productId,
          name: i.productNameSnapshot,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      };

      addRecentSale(record);
      setSelectedSale(record);
      setActivePanel("none");
      playSuccess();
      toast.success(`تم البيع بنجاح — ${sale.saleNumber}`);

      setPrintStatus("جاري الطباعة...");
      try {
        const result = await api().printing.printSaleTicket({ saleId: sale.id });
        if (result.ok) {
          setPrintStatus("تمت الطباعة");
          toast.info("تمت طباعة التذكرة");
        } else {
          setPrintStatus(`تعذّرت الطباعة: ${result.error}`);
          toast.error("تعذّرت الطباعة");
        }
      } catch {
        setPrintStatus("تعذّرت الطباعة — تحقق من الطابعة.");
        toast.error("تعذّرت الطباعة");
      }
    },
    onError: (msg) => {
      playError();
      toast.error(msg);
    },
  });

  const cancelSale = useIpcMutation(api().sales.cancel, {
    onSuccess: () => {
      setActivePanel("none");
      setCancelReason("لا يوجد سبب");
      if (selectedSale) {
        removeRecentSale(selectedSale.id);
        setSelectedSale(null);
      }
      toast.info("تم إلغاء البيع");
    },
    onError: (msg) => {
      playError();
      toast.error(msg);
    },
  });

  // ⭐ دالة إتمام البيع المحدثة لدعم السعر الحر
  async function handleCompleteSale() {
    if (!openSessionId) {
      setScanError("لا توجد جلسة صندوق مفتوحة.");
      playError();
      toast.error("افتح جلسة صندوق أولاً");
      return;
    }
    if (cart.items.length === 0) {
      toast.error("السلة فارغة");
      return;
    }

    // تجهيز البيانات: إذا كان productId = 0 نرسله كسعر حر
    const payloadItems = cart.items.map((i) => {
      if (i.productId === 0) {
        return { customName: i.name, customPrice: i.sellingPrice, quantity: i.quantity };
      }
      return { productId: i.productId, quantity: i.quantity };
    });

    await createSale.mutate({
      items: payloadItems as any, // تجاوز فحص الأنواع المؤقت لتمرير الحقول الجديدة
      discount: cart.discount,
      cashRegisterSessionId: openSessionId,
    });
  }

  async function handleReprint(saleId: number) {
    setReprinting(true);
    setPrintStatus("جاري إعادة الطباعة...");
    try {
      const result = await api().printing.printSaleTicket({ saleId });
      if (result.ok) {
        setPrintStatus("تمت إعادة الطباعة");
        toast.info("تمت إعادة الطباعة");
      } else {
        setPrintStatus(`تعذّرت الطباعة: ${result.error}`);
        toast.error("تعذّرت إعادة الطباعة");
      }
    } catch {
      setPrintStatus("تعذّرت الطباعة — تحقق من الطابعة.");
      toast.error("تعذّرت إعادة الطباعة");
    } finally {
      setReprinting(false);
    }
  }

  // ⭐ دالة إضافة السعر الحر للسلة
  const handleAddCustomPrice = useCallback(() => {
    const amount = Number(customPrice);
    const qty = Number(customQty) || 1;

    if (isNaN(amount) || amount <= 0) {
      toast.error("أدخل مبلغاً صحيحاً");
      return;
    }

    cart.addItem({
      productId: 0, // 0 يدل على أنه سعر حر
      name: "سعر حر / إضافة يدوية",
      barcode: null,
      unitType: "piece",
      sellingPrice: amount,
    }, qty);

    playScan();
    setCustomPrice("");
    setCustomQty("1");
    setIsCustomPriceModalOpen(false);
  }, [cart, customPrice, customQty, playScan]);

  useKeyboardShortcuts(
    {
      F2: () => document.querySelector<HTMLInputElement>('input[data-barcode-ignore="true"]')?.focus(),
      F3: () => setIsCustomPriceModalOpen(true), // ⭐ اختصار فتح نافذة السعر الحر
      F4: () => {
        if (cart.items.length > 0 && openSessionId) {
          setIsPaymentModalOpen(true);
        }
      },
      Escape: () => {
        if (isPaymentModalOpen) setIsPaymentModalOpen(false);
        else if (isCustomPriceModalOpen) setIsCustomPriceModalOpen(false);
        else if (activePanel !== "none") setActivePanel("none");
        else {
          cart.clear();
          setReceivedAmount("");
          setSearchQuery("");
        }
      },
    },
    true
  );

  const handleQuickAdd = useCallback(
    (product: { id: number; name: string; barcode: string | null; unitType: "piece" | "weight"; sellingPrice: number }) => {
      cart.addItem({ ...product, productId: product.id });
      playScan();
    },
    [cart, playScan]
  );

  const totalValue = cart.total();
  const receivedNum = receivedAmount.trim() === "" ? null : Number(receivedAmount);
  const insufficient = receivedNum !== null && receivedNum < totalValue;

  const openAction = (sale: SaleRecord, panel: ActivePanel) => {
    setSelectedSale(sale);
    setActivePanel(panel);
  };

  return (
    <div className="flex h-full gap-4 p-2" dir="rtl">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-2">
        <div className="flex gap-2">
          <div className="flex-1 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
            <SearchBar
              query={searchQuery}
              onQueryChange={setSearchQuery}
              onSelect={selectSearchResult}
              onAddByQuery={(q) => addProductToCart(q, false)}
              results={searchResults}
              loading={searchLoading}
              error={scanError}
            />
          </div>
          <button
            onClick={() => setIsCustomPriceModalOpen(true)}
            className="flex w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-[var(--color-primary-200)] bg-gradient-to-br from-[var(--color-primary-50)] to-white text-[var(--color-primary-700)] shadow-sm transition-all hover:shadow-md"
            title="إضافة سعر حر (F3)"
          >
            <PlusCircle className="h-6 w-6" strokeWidth={2} />
          </button>
        </div>

        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-sm)]">
          <QuickProducts onAdd={handleQuickAdd} />
        </div>

        <AnimatePresence>
          {recentSales.map((sale) => (
            <motion.div
              key={sale.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="group relative"
            >
              <LastSaleItemsTable
                saleNumber={sale.saleNumber}
                total={sale.total}
                discount={sale.discount}
                items={sale.items}
              />

              <div className="pointer-events-none absolute inset-x-0 -bottom-3 flex translate-y-1 flex-wrap items-center justify-center gap-2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)]/95 p-2 shadow-lg backdrop-blur-sm">
                  <button
                    onClick={() => {
                      setPrintStatus(null);
                      openAction(sale, "reprint");
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] shadow-sm transition-all hover:border-[var(--color-primary-300)] hover:text-[var(--color-primary-700)]"
                  >
                    <Printer className="h-4 w-4" strokeWidth={2} />
                    {t("pos.reprintTicket")}
                  </button>

                  {isOwner && (
                    <>
                      <button
                        onClick={() => openAction(sale, "edit")}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--color-primary-200)] bg-gradient-to-r from-[var(--color-primary-50)] to-white px-3 py-2 text-xs font-bold text-[var(--color-primary-700)] shadow-sm transition-all hover:shadow-md"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={2} />
                        تعديل
                      </button>

                      <button
                        onClick={() => openAction(sale, "return")}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--color-warning-200)] bg-gradient-to-r from-[var(--color-warning-50)] to-white px-3 py-2 text-xs font-bold text-[var(--color-warning-700)] shadow-sm transition-all hover:shadow-md"
                      >
                        <RotateCcw className="h-4 w-4" strokeWidth={2} />
                        إرجاع
                      </button>

                      <button
                        onClick={() => {
                          setCancelReason("لا يوجد سبب");
                          openAction(sale, "cancel");
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--color-danger-200)] bg-gradient-to-r from-[var(--color-danger-50)] to-white px-3 py-2 text-xs font-bold text-[var(--color-danger-700)] shadow-sm transition-all hover:shadow-md"
                      >
                        <X className="h-4 w-4" strokeWidth={2} />
                        إلغاء
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="h-6" aria-hidden />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex w-[480px] flex-col gap-3">
        <div className="min-h-0 flex-1 overflow-hidden">
          <CartPanel
            items={cart.items}
            discount={cart.discount}
            onUpdateQuantity={cart.updateQuantity}
            onRemove={cart.removeItem}
            onSetDiscount={cart.setDiscount}
            subtotal={cart.subtotal()}
            total={totalValue}
          />
        </div>

        <div className="flex flex-shrink-0 items-center gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-sm)]">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-[var(--text-muted)]">الإجمالي المطلوب</span>
            <span className="text-2xl font-black tabular-nums text-[var(--color-primary-700)]">
              {totalValue.toFixed(2)} د.ج
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsPaymentModalOpen(true)}
            disabled={cart.items.length === 0 || !openSessionId}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-base font-bold text-white shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: (cart.items.length === 0 || !openSessionId)
                ? "var(--text-muted)"
                : "linear-gradient(135deg, var(--color-success-500), var(--color-success-600))",
            }}
          >
            <Wallet className="h-5 w-5" strokeWidth={2.5} />
            {openSessionId ? "إتمام الدفع (F4)" : "افتح الصندوق أولاً"}
          </motion.button>
        </div>
      </div>

      {/* ⭐ نافذة إضافة سعر حر */}
      <Modal
        isOpen={isCustomPriceModalOpen}
        onClose={() => setIsCustomPriceModalOpen(false)}
        title="إضافة سعر حر"
        icon={PlusCircle}
        accent="primary"
      >
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">المبلغ (د.ج)</label>
              <input
                type="number"
                autoFocus
                min={0}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomPrice()}
                className="yc-input w-full text-lg font-bold"
                placeholder="0.00"
                data-barcode-ignore="true"
              />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">الكمية</label>
              <input
                type="number"
                min={1}
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomPrice()}
                className="yc-input w-full text-center"
                data-barcode-ignore="true"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddCustomPrice}
              className="yc-btn-primary flex-1 !py-2.5 !text-sm"
            >
              إضافة للسلة
            </button>
            <button
              onClick={() => setIsCustomPriceModalOpen(false)}
              className="yc-btn-secondary !px-5 !py-2.5 !text-sm"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      {/* نافذة الدفع */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="إتمام عملية الدفع"
        icon={Wallet}
        accent="primary"
      >
        <PaymentPanel
          total={totalValue}
          receivedAmount={receivedAmount}
          onReceivedChange={setReceivedAmount}
          onComplete={handleCompleteSale}
          isLoading={createSale.isLoading}
          disabled={cart.items.length === 0 || !openSessionId || insufficient === true}
          openSessionId={openSessionId}
        />
      </Modal>

      {/* نافذة إعادة الطباعة */}
      <Modal
        isOpen={activePanel === "reprint"}
        onClose={() => setActivePanel("none")}
        title={selectedSale ? `إعادة طباعة الفاتورة #${selectedSale.saleNumber}` : "إعادة طباعة"}
        icon={Printer}
        accent="primary"
      >
        {selectedSale && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">هل تريد إعادة طباعة تذكرة هذه الفاتورة؟</p>
            {printStatus && (
              <p className="text-sm font-semibold text-[var(--color-primary-700)]">{printStatus}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await handleReprint(selectedSale.id);
                  setActivePanel("none");
                }}
                disabled={reprinting}
                className="yc-btn-primary !px-4 !py-2 !text-sm"
              >
                {reprinting ? "جاري إعادة الطباعة..." : "تأكيد إعادة الطباعة"}
              </button>
              <button onClick={() => setActivePanel("none")} className="yc-btn-secondary !px-4 !py-2 !text-sm">
                إلغاء
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* نافذة إلغاء الفاتورة */}
      <Modal
        isOpen={activePanel === "cancel"}
        onClose={() => setActivePanel("none")}
        title={selectedSale ? `إلغاء الفاتورة #${selectedSale.saleNumber}` : "إلغاء الفاتورة"}
        icon={Receipt}
        accent="danger"
      >
        {selectedSale && (
          <div className="space-y-3">
            <input
              className="yc-input w-full"
              placeholder="سبب الإلغاء (اختياري)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              data-barcode-ignore="true"
            />
            {cancelSale.error && <p className="text-sm text-[var(--color-danger-600)]">{cancelSale.error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() =>
                  cancelSale.mutate({
                    saleId: selectedSale.id,
                    reason: cancelReason.trim() || "لا يوجد سبب",
                  })
                }
                disabled={cancelSale.isLoading}
                className="yc-btn-danger !px-5 !py-2.5 !text-sm"
              >
                {cancelSale.isLoading ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
              </button>
              <button onClick={() => setActivePanel("none")} className="yc-btn-secondary !px-5 !py-2.5 !text-sm">
                إلغاء
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* نافذة تعديل الفاتورة */}
      <Modal
        isOpen={activePanel === "edit"}
        onClose={() => setActivePanel("none")}
        title={selectedSale ? `تعديل الفاتورة #${selectedSale.saleNumber}` : "تعديل الفاتورة"}
        icon={Pencil}
        accent="primary"
      >
        {selectedSale && (
          <EditSaleForm
            saleId={selectedSale.id}
            saleNumber={selectedSale.saleNumber}
            initialItems={selectedSale.items}
            initialDiscount={selectedSale.discount}
            onDone={(updatedSale) => {
              setActivePanel("none");
              updateRecentSale(updatedSale);
              setSelectedSale(updatedSale);
              toast.success("تم تعديل الفاتورة");
            }}
            onCancel={() => setActivePanel("none")}
          />
        )}
      </Modal>

      {/* نافذة إرجاع منتج */}
      <Modal
        isOpen={activePanel === "return"}
        onClose={() => setActivePanel("none")}
        title={selectedSale ? `إرجاع منتج — الفاتورة #${selectedSale.saleNumber}` : "إرجاع منتج"}
        icon={RotateCcw}
        accent="warning"
      >
        {selectedSale && (
          <ReturnForm
            saleId={selectedSale.id}
            onDone={(result) => {
              setActivePanel("none");
              updateRecentSaleAfterReturn(selectedSale.id, result);
              toast.success("تم الإرجاع بنجاح");
            }}
            onCancel={() => setActivePanel("none")}
          />
        )}
      </Modal>
    </div>
  );
}