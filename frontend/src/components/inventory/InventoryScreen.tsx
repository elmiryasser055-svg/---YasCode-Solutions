// src/components/inventory/InventoryScreen.tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { StockAdjustmentForm } from "./StockAdjustmentForm";

type Tab = "lowStock" | "expiringSoon" | "expired";

interface ProductRow {
  id: number;
  name: string;
  currentQuantity: number;
  lowStockThreshold: number;
  expiryDate: string | null;
}

const getExpiryBadgeClass = (dateString: string | null, isExpiredTab: boolean) => {
  if (!dateString) return "yc-badge-blue";
  if (isExpiredTab) return "yc-badge-red";
  const daysLeft = Math.ceil((new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return daysLeft <= 7 ? "yc-badge-amber" : "yc-badge-blue";
};

export function InventoryScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("lowStock");
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const lowStock = useIpcQuery(() => api().inventory.getLowStock());
  const expiringSoon = useIpcQuery(() => api().inventory.getExpiringProducts({ withinDays: 30 }));
  const expired = useIpcQuery(() => api().inventory.getExpiredProducts());

  const activeQuery = { lowStock, expiringSoon, expired }[activeTab];
  const allRows = (activeQuery.data ?? []) as unknown as ProductRow[];
  
  const filteredRows = allRows.filter((row) =>
    row.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function refetchAll() {
    lowStock.refetch();
    expiringSoon.refetch();
    expired.refetch();
    setSelectedProduct(null);
  }

  const tabsConfig = [
    { id: "lowStock" as Tab, label: t("inventory.lowStock"), count: lowStock.data?.length ?? 0 },
    { id: "expiringSoon" as Tab, label: t("inventory.expiringSoon"), count: expiringSoon.data?.length ?? 0 },
    { id: "expired" as Tab, label: t("inventory.expired"), count: expired.data?.length ?? 0 },
  ];

  function handleExportCurrentView() {
    if (filteredRows.length === 0) return;
    
    const headers = [
      t("inventory.csvId"), 
      t("inventory.csvName"), 
      t("inventory.csvCurrentQuantity"), 
      t("inventory.csvThreshold"), 
      t("inventory.csvExpiryDate")
    ];
    
    const rows = filteredRows.map((p) => [
      p.id,
      `"${p.name}"`,
      p.currentQuantity,
      p.lowStockThreshold,
      p.expiryDate || t("inventory.csvNoDate")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `inventory-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex h-full gap-6 p-6">
      <div className="flex-1 flex flex-col">
        <motion.h1 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-6 text-2xl font-bold text-[var(--text-primary)]"
        >
          {t("inventory.title")}
        </motion.h1>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 border-b border-[var(--border-light)]">
          {tabsConfig.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(""); }}
              className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id ? "text-[var(--color-primary-600)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.count > 0 && (
                  <span className={`yc-badge ${activeTab === tab.id ? "yc-badge-blue" : "bg-[var(--color-gray-100)] text-[var(--text-secondary)]"}`}>
                    {tab.count}
                  </span>
                )}
              </span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-600)]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Search & Export Bar */}
        <div className="mb-4 flex gap-3 items-center">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--text-muted)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </span>
            <input
              type="text"
              placeholder={t("inventory.searchPlaceholder")}
              className="yc-input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={handleExportCurrentView} 
            className="yc-btn-secondary whitespace-nowrap"
            disabled={filteredRows.length === 0}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            {t("inventory.exportList")}
          </button>
        </div>

        {/* Table Container */}
        <div className="yc-card flex-1 overflow-hidden p-0">
          {activeQuery.isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="animate-spin-slow h-8 w-8 rounded-full border-4 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)]"></div>
            </div>
          ) : activeQuery.error ? (
            <div className="p-4 text-[var(--color-danger-600)]">{activeQuery.error}</div>
          ) : (
            <div className="h-full overflow-auto">
              <table className="yc-table">
                <thead>
                  <tr>
                    <th>{t("inventory.name")}</th>
                    <th>{t("inventory.currentQuantity")}</th>
                    {activeTab !== "lowStock" && <th>{t("inventory.expiryDate")}</th>}
                    <th className="text-left">{t("inventory.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {filteredRows.map((product, index) => (
                      <motion.tr
                        key={product.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, delay: index * 0.01 }}
                        className="cursor-pointer"
                        onClick={() => setSelectedProduct(product)}
                      >
                        <td className="font-medium text-[var(--text-primary)]">{product.name}</td>
                        <td>
                          <span className={`yc-badge ${product.currentQuantity <= product.lowStockThreshold ? "yc-badge-red" : "yc-badge-green"}`}>
                            {product.currentQuantity}
                          </span>
                        </td>
                        {activeTab !== "lowStock" && (
                          <td>
                            <span className={`yc-badge ${getExpiryBadgeClass(product.expiryDate, activeTab === "expired")}`}>
                              {product.expiryDate}
                            </span>
                          </td>
                        )}
                        <td className="text-left">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); }}
                            className="yc-btn-secondary !py-1.5 !px-3 text-xs"
                          >
                            {t("inventory.editQuantity")}
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                  
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">
                        <div className="flex flex-col items-center gap-2 animate-fade-in">
                          <svg className="w-12 h-12 text-[var(--color-gray-300)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                          {searchQuery ? t("inventory.noSearchResults") : t("inventory.emptyState")}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar for Stock Adjustment */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.aside
            initial={{ x: 50, opacity: 0, width: 0 }}
            animate={{ x: 0, opacity: 1, width: 340 }}
            exit={{ x: 50, opacity: 0, width: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="w-[340px] h-full">
              <StockAdjustmentForm
                productId={selectedProduct.id}
                productName={selectedProduct.name}
                currentQuantity={selectedProduct.currentQuantity}
                onDone={refetchAll}
                onClose={() => setSelectedProduct(null)}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}