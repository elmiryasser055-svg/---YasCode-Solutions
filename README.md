
```
yasStore
├─ backend
│  ├─ back-end.md
│  ├─ lib
│  │  ├─ auth.test.ts
│  │  ├─ auth.ts
│  │  ├─ backup.ts
│  │  ├─ barcodeGenerator.ts
│  │  ├─ db.ts
│  │  ├─ deviceId.ts
│  │  ├─ env.ts
│  │  ├─ licenseCrypto.ts
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
│  │  ├─ licensing
│  │  │  ├─ licensing.controller.ts
│  │  │  ├─ licensing.ipc.ts
│  │  │  ├─ licensing.schema.ts
│  │  │  └─ licensing.service.ts
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
│     └─ meta
│        └─ _journal.json
├─ drizzle.config.ts
├─ e2e
│  └─ login.spec.ts
├─ extracted
│  └─ package.json
├─ extracted2
│  └─ package.json
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
│     │  │  ├─ LicenseGate.tsx
│     │  │  ├─ LoginScreen.tsx
│     │  │  ├─ Modal.tsx
│     │  │  ├─ SetupScreen.tsx
│     │  │  ├─ Sidebar.test.tsx
│     │  │  └─ Sidebar.tsx
│     │  ├─ Nouveau dossier
│     │  ├─ pos
│     │  │  ├─ CartPanel.tsx
│     │  │  ├─ CreateProductModal.tsx
│     │  │  ├─ EditSaleForm.tsx
│     │  │  ├─ LastSaleItemsTable.tsx
│     │  │  ├─ PaymentPanel.tsx
│     │  │  ├─ QuickProducts.tsx
│     │  │  ├─ ReturnForm.tsx
│     │  │  ├─ SaleScreen.tsx
│     │  │  ├─ SearchBar.tsx
│     │  │  └─ TotalSummary.tsx
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
│     │  ├─ productAvailability.ts
│     │  ├─ sound.ts
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
│     ├─ test-setup.ts
│     └─ utils
│        └─ licenseCrypto.ts
├─ logs
├─ package-lock.json
├─ package.json
├─ pics-from-project
│  ├─ Capture d'écran 2026-09-29 123539.png
│  ├─ Capture d'écran 2026-09-29 123900.png
│  ├─ Capture d'écran 2026-09-29 125810.png
│  ├─ Capture d'écran 2026-09-29 125909.png
│  ├─ Capture d'écran 2026-09-29 130006.png
│  ├─ Capture d'écran 2026-09-29 130050.png
│  ├─ Capture d'écran 2026-09-29 135535.png
│  └─ Capture d'écran 2026-09-29 135655.png
├─ playwright.config.ts
├─ pos.db
├─ postcss.config.js
├─ ProjectAnalysis.md
├─ public
│  └─ assets
│     ├─ file_000000009ecc8210a882899bb6d89444.png
│     ├─ logo.png
│     └─ YasStor.png
├─ README.md
├─ RUNNING.md
├─ schemaDB.md
├─ scripts
│  ├─ migrate.ts
│  ├─ seed-all.ts
│  ├─ seed-owner.ts
│  └─ seed-reports.ts
├─ store.db
├─ tailwind.config.js
├─ tsconfig.electron.json
├─ tsconfig.json
├─ usb
├─ vite.config.mts
└─ vitest.workspace.ts

```