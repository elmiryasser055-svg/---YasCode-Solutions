// src/components/settings/SettingsScreen.tsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { changeLanguage } from "../../i18n";
import { toast } from "../../lib/toast";
import { useTranslation } from "react-i18next";

export function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useIpcQuery(() => api().settings.getAll());
  const [printerName, setPrinterName] = useState("");
  const [expiryWarningDays, setExpiryWarningDays] = useState("30");
  const [language, setLanguage] = useState<"ar" | "fr">("ar");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (settings.data) {
      setPrinterName(settings.data.printerName ?? "");
      setExpiryWarningDays(settings.data.expiryWarningDays ?? "30");
      setLanguage((settings.data.language as "ar" | "fr") ?? "ar");
    }
  }, [settings.data]);

  const setSetting = useIpcMutation(api().settings.set, {
    onSuccess: () => toast.success(t("settings.saveSuccess")),
    onError: (err) => toast.error(err),
  });

  const updateCredentialsMutation = useIpcMutation(api().auth.updateCredentials, {
    onSuccess: () => {
      toast.success(t("settings.updateCredsSuccess"));
      setCurrentPassword("");
      setNewUsername("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => toast.error(err),
  });

  async function handleSave() {
    await setSetting.mutate({ key: "printerName", value: printerName });
    await setSetting.mutate({ key: "expiryWarningDays", value: expiryWarningDays });
    await setSetting.mutate({ key: "language", value: language });
    changeLanguage(language);
    settings.refetch();
  }

  async function handleUpdateCredentials() {
    if (newPassword && newPassword !== confirmPassword) {
      toast.error(t("settings.passwordMismatchError"));
      return;
    }
    if (newPassword && newPassword.length < 8) {
      toast.error(t("settings.passwordLengthError"));
      return;
    }
    if (!newUsername && !newPassword) {
      toast.error(t("settings.noChangesError"));
      return;
    }

    await updateCredentialsMutation.mutate({ 
      currentPassword, 
      newUsername: newUsername || undefined, 
      newPassword: newPassword || undefined 
    });
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col p-6">
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary-50)] text-[var(--color-primary-600)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("settings.title")}</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{t("settings.subtitle")}</p>
      </motion.div>

      <div className="flex-1 space-y-6 overflow-y-auto pb-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="yc-card"
        >
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t("settings.general_prefs")}</h3>
          
          <label className="block mb-4">
            <span className="text-[var(--text-primary)] text-sm mb-2 block">{t("settings.default_lang")}</span>
            <div className="inline-flex w-full p-1 bg-[var(--color-gray-100)] rounded-lg">
              {(["ar", "fr"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`relative w-full py-2 text-sm font-medium rounded-md transition-colors ${
                    language === lang ? "text-[var(--color-primary-700)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {language === lang && (
                    <motion.div
                      layoutId="languageIndicator"
                      className="absolute inset-0 bg-white rounded-md shadow-sm"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">
                    {lang === "ar" ? t("settings.arabic") : t("settings.french")}
                  </span>
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="text-[var(--text-primary)] text-sm mb-1.5 block">{t("settings.expiry_warning_days")}</span>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </span>
              <input
                type="number"
                min="1"
                className="yc-input pl-10"
                value={expiryWarningDays}
                onChange={(e) => setExpiryWarningDays(e.target.value)}
                data-barcode-ignore="true"
              />
            </div>
          </label>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="yc-card"
        >
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t("settings.printing_settings")}</h3>
          
          <label className="block">
            <span className="text-[var(--text-primary)] text-sm mb-1.5 block">{t("settings.printer_name")}</span>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
              </span>
              <input
                className="yc-input pl-10"
                value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
                placeholder={t("settings.printer_name_placeholder")}
                data-barcode-ignore="true"
              />
            </div>
          </label>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="yc-card"
        >
          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">{t("settings.update_login_info")}</h3>
          
          <div className="space-y-4">
            <label className="block">
              <span className="text-[var(--text-primary)] text-sm mb-1.5 block">{t("settings.new_username")}</span>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </span>
                <input
                  type="text"
                  className="yc-input pl-10"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder={t("settings.new_username_placeholder")}
                  data-barcode-ignore="true"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[var(--text-primary)] text-sm mb-1.5 block">{t("settings.new_password")}</span>
              <input
                type="password"
                className="yc-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                data-barcode-ignore="true"
              />
            </label>

            <label className="block">
              <span className="text-[var(--text-primary)] text-sm mb-1.5 block">{t("settings.confirm_new_password")}</span>
              <input
                type="password"
                className="yc-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                data-barcode-ignore="true"
              />
            </label>

            <div className="border-t border-[var(--border-light)] pt-4 mt-4">
              <label className="block">
                <span className="text-[var(--text-primary)] text-sm mb-1.5 block font-medium text-[var(--color-danger-600)]">{t("settings.current_password")}</span>
                <input
                  type="password"
                  className="yc-input border-[var(--color-danger-200)] focus:border-[var(--color-danger-400)] focus:ring-[var(--color-danger-100)]"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t("settings.current_password_placeholder")}
                  data-barcode-ignore="true"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleUpdateCredentials}
                disabled={updateCredentialsMutation.isLoading || !currentPassword || (!newUsername && !newPassword)}
                className="yc-btn-secondary py-2.5 px-6"
              >
                {updateCredentialsMutation.isLoading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-[var(--color-primary-600)] border-t-transparent rounded-full"></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                )}
                <span>{t("settings.update_info")}</span>
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-end"
        >
          <button
            onClick={handleSave}
            disabled={setSetting.isLoading}
            className="yc-btn-primary py-3 px-8"
          >
            {setSetting.isLoading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            )}
            <span>{t("settings.save_changes")}</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}