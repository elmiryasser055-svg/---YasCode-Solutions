// src/components/users/UsersScreen.tsx
//
// يسدّ فجوة: auth.createUser جاهز في الباك-إند منذ المرحلة 3 بلا أي واجهة.
// owner فقط — الكاشير لا يصل لهذه الشاشة أصلاً (مخفية من Sidebar).

import { useState } from "react";
import { api } from "../../lib/ipcClient";
import { useIpcMutation } from "../../hooks/useIpcMutation";

export function UsersScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const createUser = useIpcMutation(api().auth.createUser, {
    onSuccess: (data: any) => {
      setSuccessMessage(`تم إنشاء حساب الكاشير "${data.username}" بنجاح.`);
      setUsername("");
      setPassword("");
      setFullName("");
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage(null);
    await createUser.mutate({ username, password, fullName, role: "cashier" });
  }

  return (
    <div className="mx-auto mt-6 max-w-md space-y-4 p-4">
      <h1 className="text-xl font-bold">إدارة الموظفين</h1>
      <p className="text-sm text-gray-500">
        إنشاء حساب كاشير جديد — صلاحياته محدودة بالبيع فقط، بدون الوصول للتقارير المالية أو تعديل
        الأسعار (حسب سياسة الأدوار المعتمدة).
      </p>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
        <input
          className="w-full rounded border p-2 text-sm"
          placeholder="الاسم الكامل"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          data-barcode-ignore="true"
        />
        <input
          className="w-full rounded border p-2 text-sm"
          placeholder="اسم المستخدم (لتسجيل الدخول)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          data-barcode-ignore="true"
        />
        <input
          type="password"
          className="w-full rounded border p-2 text-sm"
          placeholder="كلمة المرور (8 أحرف على الأقل)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-barcode-ignore="true"
        />

        {createUser.error && <p className="text-sm text-red-600">{createUser.error}</p>}
        {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

        <button
          type="submit"
          disabled={
            createUser.isLoading || username.length < 3 || password.length < 8 || fullName.length < 2
          }
          className="w-full rounded-md bg-blue-600 py-2 text-white disabled:opacity-50"
        >
          {createUser.isLoading ? "جاري الإنشاء..." : "+ إنشاء حساب كاشير"}
        </button>
      </form>
    </div>
  );
}
