// src/components/categories/CategoriesScreen.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { confirm } from "../../store/confirmStore";
import { toast } from "../../lib/toast";
import { useTranslation } from "react-i18next";

export function CategoriesScreen() {
  const { t } = useTranslation();
  const categories = useIpcQuery(() => api().categories.list());
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const createCategory = useIpcMutation(api().categories.create, {
    onSuccess: () => {
      categories.refetch();
      setNewName("");
      toast.success(t("categoriesScreen.createSuccess"));
    },
    onError: (err) => toast.error(err),
  });

  const updateCategory = useIpcMutation(api().categories.update, {
    onSuccess: () => {
      categories.refetch();
      setEditingId(null);
      toast.success(t("categoriesScreen.updateSuccess"));
    },
    onError: (err) => toast.error(err),
  });

  const deleteCategory = useIpcMutation(api().categories.delete, {
    onSuccess: () => {
      categories.refetch();
      toast.success(t("categoriesScreen.deleteSuccess"));
    },
    onError: (err) => toast.error(err),
  });

  async function handleDelete(id: number, name: string) {
    const confirmed = await confirm(
      t("categoriesScreen.deleteConfirm", { name })
    );
    if (confirmed) deleteCategory.mutate({ id });
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col p-6">
      <motion.h1 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-6 text-2xl font-bold text-[var(--text-primary)]"
      >
        {t("categoriesScreen.title")}
      </motion.h1>

      {/* Add New Category Form */}
      <div className="yc-card mb-6">
        <h3 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">{t("categoriesScreen.addNewTitle")}</h3>
        <div className="flex gap-2">
          <input
            className="yc-input flex-1"
            placeholder={t("categoriesScreen.addPlaceholder")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            data-barcode-ignore="true"
          />
          <button
            onClick={() => createCategory.mutate({ name: newName })}
            disabled={createCategory.isLoading || newName.length < 2}
            className="yc-btn-primary whitespace-nowrap"
          >
            {createCategory.isLoading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            )}
            <span>{t("categoriesScreen.addButton")}</span>
          </button>
        </div>
      </div>

      {/* Categories List */}
      <div className="yc-card flex-1 overflow-hidden p-0">
        {categories.isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="animate-spin-slow h-8 w-8 rounded-full border-4 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)]"></div>
          </div>
        ) : categories.error ? (
          <div className="p-4 text-center text-[var(--color-danger-600)]">{categories.error}</div>
        ) : (
          <div className="h-full overflow-auto">
            <AnimatePresence mode="popLayout">
              {(categories.data ?? []).map((c, index) => (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className={`flex items-center justify-between p-4 border-b border-[var(--border-light)] last:border-0 ${
                    editingId === c.id ? "bg-[var(--color-primary-50)]" : "hover:bg-[var(--bg-hover)] transition-colors"
                  }`}
                >
                  {editingId === c.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        className="yc-input flex-1 !py-1.5"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        data-barcode-ignore="true"
                        autoFocus
                      />
                      <button
                        onClick={() => updateCategory.mutate({ id: c.id, name: editingName })}
                        disabled={updateCategory.isLoading || editingName.length < 2}
                        className="yc-btn-success !py-1.5 !px-3 text-xs"
                      >
                        {t("categoriesScreen.saveButton")}
                      </button>
                      <button 
                        onClick={() => setEditingId(null)} 
                        className="yc-btn-secondary !py-1.5 !px-3 text-xs"
                      >
                        {t("categoriesScreen.cancelButton")}
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-[var(--text-primary)]">{c.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(c.id);
                            setEditingName(c.name);
                          }}
                          className="yc-btn-secondary !py-1.5 !px-3 text-xs"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                          {t("categoriesScreen.editButton")}
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id, c.name)} 
                          className="text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)] p-1.5 rounded-md transition-colors"
                          title={t("categoriesScreen.deleteButton")}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {!categories.isLoading && (categories.data ?? []).length === 0 && (
              <div className="p-8 text-center text-[var(--text-muted)] flex flex-col items-center gap-2 animate-fade-in">
                <svg className="w-12 h-12 text-[var(--color-gray-300)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                {t("categoriesScreen.emptyState")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}