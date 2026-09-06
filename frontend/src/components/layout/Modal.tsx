// src/components/pos/Modal.tsx
import { useEffect } from "react";
import type { ReactNode, ComponentType } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

type Accent = "primary" | "warning" | "danger";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  accent?: Accent;
  children: ReactNode;
}

const accentStyles: Record<Accent, { icon: string; iconBg: string }> = {
  primary: { icon: "text-[var(--color-primary-600)]", iconBg: "bg-[var(--color-primary-50)]" },
  warning: { icon: "text-[var(--color-warning-600)]", iconBg: "bg-[var(--color-warning-50)]" },
  danger: { icon: "text-[var(--color-danger-600)]", iconBg: "bg-[var(--color-danger-50)]" },
};

export function Modal({ isOpen, onClose, title, icon: Icon, accent = "primary", children }: ModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  const accentStyle = accentStyles[accent];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={onClose}
          dir="rtl"
        >
          <motion.div
            key="modal-panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-lg)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-light)] px-5 py-4">
              <div className="flex items-center gap-2.5">
                {Icon && (
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentStyle.iconBg}`}>
                    <Icon className={`h-4 w-4 ${accentStyle.icon}`} strokeWidth={2} />
                  </div>
                )}
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                aria-label={t("modal.close")}
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}