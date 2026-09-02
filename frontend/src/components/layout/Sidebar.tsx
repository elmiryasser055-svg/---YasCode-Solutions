// src/components/layout/Sidebar.tsx
import { useTranslation } from "react-i18next";
import { useIsOwner, useAuthStore } from "../../store/authStore";
import type { Screen } from "../../App";

interface Props {
  active: Screen;
  onNavigate: (screen: Screen) => void;
}

/** روابط التنقّل الرئيسية — بعضها مخفي عن الكاشير (نفس أدوار المرحلة 1) */
export function Sidebar({ active, onNavigate }: Props) {
  const { t } = useTranslation();
  const isOwner = useIsOwner();
  const logout = useAuthStore((s) => s.logout);

  const items: Array<{ key: Screen; label: string; ownerOnly?: boolean }> = [
    { key: "pos", label: t("pos.title") },
    { key: "inventory", label: t("inventory.title") },
    { key: "products", label: "المنتجات", ownerOnly: true },
    { key: "categories", label: "الفئات", ownerOnly: true },
    { key: "suppliers", label: "الموردون", ownerOnly: true },
    { key: "cashRegister", label: t("cashRegister.title") },
    { key: "reports", label: "التقارير", ownerOnly: true },
    { key: "users", label: "الموظفون", ownerOnly: true },
    { key: "settings", label: "الإعدادات", ownerOnly: true },
    { key: "backup", label: "النسخ الاحتياطي", ownerOnly: true },
  ];

  return (
    <nav className="flex h-full w-56 flex-col justify-between border-e p-3">
      <ul className="space-y-1">
        {items
          .filter((item) => !item.ownerOnly || isOwner)
          .map((item) => (
            <li key={item.key}>
              <button
                onClick={() => onNavigate(item.key)}
                className={`w-full rounded-md p-2 text-start text-sm ${
                  active === item.key ? "bg-blue-600 text-white" : "hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
      </ul>

      <button onClick={() => logout()} className="rounded-md border p-2 text-sm text-red-600">
        تسجيل الخروج
      </button>
    </nav>
  );
}
