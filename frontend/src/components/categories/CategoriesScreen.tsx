// src/components/categories/CategoriesScreen.tsx
//
// ⭐ يسدّ فجوة: كان بالإمكان فقط إنشاء فئة من داخل ProductForm — لا تعديل
// ولا حذف من أي مكان في الواجهة، رغم أن الباك-إند (categories module) يدعم
// العمليتين بالكامل منذ إضافته.

import { useState } from "react";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { confirm } from "../../store/confirmStore";

export function CategoriesScreen() {
  const categories = useIpcQuery(() => api().categories.list());
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const createCategory = useIpcMutation(api().categories.create, {
    onSuccess: () => {
      categories.refetch();
      setNewName("");
    },
  });

  const updateCategory = useIpcMutation(api().categories.update, {
    onSuccess: () => {
      categories.refetch();
      setEditingId(null);
    },
  });

  const deleteCategory = useIpcMutation(api().categories.delete, {
    onSuccess: () => categories.refetch(),
  });

  async function handleDelete(id: number, name: string) {
    const confirmed = await confirm(
      `هل أنت متأكد من حذف الفئة "${name}"؟ المنتجات المرتبطة بها ستصبح بلا فئة (لن تُحذف).`
    );
    if (confirmed) deleteCategory.mutate({ id });
  }

  return (
    <div className="mx-auto mt-6 max-w-md space-y-4 p-4">
      <h1 className="text-xl font-bold">إدارة الفئات</h1>

      <div className="flex gap-2">
        <input
          className="flex-1 rounded border p-2 text-sm"
          placeholder="اسم فئة جديدة"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          data-barcode-ignore="true"
        />
        <button
          onClick={() => createCategory.mutate({ name: newName })}
          disabled={createCategory.isLoading || newName.length < 2}
          className="rounded-md bg-blue-600 px-4 text-sm text-white disabled:opacity-50"
        >
          + إضافة
        </button>
      </div>
      {createCategory.error && <p className="text-sm text-red-600">{createCategory.error}</p>}

      {categories.isLoading && <p className="text-sm text-gray-400">جاري التحميل...</p>}
      {categories.error && <p className="text-sm text-red-600">{categories.error}</p>}

      <ul className="divide-y rounded-lg border">
        {(categories.data ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between p-3">
            {editingId === c.id ? (
              <div className="flex flex-1 gap-2">
                <input
                  className="flex-1 rounded border p-1 text-sm"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  data-barcode-ignore="true"
                />
                <button
                  onClick={() => updateCategory.mutate({ id: c.id, name: editingName })}
                  disabled={updateCategory.isLoading || editingName.length < 2}
                  className="text-sm text-blue-600"
                >
                  حفظ
                </button>
                <button onClick={() => setEditingId(null)} className="text-sm text-gray-500">
                  إلغاء
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm">{c.name}</span>
                <div className="flex gap-3 text-sm">
                  <button
                    onClick={() => {
                      setEditingId(c.id);
                      setEditingName(c.name);
                    }}
                    className="text-blue-600 underline"
                  >
                    تعديل
                  </button>
                  <button onClick={() => handleDelete(c.id, c.name)} className="text-red-600 underline">
                    حذف
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {!categories.isLoading && (categories.data ?? []).length === 0 && (
          <li className="p-4 text-center text-sm text-gray-400">لا توجد فئات بعد</li>
        )}
      </ul>
    </div>
  );
}
