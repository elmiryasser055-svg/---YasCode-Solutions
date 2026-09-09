// src/App.tsx
import { useEffect, useState, useRef } from "react";
import { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";

import {
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
  Circle,
} from "lucide-react";
import { useAuthStore } from "./store/authStore";
import { useCashRegisterStore } from "./store/cashRegisterStore";
import { unwrap } from "./lib/ipcClient"; // ⭐ استيراد unwrap

import { LoginScreen } from "./components/layout/LoginScreen";
import SetupScreen from "./components/layout/SetupScreen"; // ⭐ استيراد شاشة الإعداد

import { Sidebar } from "./components/layout/Sidebar";
import { LanguageSwitcher } from "./components/layout/LanguageSwitcher";
import { ConfirmDialogHost } from "./components/layout/ConfirmDialogHost";
import { SaleScreen } from "./components/pos/SaleScreen";
import { InventoryScreen } from "./components/inventory/InventoryScreen";
import { SuppliersScreen } from "./components/suppliers/SuppliersScreen";
import { CashRegisterScreen } from "./components/cash-register/CashRegisterScreen";
import { ReportsScreen } from "./components/reports/ReportsScreen";
import { ProductsScreen } from "./components/products/ProductsScreen";
import { UsersScreen } from "./components/users/UsersScreen";
import { SettingsScreen } from "./components/settings/SettingsScreen";
import { CategoriesScreen } from "./components/categories/CategoriesScreen";
import { BackupScreen } from "./components/backup/BackupScreen";

export type Screen =
  | "pos"
  | "inventory"
  | "products"
  | "categories"
  | "suppliers"
  | "purchases"
  | "cashRegister"
  | "reports"
  | "users"
  | "settings"
  | "backup";

const SCREENS: Record<Screen, React.ComponentType> = {
  pos: SaleScreen,
  inventory: InventoryScreen,
  products: ProductsScreen,
  categories: CategoriesScreen,
  suppliers: SuppliersScreen,
  purchases: () => null,
  cashRegister: CashRegisterScreen,
  reports: ReportsScreen,
  users: UsersScreen,
  settings: SettingsScreen,
  backup: BackupScreen,
};

const SCREEN_ICONS: Record<Screen, React.ComponentType<{ className?: string }>> = {
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

function LiveClock() {
  const { i18n } = useTranslation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden flex-col items-end leading-tight sm:flex">
      <span className="text-sm font-semibold text-[var(--text-primary)]">
        {now.toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" })}
      </span>
      <span className="text-xs text-[var(--text-muted)]">
        {now.toLocaleDateString(i18n.language, { weekday: "long", day: "numeric", month: "long" })}
      </span>
    </div>
  );
}

export default function App() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshCashRegister = useCashRegisterStore((s) => s.refresh);
  const [activeScreen, setActiveScreen] = useState<Screen>("pos");
  const [screenKey, setScreenKey] = useState(0);
  const prevScreen = useRef<Screen>("pos");

  // ⭐ حالة فحص الإعداد الأولي للنظام
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);

  useEffect(() => {
    // فحص ما إذا كان النظام تم إعداده أم لا عند الإقلاع
    unwrap(window.api.auth.isInitialized())
      .then((res) => setIsInitialized(res.isInitialized))
      .catch(() => {
        // في حال حدوث خطأ غير متوقع، نعتبر النظام مهيأً لتفادي حجب المستخدم
        setIsInitialized(true);
      });
  }, []);

  useEffect(() => {
    if (isAuthenticated) refreshCashRegister();
  }, [isAuthenticated, refreshCashRegister]);

  const handleNavigate = (screen: Screen) => {
    if (screen === activeScreen) return;
    prevScreen.current = activeScreen;
    setActiveScreen(screen);
    setScreenKey((k) => k + 1);
  };

  // ⭐ 1. أثناء فحص حالة النظام (شاشة تحميل)
  if (isInitialized === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-body)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--border-light)] border-t-[var(--color-primary-600)]"></div>
      </div>
    );
  }

  // ⭐ 2. إذا لم يتم إعداد النظام (لا يوجد مستخدمين)، اعرض شاشة الإعداد
  if (!isInitialized) {
    return <SetupScreen />;
  }

  // ⭐ 3. إذا لم يسجل المستخدم الدخول، اعرض شاشة تسجيل الدخول
  if (!isAuthenticated) return <LoginScreen />;

  // 4. التطبيق الرئيسي
  const ActiveComponent = SCREENS[activeScreen];
  const ActiveIcon = SCREEN_ICONS[activeScreen];

  return (
    <div className="flex h-screen bg-[var(--bg-body)]">
      <ConfirmDialogHost />
      <Toaster
        position="top-center"
        gutter={12}
        toastOptions={{
          style: { background: "transparent", boxShadow: "none", padding: 0 },
        }}
      />
      <Sidebar active={activeScreen} onNavigate={handleNavigate} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        {/* تم تعليق الهيدر كما في الكود الأصلي الخاص بك
        <header className="flex items-center justify-between border-b border-[var(--border-light)] bg-[var(--bg-card)] px-6 py-3.5 shadow-[var(--shadow-xs)]">
          ...
        </header>
        */}

        {/* Main Content */}
        <main
          key={screenKey}
          className="flex-1 overflow-auto p-5 animate-fade-in-up"
        >
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}