// src/components/layout/LoginScreen.tsx
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";
import {
  Store,
  User,
  Lock,
  LogIn,
  Loader2,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";

export function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-body)] p-4">
      {/* خلفية زخرفية — عائلة لونية واحدة (primary) لضمان التناسق */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[var(--color-primary-300)] opacity-20 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[var(--color-primary-400)] opacity-10 blur-3xl animate-float delay-200" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Brand */}
        <div className="mb-8 text-center animate-fade-in-down">
          <div
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[var(--radius-xl)]"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700))",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            <Store className="h-10 w-10 text-[var(--text-inverse)]" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            YasCode Supérette
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            نظام تسيير محلات المواد الغذائية
          </p>
        </div>

        {/* Login Card */}
        <div className="yc-card !p-8 animate-fade-in-scale delay-100">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">تسجيل الدخول</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              أدخل بيانات حسابك للمتابعة
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                اسم المستخدم
              </label>
              <div className="relative">
                <User
                  className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  strokeWidth={1.5}
                />
                <input
                  className="yc-input pr-11"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[var(--text-primary)]">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock
                  className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  strokeWidth={1.5}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  className="yc-input pr-11 pl-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-5 w-5" strokeWidth={1.5} />
                  )}
                </button>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div
                role="alert"
                className="animate-shake flex items-start gap-2 rounded-[var(--radius-md)] border p-3 text-sm"
                style={{
                  borderColor: "var(--color-danger-100)",
                  background: "var(--color-danger-50)",
                  color: "var(--color-danger-600)",
                }}
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="yc-btn-primary w-full py-3.5 text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>جاري الدخول...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  <span>دخول</span>
                </>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div
            className="mt-6 flex items-center justify-center gap-2 rounded-[var(--radius-md)] border p-3 text-center text-xs"
            style={{
              borderColor: "var(--color-primary-100)",
              background: "var(--color-primary-50)",
              color: "var(--color-primary-700)",
            }}
          >
            <Info className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
            <span>
              <span className="font-bold">بيانات تجريبية:</span> admin / admin123
            </span>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-[var(--text-muted)] animate-fade-in delay-300">
          YasCode Solutions © 2026
        </p>
      </div>
    </div>
  );
}