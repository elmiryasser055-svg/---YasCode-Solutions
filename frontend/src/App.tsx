// src/App.tsx
//
// تبديل شاشات بسيط بحالة محلية بدل react-router — عدد الشاشات صغير وثابت،
// ولا حاجة لتاريخ متصفح (back/forward) في تطبيق desktop بنافذة واحدة.

import { useEffect, useState } from "react";
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
  cashRegister: CashRegisterScreen,
  reports: ReportsScreen,
  users: UsersScreen,
  settings: SettingsScreen,
  backup: BackupScreen,
};

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshCashRegister = useCashRegisterStore((s) => s.refresh);
  const [activeScreen, setActiveScreen] = useState<Screen>("pos");

  useEffect(() => {
    if (isAuthenticated) refreshCashRegister();
  }, [isAuthenticated, refreshCashRegister]);

  if (!isAuthenticated) return <LoginScreen />;

  const ActiveComponent = SCREENS[activeScreen];

  return (
    <div className="flex h-screen">
      <ConfirmDialogHost />
      <Sidebar active={activeScreen} onNavigate={setActiveScreen} />
      <div className="flex flex-1 flex-col">
        <header className="flex justify-end border-b p-2">
          <LanguageSwitcher />
        </header>
        <main className="flex-1 overflow-auto">
          <ActiveComponent />
        </main>
      </div>
    </div>
  );
}
