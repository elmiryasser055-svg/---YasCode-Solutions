// src/components/products/ProductForm.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/ipcClient";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { useIpcQuery } from "../../hooks/useIpcQuery";

interface ProductData {
  id?: number;
  barcode?: string | null;
  name: string;
  categoryId?: number | null;
  unitType: "piece" | "weight";
  weightUnit?: "kg" | "g" | null;
  purchasePrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
  expiryDate?: string | null;
}

interface Props {
  initial?: ProductData;
  onDone: () => void;
  onClose: () => void;
}

export function ProductForm({ initial, onDone, onClose }: Props) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<ProductData>(
    initial ?? {
      name: "",
      categoryId: null,
      unitType: "piece",
      purchasePrice: 0,
      sellingPrice: 0,
      lowStockThreshold: 5,
    }
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  const categories = useIpcQuery(() => api().categories.list());
  const createCategory = useIpcMutation(api().categories.create, {
    onSuccess: (created) => {
      categories.refetch();
      update("categoryId", created.id);
      setNewCategoryName("");
      setShowNewCategoryInput(false);
    },
  });

  const createProduct = useIpcMutation(api().products.create, { onSuccess: onDone });
  const updateProduct = useIpcMutation(api().products.update, { onSuccess: onDone });
  const mutation = isEdit ? updateProduct : createProduct;

  function update<K extends keyof ProductData>(key: K, value: ProductData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEdit) {
      await updateProduct.mutate({
        id: form.id!,
        name: form.name,
        categoryId: form.categoryId ?? null,
        purchasePrice: form.purchasePrice,
        sellingPrice: form.sellingPrice,
        lowStockThreshold: form.lowStockThreshold,
        expiryDate: form.expiryDate ?? null,
      });
    } else {
      await createProduct.mutate({
        barcode: form.barcode || null,
        name: form.name,
        categoryId: form.categoryId ?? null,
        unitType: form.unitType,
        weightUnit: form.unitType === "weight" ? form.weightUnit ?? "kg" : null,
        purchasePrice: form.purchasePrice,
        sellingPrice: form.sellingPrice,
        lowStockThreshold: form.lowStockThreshold,
        expiryDate: form.expiryDate || null,
      });
    }
  }

  return (
    <div className="yc-card h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-bold text-lg text-[var(--text-primary)]">
            {isEdit ? "تعديل منتج" : "إضافة منتج جديد"}
          </h3>
          <p className="text-sm text-[var(--text-muted)]">أدخل تفاصيل المنتج بدقة</p>
        </div>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col overflow-y-auto">
        {!isEdit && (
          <label className="block">
            <span className="text-[var(--text-secondary)] text-sm mb-1 block">الباركود</span>
            <input
              className="yc-input"
              placeholder="اتركه فارغًا لتوليده تلقائيًا"
              value={form.barcode ?? ""}
              onChange={(e) => update("barcode", e.target.value)}
              data-barcode-ignore="true"
            />
          </label>
        )}

        <label className="block">
          <span className="text-[var(--text-secondary)] text-sm mb-1 block">اسم المنتج</span>
          <input
            className="yc-input"
            placeholder="مثال: زيت دوار الشمس"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            data-barcode-ignore="true"
            required
          />
        </label>

        {/* Category Selection */}
        <div>
          <span className="text-[var(--text-secondary)] text-sm mb-1 block">الفئة</span>
          <div className="flex gap-2">
            <select
              className="yc-input flex-1"
              value={form.categoryId ?? ""}
              onChange={(e) => update("categoryId", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">بلا فئة</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewCategoryInput((v) => !v)}
              className={`yc-btn-secondary !px-3 ${showNewCategoryInput ? "bg-[var(--color-primary-50)] border-[var(--color-primary-200)] text-[var(--color-primary-600)]" : ""}`}
              title="إضافة فئة جديدة"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            </button>
          </div>
          
          <AnimatePresence>
            {showNewCategoryInput && (
              <motion.div 
                initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                animate={{ opacity: 1, height: 'auto', marginTop: 8 }} 
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="flex gap-2 overflow-hidden"
              >
                <input
                  className="yc-input flex-1"
                  placeholder="اسم الفئة الجديدة"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  data-barcode-ignore="true"
                />
                <button
                  type="button"
                  onClick={() => createCategory.mutate({ name: newCategoryName })}
                  disabled={createCategory.isLoading || newCategoryName.length < 2}
                  className="yc-btn-primary !px-4 disabled:opacity-50"
                >
                  حفظ
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!isEdit && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[var(--text-secondary)] text-sm mb-1 block">نوع البيع</span>
              <select
                className="yc-input"
                value={form.unitType}
                onChange={(e) => update("unitType", e.target.value as "piece" | "weight")}
              >
                <option value="piece">بالقطعة</option>
                <option value="weight">بالوزن</option>
              </select>
            </label>
            {form.unitType === "weight" && (
              <label className="block">
                <span className="text-[var(--text-secondary)] text-sm mb-1 block">وحدة القياس</span>
                <select
                  className="yc-input"
                  value={form.weightUnit ?? "kg"}
                  onChange={(e) => update("weightUnit", e.target.value as "kg" | "g")}
                >
                  <option value="kg">كيلوغرام</option>
                  <option value="g">غرام</option>
                </select>
              </label>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[var(--text-secondary)] text-sm mb-1 block">سعر الشراء</span>
            <input
              type="number"
              step="0.01"
              className="yc-input"
              value={form.purchasePrice}
              onChange={(e) => update("purchasePrice", Number(e.target.value))}
              data-barcode-ignore="true"
              required
            />
          </label>
          <label className="block">
            <span className="text-[var(--text-secondary)] text-sm mb-1 block">سعر البيع</span>
            <input
              type="number"
              step="0.01"
              className="yc-input"
              value={form.sellingPrice}
              onChange={(e) => update("sellingPrice", Number(e.target.value))}
              data-barcode-ignore="true"
              required
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[var(--text-secondary)] text-sm mb-1 block">حد التنبيه (الكمية)</span>
            <input
              type="number"
              className="yc-input"
              value={form.lowStockThreshold}
              onChange={(e) => update("lowStockThreshold", Number(e.target.value))}
              data-barcode-ignore="true"
            />
          </label>
          <label className="block">
            <span className="text-[var(--text-secondary)] text-sm mb-1 block">تاريخ الصلاحية</span>
            <input
              type="date"
              className="yc-input"
              value={form.expiryDate ?? ""}
              onChange={(e) => update("expiryDate", e.target.value || null)}
              data-barcode-ignore="true"
            />
          </label>
        </div>

        {mutation.error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-sm text-[var(--color-danger-600)] bg-[var(--color-danger-50)] p-2 rounded-md animate-shake"
          >
            {mutation.error}
          </motion.div>
        )}

        <div className="mt-auto pt-4">
          <button
            type="submit"
            disabled={mutation.isLoading || form.name.length < 2}
            className="yc-btn-primary w-full py-3"
          >
            {mutation.isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                جاري الحفظ...
              </span>
            ) : isEdit ? "حفظ التعديلات" : "إضافة المنتج"}
          </button>
        </div>
      </form>
    </div>
  );
}