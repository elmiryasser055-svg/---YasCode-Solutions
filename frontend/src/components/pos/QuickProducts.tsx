// src/components/pos/QuickProducts.tsx
import { useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { checkProductAvailability } from "../../lib/productAvailability";
import { Zap, PackageOpen, Grid3X3, List } from "lucide-react";

interface Category {
  id: number;
  name: string;
}

interface Props {
  onAdd: (product: {
    id: number;
    name: string;
    barcode: string | null;
    unitType: "piece" | "weight";
    sellingPrice: number;
  }) => void;
}

const CATEGORY_GRADIENTS = [
  { from: "#4f46e5", to: "#7c3aed" }, // Indigo
  { from: "#059669", to: "#0d9488" }, // Emerald
  { from: "#d97706", to: "#ea580c" }, // Amber
  { from: "#dc2626", to: "#db2777" }, // Red/Pink
  { from: "#0891b2", to: "#2563eb" }, // Cyan/Blue
  { from: "#7c3aed", to: "#c026d3" }, // Violet
];

function getCategoryStyle(index: number, isActive: boolean) {
  if (!isActive) return { background: "var(--bg-hover)", color: "var(--text-secondary)" };
  // للزر "الكل" (index = -1) نستخدم تدرج افتراضي ثابت
  if (index === -1) return { background: "linear-gradient(135deg, #64748b, #475569)", color: "#ffffff" };
  
  const safeIndex = ((index % CATEGORY_GRADIENTS.length) + CATEGORY_GRADIENTS.length) % CATEGORY_GRADIENTS.length;
  const g = CATEGORY_GRADIENTS[safeIndex];
  return {
    background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
    color: "#ffffff",
  };
}

export function QuickProducts({ onAdd }: Props) {
  const { t } = useTranslation();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: categoriesResult } = useIpcQuery(
    async () => api().categories.list(),
    []
  );
  const categories: Category[] = (categoriesResult as any) ?? [];

  const { data: searchResult } = useIpcQuery(
    async () => api().products.search({ query: "", page: 1, pageSize: 50 }),
    []
  );

  const allProducts: any[] = searchResult?.items ?? [];

  const products = useMemo(() => {
    if (selectedCategoryId === "all") return allProducts;
    return allProducts.filter((p) => p.categoryId === selectedCategoryId);
  }, [allProducts, selectedCategoryId]);

  async function handleAddProduct(product: any) {
    if (checkingId !== null) return;
    setCheckingId(product.id);
    try {
      const { ok } = await checkProductAvailability(product.id, product.name);
      if (!ok) return;
      onAdd({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        unitType: product.unitType,
        sellingPrice: product.sellingPrice,
      });
    } finally {
      setCheckingId(null);
    }
  }

  if (allProducts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-50)] text-[var(--color-primary-600)]">
            <Zap className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {t("pos.quickProducts")}
          </h3>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={`rounded-md p-1.5 transition-all ${viewMode === "grid" ? "bg-[var(--color-primary-100)] text-[var(--color-primary-700)] shadow-sm" : "text-[var(--text-muted)]"}`}
          >
            <Grid3X3 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`rounded-md p-1.5 transition-all ${viewMode === "list" ? "bg-[var(--color-primary-100)] text-[var(--color-primary-700)] shadow-sm" : "text-[var(--text-muted)]"}`}
          >
            <List className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Category Pills */}
      {categories.length > 0 && (
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedCategoryId("all")}
            className="relative flex-shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-shadow"
            style={getCategoryStyle(-1, selectedCategoryId === "all")}
          >
            الكل
            {selectedCategoryId === "all" && (
              <motion.div
                layoutId="activeCategory"
                className="absolute inset-0 rounded-xl border-2 border-white/30"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </motion.button>
          {categories.map((cat, idx) => {
            const active = selectedCategoryId === cat.id;
            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategoryId(cat.id)}
                className="relative flex-shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-shadow"
                style={getCategoryStyle(idx, active)}
              >
                {cat.name}
                {active && (
                  <motion.div
                    layoutId="activeCategory"
                    className="absolute inset-0 rounded-xl border-2 border-white/30"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Products */}
      <AnimatePresence mode="wait">
        {products.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border-light)] bg-[var(--bg-hover)] py-8 text-[var(--text-muted)]"
          >
            <PackageOpen className="h-8 w-8 opacity-40" strokeWidth={1.5} />
            <p className="text-sm">لا توجد منتجات في هذه الفئة</p>
          </motion.div>
        ) : viewMode === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
          >
            {products.map((product: any, i: number) => (
              <motion.button
                key={product.id}
                disabled={checkingId === product.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                whileHover={{ y: -3, boxShadow: "var(--shadow-lg)" }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleAddProduct(product)}
                className="group relative flex flex-col items-start gap-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-3 text-right shadow-sm transition-all hover:border-[var(--color-primary-300)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex w-full items-start justify-between">
                  <span className="inline-flex items-center rounded-md bg-[var(--bg-hover)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                    {product.unitType === "weight" ? "وزن" : "قطعة"}
                  </span>
                  <span className="text-lg font-black text-[var(--color-primary-600)] tabular-nums">
                    {product.sellingPrice.toFixed(0)}
                  </span>
                </div>
                <p className="line-clamp-2 w-full text-right text-xs font-bold leading-tight text-[var(--text-primary)]">
                  {product.name}
                </p>
                <div className="absolute inset-x-0 bottom-0 h-1 rounded-b-xl bg-gradient-to-r from-[var(--color-primary-400)] to-[var(--color-primary-600)] opacity-0 transition-opacity group-hover:opacity-100" />
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-1.5"
          >
            {products.map((product: any, i: number) => (
              <motion.button
                key={product.id}
                disabled={checkingId === product.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.015 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAddProduct(product)}
                className="flex items-center justify-between rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] px-4 py-3 text-right shadow-sm transition-all hover:border-[var(--color-primary-300)] hover:bg-[var(--color-primary-50)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                    {product.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {product.unitType === "weight" ? "منتج بالوزن" : "منتج بالقطعة"}
                  </p>
                </div>
                <span className="text-base font-black text-[var(--color-primary-600)] tabular-nums">
                  {product.sellingPrice.toFixed(2)}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}