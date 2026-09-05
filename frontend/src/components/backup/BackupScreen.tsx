// src/components/backup/BackupScreen.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { confirm } from "../../store/confirmStore";
import { toast } from "../../lib/toast";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
}

export function BackupScreen() {
  const backups = useIpcQuery(() => api().backup.list());
  const [restoringFile, setRestoringFile] = useState<string | null>(null);

  const restoreBackup = useIpcMutation(api().backup.restore, {
    onSuccess: () => {
      // عمليًا لن يُنفَّذ هذا لأن الباك-إند يستدعي app.exit() فورًا بعد النجاح
      setRestoringFile(null);
    },
    onError: (err) => {
      setRestoringFile(null);
      toast.error(err);
    },
  });

  async function handleRestore(fileName: string, createdAt: string) {
    const confirmed = await confirm(
      `⚠️ تحذير: استعادة هذه النسخة (${new Date(createdAt).toLocaleString("ar")}) ستستبدل كل البيانات الحالية بالكامل، وسيُعاد تشغيل التطبيق فورًا. هل أنت متأكد تمامًا؟`,
      { danger: true }
    );
    if (!confirmed) return;

    setRestoringFile(fileName);
    await restoreBackup.mutate({ fileName });
  }

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col p-6">
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary-50)] text-[var(--color-primary-600)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">النسخ الاحتياطي والاستعادة</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          يأخذ التطبيق نسخة احتياطية تلقائية بشكل دوري. يمكنك استعادة أي نسخة سابقة من هنا عند الحاجة.
        </p>
      </motion.div>

      {/* Warning Box */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="yc-card mb-6 border-[var(--color-danger-200)] bg-[var(--color-danger-50)]"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-danger-100)] text-[var(--color-danger-600)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div>
            <h3 className="font-bold text-[var(--color-danger-700)]">تحذير: عملية حساسة</h3>
            <p className="text-sm text-[var(--color-danger-600)] mt-1">
              استعادة أي نسخة سيستبدل كل البيانات الحالية بالكامل (المنتجات، المبيعات، الإعدادات)، وسيعاد تشغيل التطبيق فوراً. لا يمكن التراجع عن هذه العملية.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Backups Table */}
      <div className="yc-card flex-1 overflow-hidden p-0">
        {backups.isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="animate-spin-slow h-8 w-8 rounded-full border-4 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)]"></div>
          </div>
        ) : backups.error ? (
          <div className="p-4 text-center text-[var(--color-danger-600)]">{backups.error}</div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="yc-table">
              <thead>
                <tr>
                  <th>تاريخ النسخة</th>
                  <th>الحجم</th>
                  <th className="text-left">إجراء</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {(backups.data ?? []).map((b, index) => (
                    <motion.tr
                      key={b.fileName}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: index * 0.01 }}
                    >
                      <td className="font-medium text-[var(--text-primary)]">
                        <div className="flex items-center gap-2">
                          {new Date(b.createdAt).toLocaleString("ar")}
                          {index === 0 && (
                            <span className="yc-badge yc-badge-green">الأحدث</span>
                          )}
                        </div>
                      </td>
                      <td className="text-[var(--text-secondary)]">{formatSize(b.sizeBytes)}</td>
                      <td className="text-left">
                        <button
                          onClick={() => handleRestore(b.fileName, b.createdAt)}
                          disabled={restoreBackup.isLoading}
                          className="yc-btn-secondary !py-1.5 !px-3 text-xs border-[var(--color-warning-200)] text-[var(--color-warning-700)] hover:bg-[var(--color-warning-50)]"
                        >
                          {restoringFile === b.fileName && restoreBackup.isLoading ? (
                            <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"></div>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                          )}
                          <span>استعادة</span>
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                
                {!backups.isLoading && (backups.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-[var(--text-muted)]">
                      <div className="flex flex-col items-center gap-2 animate-fade-in">
                        <svg className="w-12 h-12 text-[var(--color-gray-300)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
                        لا توجد نسخ احتياطية بعد
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}