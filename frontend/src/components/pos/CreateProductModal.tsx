// src/components/pos/CreateProductModal.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { api } from "../../lib/ipcClient";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { useIpcQuery } from "../../hooks/useIpcQuery"; // ⭐ إضافة الاستيراد
import { toast } from "../../lib/toast";
import { Modal } from "../layout/Modal";
import { Package, Barcode, Weight, Tag } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData: { barcode?: string; name?: string };
  onCreated: (product: any) => void;
}

export function CreateProductModal({ isOpen, onClose, initialData, onCreated }: Props) {
  const { t } = useTranslation();
  
  const [name, setName] = useState(initialData.name || "");
  const [barcode, setBarcode] = useState(initialData.barcode || "");
  const [sellingPrice, setSellingPrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("0");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [unitType, setUnitType] = useState<"piece" | "weight">("piece");
  const [weightUnit, setWeightUnit] = useState<"kg" | "g">("kg");

  // ⭐ جلب الفئات المخزنة من قاعدة البيانات
  const { data: categories, isLoading: isLoadingCategories } = useIpcQuery(
    () => api().categories.list(),
    []
  );

  useEffect(() => {
    if (isOpen) {
      setName(initialData.name || "");
      setBarcode(initialData.barcode || "");
      setSellingPrice("");
      setPurchasePrice("0");
      setCategoryId(null); // تصفير الفئة عند إعادة فتح المودال
      setUnitType("piece");
    }
  }, [isOpen, initialData]);

  const createProduct = useIpcMutation(api().products.create, {
    onSuccess: (data: any) => {
      toast.success(t("createProductModal.success"));
      // التأكد من أن السعر رقم قبل تمريره للسلة
      onCreated({ ...data, sellingPrice: Number(data.sellingPrice) });
    },
    onError: (msg) => {
      toast.error(msg);
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(t("createProductModal.nameRequired"));
      return;
    }
    if (!sellingPrice || Number(sellingPrice) <= 0) {
      toast.error(t("createProductModal.priceRequired"));
      return;
    }

    createProduct.mutate({
      name: name.trim(),
      barcode: barcode.trim() || null,
      unitType,
      weightUnit: unitType === "weight" ? weightUnit : null,
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice),
      lowStockThreshold: 5, // افتراضي
      categoryId: categoryId, // ⭐ تمرير الفئة المختارة
      expiryDate: null,
    });
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={t("createProductModal.title")} 
      icon={Package} 
      accent="primary"
    >
      <div className="space-y-4">
        {/* الاسم */}
        <motion.div 
          initial={{ opacity: 0, x: 10 }} 
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1.5"
        >
          <label className="text-xs font-medium text-[var(--text-muted)]">
            {t("createProductModal.name")}
          </label>
          <input
            type="text"
            autoFocus
            className="yc-input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-barcode-ignore="true"
          />
        </motion.div>

        {/* الباركود */}
        <motion.div 
          initial={{ opacity: 0, x: 10 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-1.5"
        >
          <label className="text-xs font-medium text-[var(--text-muted)]">
            {t("createProductModal.barcode")}
          </label>
          <input
            type="text"
            className="yc-input w-full font-mono"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            data-barcode-ignore="true"
          />
        </motion.div>

        {/* ⭐ الفئة (Category) */}
        <motion.div 
          initial={{ opacity: 0, x: 10 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-1.5"
        >
          <label className="text-xs font-medium text-[var(--text-muted)]">
            {t("createProductModal.category")}
          </label>
          <div className="relative">
            <Tag className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <select
              className="yc-input w-full appearance-none pr-10"
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
              data-barcode-ignore="true"
              disabled={isLoadingCategories}
            >
              <option value="">{t("createProductModal.noCategory")}</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* الأسعار */}
        <div className="flex gap-3">
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex-1 space-y-1.5"
          >
            <label className="text-xs font-medium text-[var(--text-muted)]">
              {t("createProductModal.sellingPrice")}
            </label>
            <input
              type="number"
              className="yc-input w-full text-lg font-bold text-[var(--color-success-600)]"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              data-barcode-ignore="true"
            />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 space-y-1.5"
          >
            <label className="text-xs font-medium text-[var(--text-muted)]">
              {t("createProductModal.purchasePrice")}
            </label>
            <input
              type="number"
              className="yc-input w-full"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              data-barcode-ignore="true"
            />
          </motion.div>
        </div>

        {/* نوع الوحدة */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-1.5"
        >
          <label className="text-xs font-medium text-[var(--text-muted)]">
            {t("createProductModal.unitType")}
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setUnitType("piece")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl p-2.5 text-sm font-bold transition-all ${
                unitType === "piece"
                  ? "bg-[var(--color-primary-500)] text-white shadow-md"
                  : "bg-[var(--bg-hover)] text-[var(--text-secondary)]"
              }`}
            >
              <Package className="h-4 w-4" /> {t("searchBar.byPiece")}
            </button>
            <button
              onClick={() => setUnitType("weight")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl p-2.5 text-sm font-bold transition-all ${
                unitType === "weight"
                  ? "bg-[var(--color-primary-500)] text-white shadow-md"
                  : "bg-[var(--bg-hover)] text-[var(--text-secondary)]"
              }`}
            >
              <Weight className="h-4 w-4" /> {t("searchBar.byWeight")}
            </button>
            {unitType === "weight" && (
              <select
                className="yc-input w-24"
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value as "kg" | "g")}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
              </select>
            )}
          </div>
        </motion.div>

        {/* الأزرار */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-2 pt-4"
        >
          <button
            onClick={handleSubmit}
            disabled={createProduct.isLoading}
            className="yc-btn-primary flex-1 !py-3 !text-sm"
          >
            {createProduct.isLoading ? t("common.loading") : t("createProductModal.saveAndAdd")}
          </button>
          <button
            onClick={onClose}
            className="yc-btn-secondary !px-5 !py-3 !text-sm"
          >
            {t("pos.cancel")}
          </button>
        </motion.div>
      </div>
    </Modal>
  );
}