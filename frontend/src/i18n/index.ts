// src/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./locales/ar.json";
import fr from "./locales/fr.json";

export const RTL_LANGUAGES = ["ar"];

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    fr: { translation: fr },
  },
  lng: "ar", // اللغة الافتراضية عند أول تشغيل (يُقرأ لاحقًا من app_settings عبر IPC)
  fallbackLng: "ar",
  interpolation: { escapeValue: false }, // React يهرّب المخرجات أصلاً (وقاية XSS)
});

/**
 * يُستدعى عند تغيير اللغة من شاشة الإعدادات — يبدّل اتجاه <html dir="..."> تلقائيًا.
 * ضروري لأن العربية RTL والفرنسية LTR، ويجب أن يبدّل التخطيط بالكامل وليس النص فقط.
 */
export function changeLanguage(lang: "ar" | "fr") {
  i18n.changeLanguage(lang);
  document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr";
  document.documentElement.lang = lang;
}

export default i18n;
