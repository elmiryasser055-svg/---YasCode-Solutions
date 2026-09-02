// src/components/suppliers/SuppliersScreen.tsx
import { useState } from "react";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { SupplierDetail } from "./SupplierDetail";

interface Supplier {
  id: number;
  name: string;
  phone: string | null;
}

export function SuppliersScreen() {
  const suppliers = useIpcQuery(() => api().suppliers.list());
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const createSupplier = useIpcMutation(api().suppliers.create, {
    onSuccess: () => {
      suppliers.refetch();
      setNewName("");
      setNewPhone("");
    },
  });

  return (
    <div className="flex h-full gap-4 p-4">
      <div className="w-80 space-y-4">
        <h1 className="text-xl font-bold">الموردون</h1>

        <div className="space-y-2 rounded-lg border p-3">
          <input
            className="w-full rounded border p-2 text-sm"
            placeholder="اسم المورّد"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            data-barcode-ignore="true"
          />
          <input
            className="w-full rounded border p-2 text-sm"
            placeholder="رقم الهاتف (اختياري)"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            data-barcode-ignore="true"
          />
          <button
            onClick={() => createSupplier.mutate({ name: newName, phone: newPhone || null })}
            disabled={createSupplier.isLoading || newName.length < 2}
            className="w-full rounded-md bg-blue-600 py-2 text-sm text-white disabled:opacity-50"
          >
            + إضافة مورّد
          </button>
          {createSupplier.error && <p className="text-xs text-red-600">{createSupplier.error}</p>}
        </div>

        <ul className="divide-y rounded-lg border">
          {(suppliers.data ?? []).map((s: any) => (
            <li key={s.id}>
              <button
                onClick={() => setSelected(s)}
                className={`w-full p-3 text-start text-sm ${
                  selected?.id === s.id ? "bg-blue-50 font-semibold" : ""
                }`}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1">
        {selected ? (
          <SupplierDetail supplierId={selected.id} supplierName={selected.name} />
        ) : (
          <p className="text-gray-400">اختر موردًا من القائمة لعرض تفاصيله</p>
        )}
      </div>
    </div>
  );
}
