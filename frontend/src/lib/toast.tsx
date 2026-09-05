// src/lib/toast.ts (أو src/components/toast.ts حسب مكان ملفك)
import hotToast, { type Toast as HotToastInstance } from "react-hot-toast";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { playSuccess, playError } from "./sound"; // ⭐ استيراد الأصوات

type ToastType = "success" | "error" | "info";

const CONFIG: Record<
  ToastType,
  { icon: typeof CheckCircle2; bg: string }
> = {
  success: {
    icon: CheckCircle2,
    bg: "linear-gradient(135deg, var(--color-success-600), var(--color-success-700))",
  },
  error: {
    icon: XCircle,
    bg: "linear-gradient(135deg, var(--color-danger-500), var(--color-danger-600))",
  },
  info: {
    icon: Info,
    bg: "linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))",
  },
};

const DEFAULT_DURATION = 3000;

function renderToast(t: HotToastInstance, message: string, type: ToastType, duration: number) {
  const { icon: Icon, bg } = CONFIG[type];

  return (
    <div
      dir="auto"
      role="status"
      aria-live="polite"
      className="group relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-[var(--radius-md)] px-4 py-3 text-white"
      style={{
        background: bg,
        boxShadow: "var(--shadow-lg)",
        opacity: t.visible ? 1 : 0,
        transform: `translateY(${t.visible ? "0" : "-12px"})`,
        transition: "opacity 250ms cubic-bezier(0.4,0,0.2,1), transform 250ms cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: "rgb(255 255 255 / 0.2)" }}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </div>

      <span className="flex-1 text-sm font-medium leading-snug">{message}</span>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-[3px] w-full bg-white/20">
        <div
          className="h-full bg-white/60 group-hover:[animation-play-state:paused]"
          style={{ animation: `toast-progress ${duration}ms linear forwards` }}
        />
      </div>
    </div>
  );
}

export const toast = {
  success: (message: string, duration = DEFAULT_DURATION) => {
    playSuccess(); // ⭐ تشغيل صوت النجاح
    return hotToast.custom((t) => renderToast(t, message, "success", duration), { duration, position: "top-center" });
  },

  error: (message: string, duration = DEFAULT_DURATION) => {
    playError(); // ⭐ تشغيل صوت الخطأ
    return hotToast.custom((t) => renderToast(t, message, "error", duration), { duration, position: "top-center" });
  },

  info: (message: string, duration = DEFAULT_DURATION) =>
    hotToast.custom((t) => renderToast(t, message, "info", duration), { duration, position: "top-center" }),

  dismiss: hotToast.dismiss,
};