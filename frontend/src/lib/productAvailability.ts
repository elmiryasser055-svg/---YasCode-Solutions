import { api, unwrap } from "./ipcClient";
import { toast } from "./toast";

export interface AvailabilityCheckResult {
  ok: boolean;
  product?: Record<string, unknown>;
}

interface ProductRow {
  id: number;
  name: string;
  currentQuantity: number;
  expiryDate: string | null; // ISO "YYYY-MM-DD"
  isActive: boolean;
}

/**
 * يتحقق من توفر المنتج في المخزون، عدم انتهاء صلاحيته، وأنه غير معطّل
 * قبل إضافته للفاتورة. يعرض toast مناسب عند الرفض ويرجع { ok: false } لمنع الإضافة.
 */
export async function checkProductAvailability(
  productId: number,
  productName: string,
): Promise<AvailabilityCheckResult> {
  try {
    const product = (await unwrap(
      api().products.get({ id: productId }),
    )) as unknown as ProductRow;

    if (product.isActive === false) {
      toast.error(`"${productName}" غير متاح للبيع (تم تعطيله)`);
      return { ok: false, product };
    }

    if (typeof product.currentQuantity === "number" && product.currentQuantity <= 0) {
      toast.error(`"${productName}" غير متوفر في المخزون`);
      return { ok: false, product };
    }

    if (product.expiryDate) {
      // expiryDate بصيغة "YYYY-MM-DD" — مقارنة نصية بتاريخ اليوم بنفس الصيغة تكفي وتتجنب مشاكل التوقيت (timezone)
      const todayIso = new Date().toISOString().slice(0, 10);
      if (product.expiryDate < todayIso) {
        toast.error(`"${productName}" منتهي الصلاحية ولا يمكن بيعه`);
        return { ok: false, product };
      }
    }

    return { ok: true, product };
  } catch {
    toast.error("تعذر التحقق من حالة المنتج، حاول مجددًا");
    return { ok: false };
  }
}