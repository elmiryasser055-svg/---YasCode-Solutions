// src/components/suppliers/SupplierDetail.tsx
import { useState } from "react";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { NewPurchaseForm } from "../purchases/NewPurchaseForm";

interface Props {
  supplierId: number;
  supplierName: string;
}

export function SupplierDetail({ supplierId, supplierName }: Props) {
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [showNewPurchase, setShowNewPurchase] = useState(false);

  const debt = useIpcQuery(() => api().suppliers.getDebt({ id: supplierId }), [supplierId]);
  const purchases = useIpcQuery(
    () => api().purchases.listBySupplier(supplierId),
    [supplierId]
  );

  const recordPayment = useIpcMutation(api().purchases.recordSupplierPayment, {
    onSuccess: () => {
      debt.refetch();
      purchases.refetch();
      setPaymentAmount(0);
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <h2 className="text-lg font-bold">{supplierName}</h2>
        <p className="mt-1">
          الدَين الحالي:{" "}
          <span className="font-semibold text-red-600">
            {debt.isLoading ? "..." : `${debt.data ?? 0}`}
          </span>
        </p>

        <div className="mt-3 flex gap-2">
          <input
            type="number"
            className="w-32 rounded border p-2"
            placeholder="مبلغ الدفعة"
            value={paymentAmount || ""}
            onChange={(e) => setPaymentAmount(Number(e.target.value))}
            data-barcode-ignore="true"
          />
          <button
            onClick={() =>
              recordPayment.mutate({ supplierId, amount: paymentAmount, purchaseId: null })
            }
            disabled={recordPayment.isLoading || paymentAmount <= 0}
            className="rounded-md bg-green-600 px-4 py-2 text-white disabled:opacity-50"
          >
            تسجيل دفعة
          </button>
        </div>
        {recordPayment.error && <p className="mt-1 text-sm text-red-600">{recordPayment.error}</p>}
      </div>

      <button
        onClick={() => setShowNewPurchase((v) => !v)}
        className="rounded-md border px-4 py-2 text-sm"
      >
        {showNewPurchase ? "إغلاق" : "+ فاتورة شراء جديدة"}
      </button>

      {showNewPurchase && (
        <NewPurchaseForm
          supplierId={supplierId}
          onDone={() => {
            setShowNewPurchase(false);
            debt.refetch();
            purchases.refetch();
          }}
        />
      )}

      <div>
        <h3 className="mb-2 font-semibold">سجل الفواتير</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-start">التاريخ</th>
              <th className="p-2 text-start">الإجمالي</th>
              <th className="p-2 text-start">المدفوع</th>
              <th className="p-2 text-start">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {(purchases.data ?? []).map((p: any) => (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.purchaseDate}</td>
                <td className="p-2">{p.totalAmount}</td>
                <td className="p-2">{p.amountPaid}</td>
                <td className="p-2">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
