// src/components/suppliers/SuppliersScreen.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { SupplierDetail } from "./SupplierDetail";
import { toast } from "../../lib/toast";

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
      toast.success("تم إضافة المورّد بنجاح");
    },
    onError: (err) => toast.error(err),
  });

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-6 p-6">
      <motion.h1 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="text-2xl font-bold text-[var(--text-primary)]"
      >
        الموردون
      </motion.h1>

      {/* Add Form */}
      <div className="yc-card grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="yc-input md:col-span-2"
          placeholder="اسم المورّد"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          data-barcode-ignore="true"
        />
        <input
          className="yc-input"
          placeholder="رقم الهاتف (اختياري)"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          data-barcode-ignore="true"
        />
        <button
          onClick={() => createSupplier.mutate({ name: newName, phone: newPhone || null })}
          disabled={createSupplier.isLoading || newName.length < 2}
          className="yc-btn-primary md:col-span-3"
        >
          {createSupplier.isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
          )}
          <span>إضافة مورّد جديد</span>
        </button>
      </div>

      {/* List */}
      <div className="yc-card flex-1 overflow-hidden p-0">
        {suppliers.isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="animate-spin-slow h-8 w-8 rounded-full border-4 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)]"></div>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <AnimatePresence mode="popLayout">
              {(suppliers.data ?? []).map((s: any, index) => (
                <motion.button
                  key={s.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  onClick={() => setSelected(s)}
                  className="flex w-full items-center justify-between border-b border-[var(--border-light)] p-4 text-start transition-colors hover:bg-[var(--bg-hover)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-gray-100)] text-[var(--text-secondary)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    </div>
                    <span className="font-medium text-[var(--text-primary)]">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.phone && <span className="text-xs text-[var(--text-muted)]">{s.phone}</span>}
                    <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
            {!suppliers.isLoading && (suppliers.data ?? []).length === 0 && (
              <div className="p-8 text-center text-sm text-[var(--text-muted)] flex flex-col items-center gap-2">
                <svg className="w-12 h-12 text-[var(--color-gray-300)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                لا يوجد موردون بعد. ابدأ بإضافة مورّد جديد.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal for Supplier Detail */}
      <AnimatePresence>
        {selected && (
          <SupplierDetail 
            supplierId={selected.id} 
            supplierName={selected.name} 
            onClose={() => setSelected(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}