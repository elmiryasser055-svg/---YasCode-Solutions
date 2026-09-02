// src/components/pos/EditSaleForm.tsx
//
// ⭐ يسدّ فجوة: sales.editSale جاهز بالكامل في الباك-إند (المرحلة 3، الجولة
// الثانية) بلا أي واجهة تستدعيه. لا يحتاج هذا النموذج معرّفات sale_item
// (فقط productId + quantity)، لذا يعمل مباشرة على بيانات lastSale المتوفرة
// أصلاً في ذاكرة SaleScreen دون أي استدعاء إضافي.

import { useState } from "react";
import { api } from "../../lib/ipcClient";
import { useIpcMutation } from "../../hooks/useIpcMutation";

export interface EditableSaleItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  saleId: number;
  initialItems: EditableSaleItem[];
  initialDiscount: number;
  onDone: () => void;
  onCancel: () => void;
}

export function EditSaleForm({ saleId, initialItems, initialDiscount, onDone, onCancel }: Props) {
  const [items, setItems] = useState<EditableSaleItem[]>(initialItems);
  const [discount, setDiscount] = useState(initialDiscount);
  const [reason, setReason] = useState("");
  const [addQuery, setAddQuery] = useState("");

  const editSale = useIpcMutation(api().sales.edit, { onSuccess: onDone });

  function updateQuantity(productId: number, quantity: number) {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
  }

  async function handleAddProduct() {
    if (!addQuery.trim()) return;
    const result = await api().products.search({ query: addQuery });
    if (!result.ok || result.data.items.length === 0) return;
    const product = result.data.items[0] as any;

    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, unitPrice: product.sellingPrice }];
    });
    setAddQuery("");
  }

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const total = subtotal - discount;

  async function handleSubmit() {
    if (items.length === 0 || reason.length < 3) return;
    await editSale.mutate({
      saleId,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      discount,
      reason,
    });
  }

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      <h4 className="text-sm font-semibold">تعديل الفاتورة</h4>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded border p-2 text-sm"
          placeholder="أضف منتجًا (اسم أو باركود)..."
          value={addQuery}
          onChange={(e) => setAddQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddProduct()}
          data-barcode-ignore="true"
        />
        <button onClick={handleAddProduct} className="rounded border px-3 text-sm">
          إضافة
        </button>
      </div>

      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center justify-between text-sm">
            <span>{item.name}</span>
            <input
              type="number"
              className="w-16 rounded border p-1 text-center"
              value={item.quantity}
              onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
              data-barcode-ignore="true"
            />
            <span>{(item.unitPrice * item.quantity).toFixed(2)}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between text-sm">
        <label>
          الخصم:
          <input
            type="number"
            className="ms-2 w-20 rounded border p-1"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            data-barcode-ignore="true"
          />
        </label>
        <span className="font-semibold">الإجمالي الجديد: {total.toFixed(2)}</span>
      </div>

      <input
        className="w-full rounded border p-2 text-sm"
        placeholder="سبب التعديل (إلزامي)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        data-barcode-ignore="true"
      />

      {editSale.error && <p className="text-sm text-red-600">{editSale.error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={editSale.isLoading || items.length === 0 || reason.length < 3}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          {editSale.isLoading ? "جاري الحفظ..." : "حفظ التعديل"}
        </button>
        <button onClick={onCancel} className="rounded border px-3 py-1 text-sm">
          إلغاء
        </button>
      </div>
    </div>
  );
}
