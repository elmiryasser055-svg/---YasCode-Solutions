// src/components/layout/Sidebar.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIsOwner, useAuthStore } from "../../store/authStore";
import { confirm } from "../../store/confirmStore";
import type { Screen } from "../../App";
import { LanguageSwitcher } from "./LanguageSwitcher";
import {
  Store,
  ShoppingCart,
  Boxes,
  Package,
  Tags,
  Truck,
  ShoppingBag,
  Wallet,
  ChartNoAxesCombined,
  Users,
  Settings,
  DatabaseBackup,
  LogOut,
  Crown,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
} from "lucide-react";

interface Props {
  active: Screen;
  onNavigate: (screen: Screen) => void;
}

const NAV_ICONS: Record<Screen, React.ComponentType<{ className?: string }>> = {
  pos: ShoppingCart,
  inventory: Boxes,
  products: Package,
  categories: Tags,
  suppliers: Truck,
  purchases: ShoppingBag,
  cashRegister: Wallet,
  reports: ChartNoAxesCombined,
  users: Users,
  settings: Settings,
  backup: DatabaseBackup,
};

type Theme = "light" | "dark";
const THEME_STORAGE_KEY = "yc-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function Sidebar({ active, onNavigate }: Props) {
  const { t } = useTranslation();
  const isOwner = useIsOwner();
  const logout = useAuthStore((s) => s.logout);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  const items: Array<{ key: Screen; label: string; ownerOnly?: boolean }> = [
    { key: "pos", label: t("app.screen.pos") },
    { key: "inventory", label: t("app.screen.inventory") },
    { key: "products", label: t("app.screen.products"), ownerOnly: true },
    { key: "categories", label: t("app.screen.categories"), ownerOnly: true },
    { key: "suppliers", label: t("app.screen.suppliers"), ownerOnly: true },
    // { key: "purchases", label: t("app.screen.purchases"), ownerOnly: true },
    { key: "cashRegister", label: t("app.screen.cashRegister") },
    { key: "reports", label: t("app.screen.reports"), ownerOnly: true },
    { key: "users", label: t("app.screen.users"), ownerOnly: true },
    { key: "settings", label: t("app.screen.settings"), ownerOnly: true },
    { key: "backup", label: t("app.screen.backup"), ownerOnly: true },
  ];

  const visibleItems = items.filter((item) => !item.ownerOnly || isOwner);

  async function handleLogout() {
    const confirmed = await confirm(
      t("sidebar.logoutConfirm"),
      { danger: false }
    );
    if (confirmed) logout();
  }

  return (
    <aside
      className="flex h-full flex-col border-e"
      style={{
        width: collapsed ? "76px" : "240px",
        transition: "width var(--transition-normal)",
        borderColor: "var(--border-light)",
        background: "var(--bg-sidebar)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      {/* Header / Logo */}
      <div
        className="flex items-center gap-3 border-b p-4"
        style={{ borderColor: "var(--border-light)" }}
      >
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)]"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))",
            boxShadow: "0 2px 8px rgb(160 20 73 / 0.25)",
          }}
        >
          <Store className="h-5 w-5 text-white" strokeWidth={1.5} />
        </div>
        <div
          className="min-w-0 overflow-hidden"
          style={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : "auto",
            transition: "opacity var(--transition-fast), width var(--transition-normal)",
          }}
        >
          <h1 className="whitespace-nowrap text-sm font-bold text-[var(--text-primary)]">
            YasCode
          </h1>
          <p className="whitespace-nowrap text-[10px] text-[var(--text-muted)]">Supérette</p>
        </div>
      </div>

      {/* Toggle collapse/expand + Toggle theme */}
      <div
        className="flex items-center gap-1 border-b p-2"
        style={{
          borderColor: "var(--border-light)",
          justifyContent: collapsed ? "center" : "space-between",
          flexDirection: collapsed ? "column" : "row",
        }}
      >
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? t("sidebar.lightMode") : t("sidebar.darkMode")}
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
          <span
            key={theme}
            className="flex items-center justify-center animate-fade-in-scale"
          >
            {theme === "dark" ? (
              <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} />
            ) : (
              <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />
            )}
          </span>
        </button>

        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? t("sidebar.expandMenu") : t("sidebar.collapseMenu")}
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
          <span
            className="flex items-center justify-center transition-transform duration-300"
            style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.75} />
            )}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        <ul className="space-y-1">
          {visibleItems.map((item, index) => {
            const isActive = active === item.key;
            const Icon = NAV_ICONS[item.key];
            return (
              <li
                key={item.key}
                className="animate-slide-in-right"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <button
                  onClick={() => onNavigate(item.key)}
                  title={collapsed ? item.label : undefined}
                  className={`yc-sidebar-item ${isActive ? "active" : ""}`}
                  style={{ justifyContent: collapsed ? "center" : "flex-start" }}
                >
                  <Icon
                    className={`h-[18px] w-[18px] flex-shrink-0 transition-transform ${
                      isActive ? "scale-110" : ""
                    }`}
                    strokeWidth={1.75}
                  />
                  <span
                    className="overflow-hidden whitespace-nowrap"
                    style={{
                      opacity: collapsed ? 0 : 1,
                      width: collapsed ? 0 : "auto",
                      transition: "opacity var(--transition-fast), width var(--transition-normal)",
                    }}
                  >
                    {item.label}
                  </span>
                  {isActive && !collapsed && (
                    <span className="ms-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Divider */}
      <div className="yc-divider mx-3" />

      {/* Footer: Language + User info + Logout */}
      <div className="p-3">
        <div className="mb-3" style={{ display: "flex", justifyContent: collapsed ? "center" : "stretch" }}>
          <LanguageSwitcher collapsed={collapsed} />
        </div>

        <div
          className="mb-3 flex items-center gap-2 rounded-[var(--radius-md)] p-2"
          style={{
            background: "var(--bg-hover)",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--color-primary-100)" }}
          >
            {isOwner ? (
              <Crown className="h-4 w-4 text-[var(--color-primary-700)]" strokeWidth={1.75} />
            ) : (
              <User className="h-4 w-4 text-[var(--color-primary-700)]" strokeWidth={1.75} />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                {isOwner ? t("sidebar.owner") : t("sidebar.cashier")}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {isOwner ? "Owner" : "Cashier"}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          title={collapsed ? t("sidebar.logout") : undefined}
          className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-all"
          style={{
            color: "var(--color-danger-500)",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-danger-50)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.75} />
          {!collapsed && <span>{t("sidebar.logout")}</span>}
        </button>
      </div>
    </aside>
  );
}