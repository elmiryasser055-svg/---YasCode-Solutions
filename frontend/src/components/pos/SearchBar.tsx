// src/components/pos/SearchBar.tsx
import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ScanBarcode, Loader2, CornerDownLeft, Package, Weight, Tag } from "lucide-react";
import { checkProductAvailability } from "../../lib/productAvailability";
import { useTranslation } from "react-i18next";

interface ProductResult {
  id: number;
  name: string;
  barcode: string | null;
  unitType: "piece" | "weight";
  sellingPrice: number;
  categoryName?: string;
}

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onSelect: (product: ProductResult) => void;
  onAddByQuery: (query: string) => void;
  results: ProductResult[];
  loading: boolean;
  error: string | null;
  disabled?: boolean;
}

export function SearchBar({
  disabled,
  query,
  onQueryChange,
  onSelect,
  onAddByQuery,
  results,
  loading,
  error,
}: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [highlighted, setHighlighted] = useState(0);
  const [checkingId, setCheckingId] = useState<number | null>(null);

  const open = query.trim() !== "" && (results.length > 0 || loading);

  useEffect(() => {
    setHighlighted(0);
  }, [results]);

  const handleSelect = useCallback(
    async (product: ProductResult) => {
      if (checkingId !== null) return;
      setCheckingId(product.id);
      try {
        const { ok } = await checkProductAvailability(product.id, product.name);
        if (ok) onSelect(product);
      } finally {
        setCheckingId(null);
      }
    },
    [onSelect, checkingId]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // إذا لم تكن هناك نتائج أو القائمة مغلقة، وقام المستخدم (أو القارئ) بالضغط على Enter
      // نقوم بإضافة النص المكتوب (الباركود) كمنتج مباشرة
      if (!open || results.length === 0) {
        if (e.key === "Enter" && query.trim()) {
          e.preventDefault();
          onAddByQuery(query.trim());
        }
        return;
      }
      
      // التنقل بين النتائج إذا كانت موجودة
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        // إذا وُجدت نتائج والضغط على Enter، اختر النتيجة المظللة (أول نتيجة عادةً)
        e.preventDefault();
        const picked = results[highlighted];
        if (picked) handleSelect(picked);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onQueryChange("");
      }
    },
    [open, query, results, highlighted, handleSelect, onAddByQuery, onQueryChange]
  );

  useEffect(() => {
    if (dropdownRef.current) {
      const el = dropdownRef.current.querySelector(`[data-index="${highlighted}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="flex  items-center gap-2 rounded-2xl border-2 border-[var(--border-light)] bg-[var(--bg-card)] p-2 shadow-sm transition-all focus-within:border-[var(--color-primary-400)] focus-within:shadow-md">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-primary-50)] text-[var(--color-primary-600)]">
          {query.trim() ? (
            <ScanBarcode className="h-5 w-5" strokeWidth={2} />
          ) : (
            <Search className="h-5 w-5" strokeWidth={2} />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
           disabled={disabled}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("searchBar.placeholder")}
          className="min-w-0 flex-1 bg-transparent text-base font-bold text-[var(--text-primary)] outline-none placeholder:font-normal placeholder:text-[var(--text-muted)]"
          autoComplete="off"
          autoFocus // ⭐ التركيز التلقائي على حقل البحث عند فتح الشاشة (مهم لقارئ الباركود)
          data-search-input="true" // ⭐ لكي يعثر عليه اختصار F2 في SaleScreen.tsx
        />
        {query.trim() && !loading && (
          <button
            onClick={() => onAddByQuery(query.trim())}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-primary-600)] px-4 text-xs font-bold text-white shadow-md transition-transform active:scale-95"
          >
            <CornerDownLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t("searchBar.add")}
          </button>
        )}
        {loading && <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary-500)]" />}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-2xl"
          >
            {results.length === 0 && loading && (
              <div className="flex items-center gap-3 px-5 py-5 text-[var(--text-muted)]">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">{t("searchBar.searching")}</span>
              </div>
            )}

            {results.length === 0 && !loading && (
              <div className="flex flex-col items-center gap-2 px-5 py-8 text-[var(--text-muted)]">
                <Search className="h-8 w-8 opacity-30" strokeWidth={1.5} />
                <p className="text-sm">{t("searchBar.noResults")}</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="max-h-[420px] overflow-y-auto py-2">
                {results.map((product, index) => {
                  const isHighlighted = index === highlighted;
                  return (
                    <motion.button
                      key={product.id}
                      data-index={index}
                      type="button"
                      disabled={checkingId === product.id}
                      onMouseEnter={() => setHighlighted(index)}
                      onClick={() => handleSelect(product)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`flex w-full items-center gap-4 px-5 py-4 text-right transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        isHighlighted
                          ? "bg-gradient-to-r from-[var(--color-primary-50)] to-transparent border-r-4 border-[var(--color-primary-500)]"
                          : "hover:bg-[var(--bg-hover)]"
                      }`}
                    >
                      {/* Product Avatar */}
                      <div
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-base font-black ${
                          product.unitType === "weight"
                            ? "bg-[var(--color-warning-50)] text-[var(--color-warning-600)]"
                            : "bg-[var(--color-primary-50)] text-[var(--color-primary-600)]"
                        }`}
                      >
                        {product.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>

                      {/* Product Info */}
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-base font-bold ${isHighlighted ? "text-[var(--color-primary-700)]" : "text-[var(--text-primary)]"}`}>
                          {product.name}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                          {product.barcode && (
                            <span className="flex items-center gap-1 font-mono">
                              <ScanBarcode className="h-3 w-3" />
                              {product.barcode}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            {product.unitType === "weight" ? (
                              <Weight className="h-3 w-3" />
                            ) : (
                              <Package className="h-3 w-3" />
                            )}
                            {product.unitType === "weight" ? t("searchBar.byWeight") : t("searchBar.byPiece")}
                          </span>
                          {product.categoryName && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {product.categoryName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-xl font-black text-[var(--color-primary-600)] tabular-nums">
                          {product.sellingPrice.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">{t("paymentPanel.currency")}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Footer hint */}
            {results.length > 0 && (
              <div className="flex items-center justify-between border-t border-[var(--border-light)] bg-[var(--bg-hover)] px-5 py-2 text-[10px] text-[var(--text-muted)]">
                <span>{t("searchBar.footerHint")}</span>
                <span>{results.length} {t("searchBar.resultsCount")}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 flex items-center gap-2 overflow-hidden rounded-xl bg-[var(--color-danger-50)] p-3 text-sm text-[var(--color-danger-600)]"
          >
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-danger-100)] text-xs font-bold">!</span>
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-2 text-xs text-[var(--text-muted)]">
        {t("searchBar.bottomHint")}
      </p>
    </div>
  );
}