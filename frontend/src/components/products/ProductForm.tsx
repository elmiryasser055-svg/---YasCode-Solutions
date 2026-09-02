// src/components/products/ProductForm.tsx
//
// ⭐ يسدّ فجوة: أضيف اختيار/إنشاء فئة (categories module كان بلا أي واجهة
// تستدعيه إطلاقًا)، بالإضافة لحقل categoryId المفقود سابقًا في هذا النموذج.

import { useState } from "react";
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
}

/** يخدم الإنشاء والتعديل معًا — إن وُجد initial.id نستدعي update، وإلا create */
export function ProductForm({ initial, onDone }: Props) {
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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <h3 className="font-semibold">{isEdit ? "تعديل منتج" : "منتج جديد"}</h3>

      {!isEdit && (
        <input
          className="w-full rounded border p-2 text-sm"
          placeholder="الباركود (اتركه فارغًا لتوليده لاحقًا)"
          value={form.barcode ?? ""}
          onChange={(e) => update("barcode", e.target.value)}
          data-barcode-ignore="true"
        />
      )}

      <input
        className="w-full rounded border p-2 text-sm"
        placeholder="اسم المنتج"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        data-barcode-ignore="true"
      />

      {/* ⭐ اختيار/إنشاء فئة */}
      <div>
        <label className="block text-sm">الفئة (اختياري)</label>
        <div className="mt-1 flex gap-2">
          <select
            className="flex-1 rounded border p-2 text-sm"
            value={form.categoryId ?? ""}
            onChange={(e) => update("categoryId", e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">بلا فئة</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowNewCategoryInput((v) => !v)}
            className="rounded border px-3 text-sm"
          >
            + فئة
          </button>
        </div>
        {showNewCategoryInput && (
          <div className="mt-2 flex gap-2">
            <input
              className="flex-1 rounded border p-2 text-sm"
              placeholder="اسم الفئة الجديدة"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              data-barcode-ignore="true"
            />
            <button
              type="button"
              onClick={() => createCategory.mutate({ name: newCategoryName })}
              disabled={createCategory.isLoading || newCategoryName.length < 2}
              className="rounded bg-blue-600 px-3 text-sm text-white disabled:opacity-50"
            >
              حفظ
            </button>
          </div>
        )}
        {createCategory.error && <p className="text-xs text-red-600">{createCategory.error}</p>}
      </div>

      {!isEdit && (
        <div className="flex gap-2">
          <select
            className="rounded border p-2 text-sm"
            value={form.unitType}
            onChange={(e) => update("unitType", e.target.value as "piece" | "weight")}
          >
            <option value="piece">بالقطعة</option>
            <option value="weight">بالوزن</option>
          </select>
          {form.unitType === "weight" && (
            <select
              className="rounded border p-2 text-sm"
              value={form.weightUnit ?? "kg"}
              onChange={(e) => update("weightUnit", e.target.value as "kg" | "g")}
            >
              <option value="kg">كيلوغرام</option>
              <option value="g">غرام</option>
            </select>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <label className="flex-1 text-sm">
          سعر الشراء
          <input
            type="number"
            className="mt-1 w-full rounded border p-2"
            value={form.purchasePrice}
            onChange={(e) => update("purchasePrice", Number(e.target.value))}
            data-barcode-ignore="true"
          />
        </label>
        <label className="flex-1 text-sm">
          سعر البيع
          <input
            type="number"
            className="mt-1 w-full rounded border p-2"
            value={form.sellingPrice}
            onChange={(e) => update("sellingPrice", Number(e.target.value))}
            data-barcode-ignore="true"
          />
        </label>
      </div>

      <label className="block text-sm">
        حد التنبيه بالكمية المنخفضة
        <input
          type="number"
          className="mt-1 w-full rounded border p-2"
          value={form.lowStockThreshold}
          onChange={(e) => update("lowStockThreshold", Number(e.target.value))}
          data-barcode-ignore="true"
        />
      </label>

      <label className="block text-sm">
        تاريخ الصلاحية (اختياري)
        <input
          type="date"
          className="mt-1 w-full rounded border p-2"
          value={form.expiryDate ?? ""}
          onChange={(e) => update("expiryDate", e.target.value || null)}
          data-barcode-ignore="true"
        />
      </label>

      {mutation.error && <p className="text-sm text-red-600">{mutation.error}</p>}

      <button
        type="submit"
        disabled={mutation.isLoading || form.name.length < 2}
        className="w-full rounded-md bg-blue-600 py-2 text-white disabled:opacity-50"
      >
        {mutation.isLoading ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : "إضافة المنتج"}
      </button>
    </form>
  );
}
