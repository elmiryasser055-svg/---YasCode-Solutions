// frontend/src/components/layout/LicenseGate.tsx
//
// يعيش بجانب ErrorBoundary.tsx و LoginScreen.tsx في نفس مجلد layout/.
// تم تحديث الاستايل ليتوافق مع globals.css (yc-card, yc-btn-primary, etc.)

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldX, Loader2 } from "lucide-react";

type LicenseStatus =
  | { state: "NOT_ACTIVATED" }
  | { state: "ACTIVE"; clientName: string; expiresAt: string; daysLeft: number }
  | { state: "EXPIRED"; clientName: string; expiresAt: string }
  | { state: "TAMPERED" };

declare global {
  interface Window {
    api: {
      license: {
        getStatus: () => Promise<LicenseStatus>;
        activate: (input: { licenseKey: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
      };
      // ... باقي واجهات الـ api عندك (auth, sales, inventory...)
    };
  }
}

export function LicenseGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LicenseStatus | "loading">("loading");
  const [inputKey, setInputKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refreshStatus = async () => {
    const s = await window.api.license.getStatus();
    setStatus(s);
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleActivate = async () => {
    setError(null);
    setSubmitting(true);
    const result = await window.api.license.activate({ licenseKey: inputKey.trim() });
    setSubmitting(false);
    if (result.ok) {
      setInputKey("");
      await refreshStatus();
    } else {
      setError(result.error);
    }
  };

  // 1. حالة التحميل (Loading State)
  if (status === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-body)]">
        <Loader2 className="animate-spin text-[var(--color-primary-500)]" size={40} />
      </div>
    );
  }

  // 2. حالة الترخيص الفعال (Active State)
  if (status.state === "ACTIVE") {
    return <>{children}</>;
  }

  // 3. تجهيز الرسالة والأيقونة بناءً على الحالة
  const renderMessage = () => {
    switch (status.state) {
      case "NOT_ACTIVATED":
        return {
          icon: <ShieldAlert size={48} />,
          iconColor: "text-[var(--color-warning-600)]",
          title: "التطبيق غير مفعّل",
          subtitle: "أدخل مفتاح الترخيص الذي تسلّمته من YasCode Solutions للمتابعة",
        };
      case "EXPIRED":
        return {
          icon: <ShieldX size={48} />,
          iconColor: "text-[var(--color-danger-600)]",
          title: "انتهت صلاحية الاشتراك",
          subtitle: `كان الاشتراك باسم "${status.clientName}" حتى ${new Date(status.expiresAt).toLocaleDateString("ar-DZ")}. أدخل مفتاح تجديد جديد للمتابعة`,
        };
      case "TAMPERED":
        return {
          icon: <ShieldX size={48} />,
          iconColor: "text-[var(--color-danger-600)]",
          title: "تعذّر التحقق من الترخيص",
          subtitle: "تم رصد تغيير غير معتاد في ساعة النظام. يرجى التواصل مع الدعم الفني",
        };
      default:
        return null;
    }
  };

  const msg = renderMessage();

  if (!msg) return null;

  // 4. الواجهة الرئيسية للبوابة (Gate UI)
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-body)] p-4">
      <div className="yc-card max-w-md w-full text-center animate-fade-in-scale">
        {/* الأيقونة */}
        <div className={`flex justify-center mb-6 ${msg.iconColor}`}>
          {msg.icon}
        </div>

        {/* العنوان والنص */}
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          {msg.title}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
          {msg.subtitle}
        </p>

        {/* حقول الإدخال (تظهر في كل الحالات ما عدا TAMPERED) */}
        {status.state !== "TAMPERED" && (
          <div className="space-y-4 text-right">
            <textarea
              className="yc-input font-mono text-center tracking-wider resize-none"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              rows={3}
              dir="ltr"
            />
            
            {/* رسالة الخطأ */}
            {error && (
              <p className="text-sm text-[var(--color-danger-600)] animate-shake flex items-center justify-center gap-2">
                <ShieldX size={16} />
                {error}
              </p>
            )}

            {/* زر التفعيل */}
            <button
              className="yc-btn-primary w-full justify-center"
              onClick={handleActivate}
              disabled={submitting || inputKey.trim().length === 0}
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <ShieldCheck size={18} />
              )}
              <span>تفعيل الترخيص</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}