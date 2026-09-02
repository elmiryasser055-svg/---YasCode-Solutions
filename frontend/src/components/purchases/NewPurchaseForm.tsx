// src/components/purchases/NewPurchaseForm.tsx
import { useState } from "react";
import { api } from "../../lib/ipcClient";
import { useIpcMutation } from "../../hooks/useIpcMutation";

interface PurchaseItemDraft {
  productId: number;
  productName: string;
  quantity: number;
  unitCost: number;
}

interface Props {
  supplierId: number;
  onDone: () => void;
}

/** فاتورة شراء جديدة: بحث عن منتج بالاسم/الباركود ثم إضافته بكمية وسعر شراء محدَّدين */
export function NewPurchaseForm({ supplierId, onDone }: Props) {
  const [items, setItems] = useState<PurchaseItemDraft[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amountPaid, setAmountPaid] = useState(0);

  const createPurchase = useIpcMutation(api().purchases.create, {
    onSuccess: () => {
      setItems([]);
      onDone();
    },
  });

  async function handleAddProduct() {
    const result = await api().products.search({ query: searchQuery });
    if (!result.ok || result.data.items.length === 0) return;
    const product = result.data.items[0] as any;
    setItems((prev) => [
      ...prev,
      { productId: product.id, productName: product.name, quantity: 1, unitCost: product.purchasePrice },
    ]);
    setSearchQuery("");
  }

  function updateItem(index: number, patch: Partial<PurchaseItemDraft>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

  async function handleSubmit() {
    await createPurchase.mutate({
      supplierId,
      invoiceNumber: invoiceNumber || null,
      amountPaid,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitCost: i.unitCost })),
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="font-semibold">فاتورة شراء جديدة</h3>

      <input
        className="w-full rounded border p-2"
        placeholder="ابحث عن منتج بالاسم أو الباركود..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAddProduct()}
        data-barcode-ignore="true"
      />

      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="p-1 text-start">المنتج</th>
            <th className="p-1 text-start">الكمية</th>
            <th className="p-1 text-start">سعر الوحدة</th>
            <th className="p-1 text-start">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="p-1">{item.productName}</td>
              <td className="p-1">
                <input
                  type="number"
                  className="w-20 rounded border p-1"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                  data-barcode-ignore="true"
                />
              </td>
              <td className="p-1">
                <input
                  type="number"
                  className="w-24 rounded border p-1"
                  value={item.unitCost}
                  onChange={(e) => updateItem(i, { unitCost: Number(e.target.value) })}
                  data-barcode-ignore="true"
                />
              </td>
              <td className="p-1">{(item.quantity * item.unitCost).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <input
        className="w-full rounded border p-2"
        placeholder="رقم الفاتورة (اختياري)"
        value={invoiceNumber}
        onChange={(e) => setInvoiceNumber(e.target.value)}
        data-barcode-ignore="true"
      />

      <label className="block text-sm">
        المبلغ المدفوع الآن (0 = فاتورة آجلة بالكامل)
        <input
          type="number"
          className="mt-1 w-full rounded border p-2"
          value={amountPaid}
          onChange={(e) => setAmountPaid(Number(e.target.value))}
          data-barcode-ignore="true"
        />
      </label>

      <div className="flex justify-between font-semibold">
        <span>الإجمالي</span>
        <span>{total.toFixed(2)}</span>
      </div>

      {createPurchase.error && <p className="text-sm text-red-600">{createPurchase.error}</p>}

      <button
        onClick={handleSubmit}
        disabled={createPurchase.isLoading || items.length === 0}
        className="w-full rounded-md bg-blue-600 py-2 text-white disabled:opacity-50"
      >
        {createPurchase.isLoading ? "جاري الحفظ..." : "حفظ الفاتورة"}
      </button>
    </div>
  );
}
