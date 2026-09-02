// src/components/layout/LanguageSwitcher.tsx
import { useTranslation } from "react-i18next";
import { changeLanguage } from "../../i18n";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex gap-1 text-sm">
      <button
        onClick={() => changeLanguage("ar")}
        className={`rounded px-2 py-1 ${i18n.language === "ar" ? "bg-blue-600 text-white" : ""}`}
      >
        عربي
      </button>
      <button
        onClick={() => changeLanguage("fr")}
        className={`rounded px-2 py-1 ${i18n.language === "fr" ? "bg-blue-600 text-white" : ""}`}
      >
        Français
      </button>
    </div>
  );
}
