// src/components/layout/LoginScreen.tsx
import { useState } from "react";
import { useAuthStore } from "../../store/authStore";

export function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="flex h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-80 space-y-3 rounded-lg border p-6">
        <h1 className="text-center text-lg font-bold">تسجيل الدخول</h1>
        <input
          className="w-full rounded border p-2"
          placeholder="اسم المستخدم"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="w-full rounded border p-2"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-blue-600 py-2 text-white disabled:opacity-50"
        >
          {isLoading ? "..." : "دخول"}
        </button>
      </form>
    </div>
  );
}
