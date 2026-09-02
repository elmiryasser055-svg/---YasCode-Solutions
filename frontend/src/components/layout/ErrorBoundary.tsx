// src/components/layout/ErrorBoundary.tsx
//
// ⭐ يسدّ فجوة: بدون هذا، أي خطأ غير متوقع في أي مكوّن (حتى بسيط) كان يُسقط
// كل الواجهة إلى شاشة بيضاء بلا أي رسالة — سيء بشكل خاص في تطبيق POS يعمل
// طوال اليوم على جهاز واحد بلا "تحديث صفحة" سهل ومتاح دومًا للكاشير.
//
// React Error Boundaries يجب أن تكون class component (لا يوجد مكافئ hook
// رسمي حتى الآن) — هذا الاستثناء الوحيد في المشروع لاستخدام class بدل functional.

import { Component, type ErrorInfo, type ReactNode } from "react";

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
    // في تطبيق حقيقي: تسجيل هذا أيضًا عبر IPC إلى lib/logger.ts في الباك-إند
    // (main process) حتى يظهر في نفس ملف الـ log المستخدم لأخطاء الباك-إند —
    // غير مُنفَّذ هنا حاليًا، خارج نطاق هذا التحديث.
    // eslint-disable-next-line no-console
    console.error("خطأ غير متوقع في الواجهة:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-xl font-bold text-red-600">حدث خطأ غير متوقع</h1>
          <p className="max-w-md text-gray-600">
            نعتذر، حدث خطأ في الواجهة. بياناتك في قاعدة البيانات آمنة ولم تتأثر — هذا خطأ في العرض
            فقط. حاول إعادة تحميل التطبيق.
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
            إعادة تحميل التطبيق
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
