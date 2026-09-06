// src/components/layout/LanguageSwitcher.tsx
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { changeLanguage } from "../../i18n";

interface Props {
  /** إن كان الشريط الجانبي مطويًا، يُعرض زر مضغوط واحد بدل المفتاحين */
  collapsed?: boolean;
}

type LangCode = "ar" | "fr";

const LANGS: Array<{ code: LangCode; label: string }> = [
  { code: "ar", label: "العربية" },
  { code: "fr", label: "Français" },
];

export function LanguageSwitcher({ collapsed = false }: Props) {
  const { i18n } = useTranslation();
  const current = (i18n.language?.split("-")[0] as LangCode) || "ar";

  // ── الحالة المطوية: زر واحد يبدّل مباشرة إلى اللغة الأخرى ──
  if (collapsed) {
    const other = LANGS.find((l) => l.code !== current) ?? LANGS[0];
    return (
      <button
        onClick={() => changeLanguage(other.code)}
        title={`التبديل إلى ${other.label}`}
        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] transition-all"
        style={{ color: "var(--text-secondary)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-hover)";
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        <Languages className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </button>
    );
  }

  // ── الحالة الموسّعة: مفتاح مقسوم (segmented control) بين اللغتين ──
  return (
    <div
      className="flex items-center gap-0.5 rounded-[var(--radius-md)] p-1"
      style={{ background: "var(--bg-hover)" }}
      role="group"
      aria-label="تبديل اللغة"
    >
      {LANGS.map((l) => {
        const active = current === l.code;
        return (
          <button
            key={l.code}
            onClick={() => changeLanguage(l.code)}
            className="flex-1 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-semibold transition-all"
            style={{
              background: active
                ? "linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))"
                : "transparent",
              color: active ? "var(--text-inverse)" : "var(--text-secondary)",
              boxShadow: active ? "0 2px 8px rgb(160 20 73 / 0.25)" : "none",
            }}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}