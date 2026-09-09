// frontend/src/components/layout/SetupScreen.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { unwrap } from "../../lib/ipcClient";

export default function SetupScreen() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    setIsPending(true);
    try {
      // استخدام unwrap لفك النتيجة، وسترمي IpcCallError تلقائياً إذا كانت ok: false
      await unwrap(
        window.api.auth.setupInitial({ 
          fullName, 
          username, 
          password 
        })
      );
      
      // بعد نجاح الإعداد، نطلب إعادة تحميل التطبيق لإعادة فحص حالة النظام
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء الإعداد.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-body)] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="yc-card w-full max-w-md !p-8"
      >
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">
            مرحباً بك في النظام! 
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            يرجى إنشاء حساب "صاحب المحل" للبدء في استخدام التطبيق.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              الاسم الكامل
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="yc-input"
              placeholder="مثال: محمد أحمد"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              اسم المستخدم
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="yc-input"
              placeholder="مثال: admin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="yc-input"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="text-sm text-[var(--color-danger-600)] bg-[var(--color-danger-50)] p-2 rounded-md animate-shake"
            >
              {error}
            </motion.div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="yc-btn-primary w-full py-3 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  جاري الإنشاء...
                </span>
              ) : "إنشاء الحساب وإعداد النظام"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}