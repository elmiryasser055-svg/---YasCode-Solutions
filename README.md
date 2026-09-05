
```
YasCode-Supperette-Project
├─ backend
│  ├─ back-end.md
│  ├─ lib
│  │  ├─ auth.test.ts
│  │  ├─ auth.ts
│  │  ├─ backup.ts
│  │  ├─ barcodeGenerator.ts
│  │  ├─ db.ts
│  │  ├─ env.ts
│  │  ├─ logger.ts
│  │  ├─ printer.ts
│  │  └─ rateLimit.ts
│  ├─ middleware
│  │  ├─ authorize.test.ts
│  │  ├─ errors.ts
│  │  ├─ ipcAuthGuard.ts
│  │  ├─ ipcAuthorize.ts
│  │  ├─ ipcErrorHandler.ts
│  │  ├─ ipcValidate.test.ts
│  │  └─ ipcValidate.ts
│  ├─ modules
│  │  ├─ auth
│  │  │  ├─ auth.controller.ts
│  │  │  ├─ auth.ipc.ts
│  │  │  ├─ auth.schema.ts
│  │  │  └─ auth.service.ts
│  │  ├─ backup
│  │  │  ├─ backup.controller.ts
│  │  │  ├─ backup.ipc.ts
│  │  │  ├─ backup.schema.ts
│  │  │  └─ backup.service.ts
│  │  ├─ cash-register
│  │  │  ├─ cash-register.controller.ts
│  │  │  ├─ cash-register.ipc.ts
│  │  │  ├─ cash-register.schema.ts
│  │  │  └─ cash-register.service.ts
│  │  ├─ categories
│  │  │  ├─ categories.controller.ts
│  │  │  ├─ categories.ipc.ts
│  │  │  ├─ categories.schema.ts
│  │  │  └─ categories.service.ts
│  │  ├─ inventory
│  │  │  ├─ inventory.controller.ts
│  │  │  ├─ inventory.ipc.ts
│  │  │  ├─ inventory.schema.ts
│  │  │  ├─ inventory.service.test.ts
│  │  │  └─ inventory.service.ts
│  │  ├─ printing
│  │  │  ├─ printing.controller.ts
│  │  │  ├─ printing.ipc.ts
│  │  │  ├─ printing.schema.ts
│  │  │  └─ printing.service.ts
│  │  ├─ products
│  │  │  ├─ products.controller.ts
│  │  │  ├─ products.csv.service.ts
│  │  │  ├─ products.ipc.ts
│  │  │  ├─ products.schema.ts
│  │  │  ├─ products.service.test.ts
│  │  │  └─ products.service.ts
│  │  ├─ purchases
│  │  │  ├─ purchases.controller.ts
│  │  │  ├─ purchases.ipc.ts
│  │  │  ├─ purchases.schema.ts
│  │  │  └─ purchases.service.ts
│  │  ├─ registerAllIpcHandlers.ts
│  │  ├─ reports
│  │  │  ├─ reports.controller.ts
│  │  │  ├─ reports.ipc.ts
│  │  │  ├─ reports.schema.ts
│  │  │  └─ reports.service.ts
│  │  ├─ returns
│  │  │  ├─ returns.controller.ts
│  │  │  ├─ returns.ipc.ts
│  │  │  ├─ returns.schema.ts
│  │  │  └─ returns.service.ts
│  │  ├─ sales
│  │  │  ├─ sales.controller.ts
│  │  │  ├─ sales.ipc.ts
│  │  │  ├─ sales.schema.ts
│  │  │  └─ sales.service.ts
│  │  ├─ settings
│  │  │  ├─ settings.controller.ts
│  │  │  ├─ settings.ipc.ts
│  │  │  ├─ settings.schema.ts
│  │  │  └─ settings.service.ts
│  │  └─ suppliers
│  │     ├─ suppliers.controller.ts
│  │     ├─ suppliers.ipc.ts
│  │     ├─ suppliers.schema.ts
│  │     └─ suppliers.service.ts
│  └─ test-utils
│     └─ setupTestEnv.ts
├─ build
│  └─ icon.ico
├─ db
│  └─ schema.ts
├─ deploy
│  ├─ Deploy.md
│  └─ package.json
├─ drizzle
│  └─ migrations
│     ├─ 0000_workable_lady_vermin.sql
│     └─ meta
│        ├─ 0000_snapshot.json
│        └─ _journal.json
├─ drizzle.config.ts
├─ e2e
│  └─ login.spec.ts
├─ frontend
│  ├─ electron
│  │  ├─ main.ts
│  │  └─ preload.ts
│  ├─ front-end.md
│  ├─ index.html
│  └─ src
│     ├─ App.tsx
│     ├─ components
│     │  ├─ backup
│     │  │  └─ BackupScreen.tsx
│     │  ├─ cash-register
│     │  │  └─ CashRegisterScreen.tsx
│     │  ├─ categories
│     │  │  └─ CategoriesScreen.tsx
│     │  ├─ inventory
│     │  │  ├─ InventoryScreen.tsx
│     │  │  └─ StockAdjustmentForm.tsx
│     │  ├─ layout
│     │  │  ├─ ConfirmDialogHost.tsx
│     │  │  ├─ ErrorBoundary.tsx
│     │  │  ├─ LanguageSwitcher.tsx
│     │  │  ├─ LoginScreen.tsx
│     │  │  ├─ Sidebar.test.tsx
│     │  │  └─ Sidebar.tsx
│     │  ├─ Nouveau dossier
│     │  ├─ pos
│     │  │  ├─ EditSaleForm.tsx
│     │  │  ├─ QuickProducts.tsx
│     │  │  ├─ ReturnForm.tsx
│     │  │  └─ SaleScreen.tsx
│     │  ├─ products
│     │  │  ├─ ProductForm.tsx
│     │  │  └─ ProductsScreen.tsx
│     │  ├─ purchases
│     │  │  └─ NewPurchaseForm.tsx
│     │  ├─ reports
│     │  │  └─ ReportsScreen.tsx
│     │  ├─ settings
│     │  │  └─ SettingsScreen.tsx
│     │  ├─ suppliers
│     │  │  ├─ SupplierDetail.tsx
│     │  │  └─ SuppliersScreen.tsx
│     │  ├─ ui
│     │  └─ users
│     │     └─ UsersScreen.tsx
│     ├─ hooks
│     │  ├─ useBarcodeScanner.ts
│     │  ├─ useIpcMutation.test.ts
│     │  ├─ useIpcMutation.ts
│     │  ├─ useIpcQuery.ts
│     │  ├─ useKeyboardShortcuts.ts
│     │  └─ useSound.ts
│     ├─ i18n
│     │  ├─ index.ts
│     │  └─ locales
│     │     ├─ ar.json
│     │     └─ fr.json
│     ├─ lib
│     │  ├─ ipcClient.ts
│     │  ├─ toast.tsx
│     │  └─ utils.ts
│     ├─ main.tsx
│     ├─ store
│     │  ├─ authStore.ts
│     │  ├─ cartStore.test.ts
│     │  ├─ cartStore.ts
│     │  ├─ cashRegisterStore.ts
│     │  ├─ confirmStore.test.ts
│     │  └─ confirmStore.ts
│     ├─ styles
│     │  ├─ EXAMPLE.md
│     │  ├─ globals.css
│     │  └─ README.md
│     └─ test-setup.ts
├─ logs
├─ package-lock.json
├─ package.json
├─ playwright.config.ts
├─ postcss.config.js
├─ ProjectAnalysis.md
├─ README.md
├─ RUNNING.md
├─ schemaDB.md
├─ scripts
│  ├─ seed-all.ts
│  └─ seed-owner.ts
├─ tailwind.config.js
├─ tsconfig.electron.json
├─ tsconfig.json
├─ vite.config.mts
└─ vitest.workspace.ts

```