// src/components/products/ProductsScreen.tsx
//
// يسدّ فجوة: كان الباك-إند (products module) جاهزًا 100% منذ المرحلة 3
// بلا أي واجهة تستدعيه. owner فقط (نفس تقييد إدارة المنتجات في back-end.md).
//
// ⭐ محدَّث: pagination حقيقي (Next/Prev + عرض "صفحة X من Y") بدل التلميح
// النصي المؤقت السابق — الباك-إند أصبح يدعم page/pageSize/total فعليًا.

import { useState } from "react";
import { api } from "../../lib/ipcClient";
import { useIpcQuery } from "../../hooks/useIpcQuery";
import { useIpcMutation } from "../../hooks/useIpcMutation";
import { ProductForm } from "./ProductForm";
import { confirm } from "../../store/confirmStore";

const PAGE_SIZE = 20;

export function ProductsScreen() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [labelStatus, setLabelStatus] = useState<string | null>(null);
  const [labelCopies, setLabelCopies] = useState<Record<number, number>>({});
  const [csvStatus, setCsvStatus] = useState<string | null>(null);

  const products = useIpcQuery(
    () => api().products.search({ query: query || "a", page, pageSize: PAGE_SIZE }),
    [query, page]
  );

  const deactivateProduct = useIpcMutation(api().products.deactivate, {
    onSuccess: () => products.refetch(),
  });

  async function handleExportCsv() {
    setCsvStatus("جاري التصدير...");
    const result = await api().products.exportCsv();
    if (!result.ok) {
      setCsvStatus(`فشل التصدير: ${result.error}`);
      return;
    }
    setCsvStatus(
      result.data.success
        ? `✅ تم تصدير ${result.data.count} منتج إلى: ${result.data.path}`
        : "تم إلغاء التصدير."
    );
  }

  async function handleImportCsv() {
    setCsvStatus("جاري الاستيراد...");
    const result = await api().products.importCsv();
    if (!result.ok) {
      setCsvStatus(`فشل الاستيراد: ${result.error}`);
      return;
    }
    if ("canceled" in result.data) {
      setCsvStatus("تم إلغاء الاستيراد.");
      return;
    }
    const { created, skipped, errors } = result.data;
    setCsvStatus(
      `✅ تم إنشاء ${created} منتج، تخطّي ${skipped}` +
        (errors.length > 0 ? ` — أول خطأ: سطر ${errors[0].line}: ${errors[0].reason}` : "")
    );
    products.refetch();
  }

  function getCopiesFor(productId: number) {
    return labelCopies[productId] ?? 1;
  }

  async function handlePrintLabel(productId: number) {
    setLabelStatus("جاري الطباعة...");
    const copies = getCopiesFor(productId);
    const result = await api().printing.printBarcodeLabel({ productId, copies });
    setLabelStatus(
      result.ok
        ? `تمت طباعة ${result.data.copiesPrinted} ملصق (${result.data.barcode})`
        : `فشل: ${result.error}`
    );
  }

  async function handleDeactivate(productId: number, productName: string) {
    const confirmed = await confirm(
      `هل أنت متأكد من تعطيل المنتج "${productName}"؟ لن يظهر بعد الآن في البحث أو البيع.`
    );
    if (confirmed) deactivateProduct.mutate({ id: productId });
  }

  function handleSearchChange(value: string) {
    setQuery(value);
    setPage(1); // أي بحث جديد يبدأ من الصفحة الأولى دائمًا
  }

  const totalPages = products.data?.totalPages ?? 1;

  return (
    <div className="flex h-full gap-4 p-4">
      <div className="flex-1">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">إدارة المنتجات</h1>
          <div className="flex gap-2">
            <button onClick={handleImportCsv} className="rounded-md border px-3 py-2 text-sm">
              استيراد CSV
            </button>
            <button onClick={handleExportCsv} className="rounded-md border px-3 py-2 text-sm">
              تصدير CSV
            </button>
            <button
              onClick={() => {
                setShowNewForm(true);
                setEditingProduct(null);
              }}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
            >
              + منتج جديد
            </button>
          </div>
        </div>

        {csvStatus && <p className="mb-3 text-sm text-gray-600">{csvStatus}</p>}

        <input
          className="mb-3 w-full rounded-md border p-2 text-sm"
          placeholder="ابحث بالاسم أو الباركود..."
          value={query}
          onChange={(e) => handleSearchChange(e.target.value)}
          data-barcode-ignore="true"
        />

        {labelStatus && <p className="mb-2 text-sm text-gray-600">{labelStatus}</p>}
        {products.isLoading && <p>جاري التحميل...</p>}
        {products.error && <p className="text-red-600">{products.error}</p>}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-start">الاسم</th>
              <th className="p-2 text-start">الباركود</th>
              <th className="p-2 text-start">سعر البيع</th>
              <th className="p-2 text-start">الكمية</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {(products.data?.items ?? []).map((p: any) => (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.name}</td>
                <td className="p-2">{p.barcode ?? "—"}</td>
                <td className="p-2">{p.sellingPrice}</td>
                <td className="p-2">{p.currentQuantity}</td>
                <td className="flex flex-wrap items-center gap-2 p-2">
                  <button
                    onClick={() => {
                      setEditingProduct(p);
                      setShowNewForm(false);
                    }}
                    className="text-blue-600 underline"
                  >
                    تعديل
                  </button>

                  <input
                    type="number"
                    min={1}
                    max={50}
                    className="w-14 rounded border p-1 text-center text-xs"
                    value={getCopiesFor(p.id)}
                    onChange={(e) =>
                      setLabelCopies((prev) => ({ ...prev, [p.id]: Number(e.target.value) || 1 }))
                    }
                    data-barcode-ignore="true"
                    title="عدد النسخ"
                  />
                  <button onClick={() => handlePrintLabel(p.id)} className="text-gray-600 underline">
                    طباعة ملصق
                  </button>

                  <button
                    onClick={() => handleDeactivate(p.id, p.name)}
                    className="text-red-600 underline"
                  >
                    تعطيل
                  </button>
                </td>
              </tr>
            ))}
            {!products.isLoading && (products.data?.items.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-400">
                  لا توجد نتائج
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ⭐ Pagination حقيقي */}
        {products.data && products.data.total > 0 && (
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <span>
              صفحة {products.data.page} من {totalPages} — {products.data.total} نتيجة إجمالاً
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded border px-3 py-1 disabled:opacity-40"
              >
                السابق
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded border px-3 py-1 disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {(showNewForm || editingProduct) && (
        <aside className="w-96">
          <ProductForm
            initial={editingProduct ?? undefined}
            onDone={() => {
              setShowNewForm(false);
              setEditingProduct(null);
              products.refetch();
            }}
          />
        </aside>
      )}
    </div>
  );
}
