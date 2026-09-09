// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import { LicenseGate } from "./components/layout/LicenseGate"; // عدّل المسار حسب مكان وضعك للملف
import "./i18n"; // تهيئة i18next مرة واحدة قبل أي render
//@ts-ignore
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LicenseGate>
        <App />
      </LicenseGate>
    </ErrorBoundary>
  </React.StrictMode>
);