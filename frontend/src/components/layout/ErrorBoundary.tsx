// src/components/layout/ErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from "react";
import i18n from "../../i18n"; // استيراد نسخة i18n مباشرة ل class component

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(i18n.t("errorBoundary.title"), error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-xl font-bold text-red-600">
            {i18n.t("errorBoundary.title")}
          </h1>
          <p className="max-w-md text-gray-600">
            {i18n.t("errorBoundary.description")}
          </p>
          {this.state.errorMessage && (
            <pre className="max-w-lg overflow-auto rounded bg-gray-100 p-3 text-start text-xs text-gray-500">
              {this.state.errorMessage}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="rounded-md bg-blue-600 px-6 py-2 text-white"
          >
            {i18n.t("errorBoundary.reload")}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}