// src/App.tsx
import { useEffect, useState, useRef } from "react";
import { Toaster } from "react-hot-toast";

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
import { LoginScreen } from "./components/layout/LoginScreen";
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
  purchases: () => null, // placeholder — will be implemented
  cashRegister: CashRegisterScreen,
  reports: ReportsScreen,
  users: UsersScreen,
  settings: SettingsScreen,
  backup: BackupScreen,
};

const SCREEN_TITLES: Record<Screen, string> = {
  pos: "نقطة البيع",
  inventory: "المخزون",
  products: "المنتجات",
  categories: "الفئات",
  suppliers: "الموردون",
  purchases: "المشتريات",
  cashRegister: "الصندوق",
  reports: "التقارير",
  users: "الموظفون",
  settings: "الإعدادات",
  backup: "النسخ الاحتياطي",
};

const SCREEN_SUBTITLES: Record<Screen, string> = {
  pos: "إدارة عمليات البيع اليومية",
  inventory: "متابعة الكميات والحركات",
  products: "إدارة قائمة المنتجات",
  categories: "تنظيم فئات المنتجات",
  suppliers: "إدارة الموردين والمشتريات",
  purchases: "طلبات وفواتير الشراء",
  cashRegister: "فتح وإغلاق الصندوق",
  reports: "تقارير المبيعات والأداء",
  users: "إدارة حسابات الموظفين",
  settings: "إعدادات النظام العامة",
  backup: "نسخ احتياطي واستعادة البيانات",
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
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden flex-col items-end leading-tight sm:flex">
      <span className="text-sm font-semibold text-[var(--text-primary)]">
        {now.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}
      </span>
      <span className="text-xs text-[var(--text-muted)]">
        {now.toLocaleDateString("ar-DZ", { weekday: "long", day: "numeric", month: "long" })}
      </span>
    </div>
  );
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshCashRegister = useCashRegisterStore((s) => s.refresh);
  const [activeScreen, setActiveScreen] = useState<Screen>("pos");
  const [screenKey, setScreenKey] = useState(0);
  const prevScreen = useRef<Screen>("pos");

  useEffect(() => {
    if (isAuthenticated) refreshCashRegister();
  }, [isAuthenticated, refreshCashRegister]);

  const handleNavigate = (screen: Screen) => {
    if (screen === activeScreen) return;
    prevScreen.current = activeScreen;
    setActiveScreen(screen);
    setScreenKey((k) => k + 1);
  };

  if (!isAuthenticated) return <LoginScreen />;

  const ActiveComponent = SCREENS[activeScreen];
  const ActiveIcon = SCREEN_ICONS[activeScreen];

  return (
    <div className="flex h-screen bg-[var(--bg-body)]">
      <ConfirmDialogHost />
      <Toaster
    position="top-center"
    gutter={12}
    toastOptions={{
      // مهم: نفرّغ الستايل الافتراضي لأن renderToast يتولى كل التصميم بنفسه
      style: { background: "transparent", boxShadow: "none", padding: 0 },
    }}
  />
      <Sidebar active={activeScreen} onNavigate={handleNavigate} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        {/* <header className="flex items-center justify-between border-b border-[var(--border-light)] bg-[var(--bg-card)] px-6 py-3.5 shadow-[var(--shadow-xs)]">
          <div className="flex items-center gap-3.5 animate-fade-in-down">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)]"
              style={{
                background: "linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))",
                boxShadow: "0 2px 8px rgb(37 99 235 / 0.25)",
              }}
            >
              <ActiveIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base font-bold leading-tight text-[var(--text-primary)]">
                {SCREEN_TITLES[activeScreen]}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {SCREEN_SUBTITLES[activeScreen]}
              </p>
            </div>
            {activeScreen === "pos" && (
              <span className="yc-badge yc-badge-green gap-1.5">
                <Circle className="h-2 w-2 animate-pulse-soft fill-current" />
                جلسة نشطة
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <LiveClock />
            <div className="h-8 w-px bg-[var(--border-light)]" />
            <LanguageSwitcher />
          </div>
        </header> */}

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