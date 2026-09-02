// src/components/inventory/InventoryScreen.tsx
//
// نمط useIpcQuery للقراءات الثلاث (low stock / expiring / expired) + تبويبات
// بسيطة بحالة محلية (useState) — لا حاجة لأي مكتبة توجيه هنا.

import { useState } from "react";
import { useTranslation } from "react-i18next";
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

export function InventoryScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("lowStock");
  const [selectedProduct, setSelectedProduct] = useState<ProductRow | null>(null);

  const lowStock = useIpcQuery(() => api().inventory.getLowStock());
  const expiringSoon = useIpcQuery(() => api().inventory.getExpiringProducts({ withinDays: 30 }));
  const expired = useIpcQuery(() => api().inventory.getExpiredProducts());

  const activeQuery = { lowStock, expiringSoon, expired }[activeTab];
  const rows = (activeQuery.data ?? []) as unknown as ProductRow[];

  function refetchAll() {
    lowStock.refetch();
    expiringSoon.refetch();
    expired.refetch();
    setSelectedProduct(null);
  }

  return (
    <div className="flex h-full gap-4 p-4">
      <div className="flex-1">
        <h1 className="mb-4 text-xl font-bold">{t("inventory.title")}</h1>

        <div className="mb-4 flex gap-2 border-b">
          {(["lowStock", "expiringSoon", "expired"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm ${
                activeTab === tab ? "border-b-2 border-blue-600 font-semibold" : "text-gray-500"
              }`}
            >
              {t(`inventory.${tab}`)}
            </button>
          ))}
        </div>

        {activeQuery.isLoading && <p>{t("common.loading")}</p>}
        {activeQuery.error && <p className="text-red-600">{activeQuery.error}</p>}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-start">
              <th className="p-2 text-start">الاسم</th>
              <th className="p-2 text-start">{t("inventory.currentQuantity")}</th>
              {activeTab !== "lowStock" && <th className="p-2 text-start">تاريخ الصلاحية</th>}
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <tr key={product.id} className="border-b">
                <td className="p-2">{product.name}</td>
                <td className="p-2">{product.currentQuantity}</td>
                {activeTab !== "lowStock" && <td className="p-2">{product.expiryDate}</td>}
                <td className="p-2">
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="text-blue-600 underline"
                  >
                    تعديل الكمية
                  </button>
                </td>
              </tr>
            ))}
            {!activeQuery.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-400">
                  لا توجد عناصر حاليًا
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedProduct && (
        <aside className="w-80">
          <StockAdjustmentForm
            productId={selectedProduct.id}
            productName={selectedProduct.name}
            onDone={refetchAll}
          />
        </aside>
      )}
    </div>
  );
}
