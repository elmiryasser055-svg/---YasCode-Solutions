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
  
  const [isCustomPriceModalOpen, setIsCustomPriceModalOpen] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");

  const [cancelReason, setCancelReason] = useState(t("editSale.noReason"));
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
          setScanError(isBarcode ? `${t("saleScreen.notFoundBarcode")} ${query}` : `${t("saleScreen.noResultsFor")} ${query}`);
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
        setScanError(t("saleScreen.searchError"));
        playError();
      }
    },
    [cart, playScan, playError, t]
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
      toast.success(`${t("saleScreen.saleSuccess")} ${sale.saleNumber}`);

      setPrintStatus(t("saleScreen.printing"));
      try {
        const result = await api().printing.printSaleTicket({ saleId: sale.id });
        if (result.ok) {
          setPrintStatus(t("saleScreen.printed"));
          toast.info(t("saleScreen.ticketPrinted"));
        } else {
          setPrintStatus(`${t("saleScreen.printFailed")} ${result.error}`);
          toast.error(t("saleScreen.printError"));
        }
      } catch {
        setPrintStatus(t("saleScreen.printError"));
        toast.error(t("saleScreen.printError"));
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
      setCancelReason(t("editSale.noReason"));
      if (selectedSale) {
        removeRecentSale(selectedSale.id);
        setSelectedSale(null);
      }
      toast.info(t("saleScreen.canceled"));
    },
    onError: (msg) => {
      playError();
      toast.error(msg);
    },
  });

  async function handleCompleteSale() {
    if (!openSessionId) {
      setScanError(t("saleScreen.noOpenSession"));
      playError();
      toast.error(t("saleScreen.openRegisterFirst"));
      return;
    }
    if (cart.items.length === 0) {
      toast.error(t("saleScreen.cartEmpty"));
      return;
    }

    const payloadItems = cart.items.map((i) => {
      if (i.productId === 0) {
        return { customName: i.name, customPrice: i.sellingPrice, quantity: i.quantity };
      }
      return { productId: i.productId, quantity: i.quantity };
    });

    await createSale.mutate({
      items: payloadItems as any,
      discount: cart.discount,
      cashRegisterSessionId: openSessionId,
    });
  }

  async function handleReprint(saleId: number) {
    setReprinting(true);
    setPrintStatus(t("saleScreen.reprinting"));
    try {
      const result = await api().printing.printSaleTicket({ saleId });
      if (result.ok) {
        setPrintStatus(t("saleScreen.reprinted"));
        toast.info(t("saleScreen.reprinted"));
      } else {
        setPrintStatus(`${t("saleScreen.printFailed")} ${result.error}`);
        toast.error(t("saleScreen.reprintFailed"));
      }
    } catch {
      setPrintStatus(t("saleScreen.printError"));
      toast.error(t("saleScreen.reprintFailed"));
    } finally {
      setReprinting(false);
    }
  }

  const handleAddCustomPrice = useCallback(() => {
    const amount = Number(customPrice);
    const qty = Number(customQty) || 1;

    if (isNaN(amount) || amount <= 0) {
      toast.error(t("saleScreen.invalidAmount"));
      return;
    }

    cart.addItem({
      productId: 0,
      name: t("saleScreen.customPriceName"),
      barcode: null,
      unitType: "piece",
      sellingPrice: amount,
    }, qty);

    playScan();
    setCustomPrice("");
    setCustomQty("1");
    setIsCustomPriceModalOpen(false);
  }, [cart, customPrice, customQty, playScan, t]);

  useKeyboardShortcuts(
    {
      F2: () => document.querySelector<HTMLInputElement>('input[data-barcode-ignore="true"]')?.focus(),
      F3: () => setIsCustomPriceModalOpen(true),
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
            title={`${t("saleScreen.addCustomPrice")} (F3)`}
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
                        {t("saleScreen.edit")}
                      </button>

                      <button
                        onClick={() => openAction(sale, "return")}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--color-warning-200)] bg-gradient-to-r from-[var(--color-warning-50)] to-white px-3 py-2 text-xs font-bold text-[var(--color-warning-700)] shadow-sm transition-all hover:shadow-md"
                      >
                        <RotateCcw className="h-4 w-4" strokeWidth={2} />
                        {t("saleScreen.return")}
                      </button>

                      <button
                        onClick={() => {
                          setCancelReason(t("editSale.noReason"));
                          openAction(sale, "cancel");
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-[var(--color-danger-200)] bg-gradient-to-r from-[var(--color-danger-50)] to-white px-3 py-2 text-xs font-bold text-[var(--color-danger-700)] shadow-sm transition-all hover:shadow-md"
                      >
                        <X className="h-4 w-4" strokeWidth={2} />
                        {t("pos.cancel")}
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
            <span className="text-[10px] font-medium text-[var(--text-muted)]">{t("saleScreen.requiredTotal")}</span>
            <span className="text-2xl font-black tabular-nums text-[var(--color-primary-700)]">
              {totalValue.toFixed(2)} {t("paymentPanel.currency")}
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
            {openSessionId ? t("saleScreen.completePayment") : t("saleScreen.openRegister")}
          </motion.button>
        </div>
      </div>

      <Modal
        isOpen={isCustomPriceModalOpen}
        onClose={() => setIsCustomPriceModalOpen(false)}
        title={t("saleScreen.addCustomPrice")}
        icon={PlusCircle}
        accent="primary"
      >
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">{t("saleScreen.amount")}</label>
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
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">{t("saleScreen.qty")}</label>
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
              {t("saleScreen.addToCart")}
            </button>
            <button
              onClick={() => setIsCustomPriceModalOpen(false)}
              className="yc-btn-secondary !px-5 !py-2.5 !text-sm"
            >
              {t("pos.cancel")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={t("saleScreen.completePaymentTitle")}
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

      <Modal
        isOpen={activePanel === "reprint"}
        onClose={() => setActivePanel("none")}
        title={selectedSale ? `${t("saleScreen.reprintInvoiceTitle")}${selectedSale.saleNumber}` : t("saleScreen.reprintTitle")}
        icon={Printer}
        accent="primary"
      >
        {selectedSale && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">{t("saleScreen.reprintConfirm")}</p>
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
                {reprinting ? t("saleScreen.reprinting") : t("saleScreen.confirmReprint")}
              </button>
              <button onClick={() => setActivePanel("none")} className="yc-btn-secondary !px-4 !py-2 !text-sm">
                {t("pos.cancel")}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={activePanel === "cancel"}
        onClose={() => setActivePanel("none")}
        title={selectedSale ? `${t("saleScreen.cancelInvoiceTitle")}${selectedSale.saleNumber}` : t("saleScreen.cancelInvoice")}
        icon={Receipt}
        accent="danger"
      >
        {selectedSale && (
          <div className="space-y-3">
            <input
              className="yc-input w-full"
              placeholder={t("saleScreen.cancelReasonPlaceholder")}
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
                    reason: cancelReason.trim() || t("editSale.noReason"),
                  })
                }
                disabled={cancelSale.isLoading}
                className="yc-btn-danger !px-5 !py-2.5 !text-sm"
              >
                {cancelSale.isLoading ? t("saleScreen.canceling") : t("saleScreen.confirmCancel")}
              </button>
              <button onClick={() => setActivePanel("none")} className="yc-btn-secondary !px-5 !py-2.5 !text-sm">
                {t("pos.cancel")}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={activePanel === "edit"}
        onClose={() => setActivePanel("none")}
        title={selectedSale ? `${t("saleScreen.editInvoiceTitle")}${selectedSale.saleNumber}` : t("saleScreen.editInvoice")}
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
              toast.success(t("saleScreen.invoiceEdited"));
            }}
            onCancel={() => setActivePanel("none")}
          />
        )}
      </Modal>

      <Modal
        isOpen={activePanel === "return"}
        onClose={() => setActivePanel("none")}
        title={selectedSale ? `${t("saleScreen.returnProductTitle")}${selectedSale.saleNumber}` : t("saleScreen.returnProduct")}
        icon={RotateCcw}
        accent="warning"
      >
        {selectedSale && (
          <ReturnForm
            saleId={selectedSale.id}
            onDone={(result) => {
              setActivePanel("none");
              updateRecentSaleAfterReturn(selectedSale.id, result);
              toast.success(t("saleScreen.returnSuccess"));
            }}
            onCancel={() => setActivePanel("none")}
          />
        )}
      </Modal>
    </div>
  );
}