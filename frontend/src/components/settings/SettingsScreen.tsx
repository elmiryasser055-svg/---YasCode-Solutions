// src/components/settings/SettingsScreen.tsx
//
// يسدّ فجوة: موديول settings (الباك-إند) أُضيف لكن بلا واجهة تستدعيه.
// owner فقط للتعديل (القراءة نفسها بلا مصادقة في الباك-إند، راجع back-end.md § 7-ب).

import { useEffect, useState } from "react";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { changeLanguage } from "../../i18n";

export function SettingsScreen() {
  const settings = useIpcQuery(() => api().settings.getAll());
  const [printerName, setPrinterName] = useState("");
  const [expiryWarningDays, setExpiryWarningDays] = useState("30");
  const [language, setLanguage] = useState<"ar" | "fr">("ar");

  useEffect(() => {
    if (settings.data) {
      setPrinterName(settings.data.printerName ?? "");
      setExpiryWarningDays(settings.data.expiryWarningDays ?? "30");
      setLanguage((settings.data.language as "ar" | "fr") ?? "ar");
    }
  }, [settings.data]);

  const setSetting = useIpcMutation(api().settings.set);

  async function handleSave() {
    await setSetting.mutate({ key: "printerName", value: printerName });
    await setSetting.mutate({ key: "expiryWarningDays", value: expiryWarningDays });
    await setSetting.mutate({ key: "language", value: language });
    changeLanguage(language); // تطبيق فوري على الواجهة الحالية، وليس فقط عند إعادة الفتح
    settings.refetch();
  }

  return (
    <div className="mx-auto mt-6 max-w-md space-y-4 p-4">
      <h1 className="text-xl font-bold">الإعدادات</h1>

      <div className="space-y-3 rounded-lg border p-4">
        <label className="block text-sm">
          اللغة الافتراضية
          <select
            className="mt-1 w-full rounded border p-2"
            value={language}
            onChange={(e) => setLanguage(e.target.value as "ar" | "fr")}
          >
            <option value="ar">العربية</option>
            <option value="fr">Français</option>
          </select>
        </label>

        <label className="block text-sm">
          اسم الطابعة الحرارية (كما تظهر في نظام التشغيل)
          <input
            className="mt-1 w-full rounded border p-2"
            value={printerName}
            onChange={(e) => setPrinterName(e.target.value)}
            placeholder="مثال: XP-58"
            data-barcode-ignore="true"
          />
        </label>

        <label className="block text-sm">
          عدد أيام تنبيه "قرب انتهاء الصلاحية"
          <input
            type="number"
            className="mt-1 w-full rounded border p-2"
            value={expiryWarningDays}
            onChange={(e) => setExpiryWarningDays(e.target.value)}
            data-barcode-ignore="true"
          />
        </label>

        {setSetting.error && <p className="text-sm text-red-600">{setSetting.error}</p>}

        <button
          onClick={handleSave}
          disabled={setSetting.isLoading}
          className="w-full rounded-md bg-blue-600 py-2 text-white disabled:opacity-50"
        >
          {setSetting.isLoading ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </button>
      </div>
    </div>
  );
}
