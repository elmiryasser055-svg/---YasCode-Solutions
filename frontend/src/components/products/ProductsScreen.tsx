// src/components/products/ProductsScreen.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { ProductForm } from "./ProductForm";
import { confirm } from "../../store/confirmStore";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 20;

export function ProductsScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [labelStatus, setLabelStatus] = useState<string | null>(null);
  const [labelCopies, setLabelCopies] = useState<Record<number, number>>({});
  const [csvStatus, setCsvStatus] = useState<string | null>(null);

  // تم التعديل: إزالة "a" وجعلها نص فارغ لجلب كل المنتجات
  const products = useIpcQuery(
    () => api().products.search({ query: query || "", page, pageSize: PAGE_SIZE }),
    [query, page]
  );

  const deactivateProduct = useIpcMutation(api().products.deactivate, {
    onSuccess: () => products.refetch(),
  });

  async function handleExportCsv() {
    setCsvStatus(t("productsScreen.exporting"));
    const result = await api().products.exportCsv();
    if (!result.ok) return setCsvStatus(t("productsScreen.exportFailed", { error: result.error }));
    setCsvStatus(
      result.data.success
        ? t("productsScreen.exportSuccess", { count: result.data.count })
        : t("productsScreen.exportCanceled")
    );
  }

  async function handleImportCsv() {
    setCsvStatus(t("productsScreen.importing"));
    const result = await api().products.importCsv();
    if (!result.ok) return setCsvStatus(t("productsScreen.importFailed", { error: result.error }));
    if ("canceled" in result.data) return setCsvStatus(t("productsScreen.importCanceled"));
    
    const { created, skipped, errors } = result.data;
    setCsvStatus(
      errors.length > 0
        ? t("productsScreen.importSuccessWithErrors", { created, skipped, line: errors[0].line })
        : t("productsScreen.importSuccess", { created, skipped })
    );
    products.refetch();
  }

  function getCopiesFor(productId: number) {
    return labelCopies[productId] ?? 1;
  }

  async function handlePrintLabel(productId: number) {
    setLabelStatus(t("productsScreen.printing"));
    const copies = getCopiesFor(productId);
    const result = await api().printing.printBarcodeLabel({ productId, copies });
    setLabelStatus(
      result.ok
        ? t("productsScreen.printSuccess", { copies: result.data.copiesPrinted, barcode: result.data.barcode })
        : t("productsScreen.printFailed", { error: result.error })
    );
  }

  async function handleDeactivate(productId: number, productName: string) {
    const confirmed = await confirm(
      t("productsScreen.deactivateConfirm", { name: productName })
    );
    if (confirmed) deactivateProduct.mutate({ id: productId });
  }

  function handleSearchChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  const totalPages = products.data?.totalPages ?? 1;

  return (
    <div className="relative flex h-full gap-6 p-6">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-6 flex items-center justify-between"
        >
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("productsScreen.title")}</h1>
          <div className="flex gap-2">
            <button onClick={handleImportCsv} className="yc-btn-secondary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
              {t("productsScreen.import")}
            </button>
            <button onClick={handleExportCsv} className="yc-btn-secondary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              {t("productsScreen.export")}
            </button>
            <button
              onClick={() => { setShowNewForm(true); setEditingProduct(null); }}
              className="yc-btn-primary"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              {t("productsScreen.addNew")}
            </button>
          </div>
        </motion.div>

        {/* Status Messages */}
        <AnimatePresence>
          {csvStatus && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 text-sm text-[var(--text-secondary)] bg-[var(--color-gray-100)] p-2 rounded-md">
              {csvStatus}
            </motion.div>
          )}
          {labelStatus && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 text-sm text-[var(--text-secondary)] bg-[var(--color-gray-100)] p-2 rounded-md">
              {labelStatus}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Bar */}
        <div className="relative mb-4">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--text-muted)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </span>
          <input
            className="yc-input pl-10"
            placeholder={t("productsScreen.searchPlaceholder")}
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            data-barcode-ignore="true"
          />
        </div>

        {/* Table Container */}
        <div className="yc-card flex-1 overflow-hidden p-0">
          {products.isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="animate-spin-slow h-8 w-8 rounded-full border-4 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)]"></div>
            </div>
          ) : products.error ? (
            <div className="p-4 text-[var(--color-danger-600)]">{products.error}</div>
          ) : (
            <div className="h-full overflow-auto">
              <table className="yc-table">
                <thead>
                  <tr>
                    <th>{t("productsScreen.name")}</th>
                    <th>{t("productsScreen.barcode")}</th>
                    <th>{t("productsScreen.sellingPrice")}</th>
                    <th>{t("productsScreen.quantity")}</th>
                    <th className="text-left">{t("productsScreen.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {(products.data?.items ?? []).map((p: any, index) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.01 }}
                      >
                        <td className="font-medium text-[var(--text-primary)]">{p.name}</td>
                        <td className="text-[var(--text-secondary)]">{p.barcode ?? "—"}</td>
                        <td className="font-semibold">{p.sellingPrice} {t("common.currency")}</td>
                        <td>
                          <span className={`yc-badge ${p.currentQuantity <= p.lowStockThreshold ? "yc-badge-red" : "yc-badge-green"}`}>
                            {p.currentQuantity}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setEditingProduct(p); setShowNewForm(false); }}
                              className="yc-btn-secondary !py-1.5 !px-3 text-xs"
                            >
                              {t("common.edit")}
                            </button>

                            <div className="flex items-center gap-1 bg-[var(--color-gray-100)] rounded-md p-1">
                              <input
                                type="number"
                                min={1}
                                max={50}
                                className="w-12 bg-transparent text-center text-xs outline-none"
                                value={getCopiesFor(p.id)}
                                onChange={(e) => setLabelCopies((prev) => ({ ...prev, [p.id]: Number(e.target.value) || 1 }))}
                                data-barcode-ignore="true"
                                title={t("productsScreen.copiesCount")}
                              />
                              <button onClick={() => handlePrintLabel(p.id)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 transition-colors" title={t("productsScreen.printLabel")}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                              </button>
                            </div>

                            <button
                              onClick={() => handleDeactivate(p.id, p.name)}
                              className="text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)] p-1.5 rounded-md transition-colors"
                              title={t("productsScreen.deactivate")}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  
                  {!products.isLoading && (products.data?.items?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">
                        {t("productsScreen.noResults")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {products.data && products.data.total > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-[var(--text-secondary)]">
            <span>
              {t("productsScreen.paginationInfo", { page: products.data.page, totalPages, total: products.data.total })}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="yc-btn-secondary !py-1.5 !px-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("productsScreen.previous")}
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="yc-btn-secondary !py-1.5 !px-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t("productsScreen.next")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Product Form */}
      <AnimatePresence>
        {(showNewForm || editingProduct) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => {
              setShowNewForm(false);
              setEditingProduct(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <ProductForm
                initial={editingProduct ?? undefined}
                onDone={() => {
                  setShowNewForm(false);
                  setEditingProduct(null);
                  products.refetch();
                }}
                onClose={() => {
                  setShowNewForm(false);
                  setEditingProduct(null);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}