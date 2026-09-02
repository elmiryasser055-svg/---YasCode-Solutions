// src/components/backup/BackupScreen.tsx
//
// ⭐ يسدّ فجوة: lib/backup.ts يأخذ نسخًا احتياطية دورية تلقائية منذ المرحلة 3،
// لكن لم تكن هناك أي واجهة لرؤيتها أو استعادة إحداها عند الحاجة الفعلية.

import { useState } from "react";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { confirm } from "../../store/confirmStore";

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
    <div className="mx-auto mt-6 max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold">النسخ الاحتياطي</h1>
      <p className="text-sm text-gray-500">
        يأخذ التطبيق نسخة احتياطية تلقائية كل 6 ساعات، بالإضافة لنسخة قبل كل تحديث. يمكنك استعادة
        أي نسخة سابقة من هنا عند الحاجة.
      </p>

      {backups.isLoading && <p className="text-sm text-gray-400">جاري التحميل...</p>}
      {backups.error && <p className="text-sm text-red-600">{backups.error}</p>}

      {restoreBackup.error && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-600">{restoreBackup.error}</p>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-start">التاريخ</th>
            <th className="p-2 text-start">الحجم</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {(backups.data ?? []).map((b) => (
            <tr key={b.fileName} className="border-b">
              <td className="p-2">{new Date(b.createdAt).toLocaleString("ar")}</td>
              <td className="p-2">{formatSize(b.sizeBytes)}</td>
              <td className="p-2">
                <button
                  onClick={() => handleRestore(b.fileName, b.createdAt)}
                  disabled={restoreBackup.isLoading}
                  className="rounded border border-orange-500 px-3 py-1 text-xs text-orange-600 disabled:opacity-50"
                >
                  {restoringFile === b.fileName && restoreBackup.isLoading
                    ? "جاري الاستعادة..."
                    : "استعادة هذه النسخة"}
                </button>
              </td>
            </tr>
          ))}
          {!backups.isLoading && (backups.data ?? []).length === 0 && (
            <tr>
              <td colSpan={3} className="p-4 text-center text-gray-400">
                لا توجد نسخ احتياطية بعد
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
