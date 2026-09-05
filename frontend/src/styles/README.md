# globals.css — دليل الاستخدام

## 📁 الملف
`frontend/src/styles/globals.css`

## 🎨 ما يقدمه

### 1. متغيرات CSS (CSS Variables)
كل الألوان والظلال والمسافات معرّفة كمتغيرات — تغيّرها مرة واحدة يُغيّر التطبيق بالكامل:

```css
:root {
  --color-primary-600: #2563eb;   /* الأزرق الأساسي */
  --color-success-500: #10b981;   /* الأخضر */
  --color-danger-500:  #ef4444;   /* الأحمر */
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07);
  --radius-lg: 14px;
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 2. Animations جاهزة

| الكلاس | التأثير | الاستخدام |
|---|---|---|
| `animate-fade-in` | يظهر تدريجياً | عند فتح شاشة |
| `animate-fade-in-up` | يظهر ويصعد من الأسفل | بطاقات المنتجات |
| `animate-fade-in-scale` | يظهر ويكبر قليلاً | نافذة حوار |
| `animate-slide-in-right` | ينزلق من اليمين | Sidebar |
| `animate-pulse-soft` | وميض خفيف | تنبيهات |
| `animate-shake` | اهتزاز | خطأ في إدخال |
| `animate-float` | طفو لأعلى | أيقونات |
| `animate-glow-pulse` | توهج نابض | زر مهم |

**مثال الاستخدام:**
```tsx
<div className="animate-fade-in-up delay-200">
  يظهر بعد 200ms من تحميل الصفحة
</div>
```

### 3. Components جاهزة

#### بطاقة (Card)
```tsx
<div className="yc-card">
  <h3>عنوان البطاقة</h3>
  <p>محتوى البطاقة...</p>
</div>
```

#### أزرار (Buttons)
```tsx
<button className="yc-btn-primary">زر أساسي</button>
<button className="yc-btn-secondary">زر ثانوي</button>
<button className="yc-btn-danger">زر حذف</button>
<button className="yc-btn-success">زر نجاح</button>
```

#### حقل إدخال (Input)
```tsx
<input className="yc-input" placeholder="اكتب هنا..." />
```

#### شارة (Badge)
```tsx
<span className="yc-badge yc-badge-blue">جديد</span>
<span className="yc-badge yc-badge-green">متوفر</span>
<span className="yc-badge yc-badge-red">منخفض</span>
<span className="yc-badge yc-badge-amber">تنبيه</span>
```

#### جدول (Table)
```tsx
<table className="yc-table">
  <thead><tr><th>الاسم</th><th>السعر</th></tr></thead>
  <tbody><tr><td>منتج</td><td>10.00</td></tr></tbody>
</table>
```

#### عنصر Sidebar
```tsx
<button className="yc-sidebar-item active">
  🏠 الرئيسية
</button>
```

### 4. Scrollbar مخصص
شريط التمرير أصبح رفيعاً ودائرياً — لا يأخذ مساحة كبيرة ولا يُزعج العين.

### 5. Selection ملون
عند تحديد نص يظهر باللون الأزرق الفاتح بدلاً من الأزرق الافتراضي القوي.

---

## 🚀 كيف تُطبّق في مشروعك

### الخطوة 1: استورد الملف
تأكد أن `main.tsx` يستورد `globals.css`:
```tsx
import "./styles/globals.css";
```

### الخطوة 2: استبدل الأنماط القديمة
في أي مكوّن، استبدل:
```tsx
{/* قبل */}
<div className="rounded-md border p-4 bg-white shadow-sm">

{/* بعد */}
<div className="yc-card animate-fade-in-up">
```

### الخطوة 3: استخدم الأزرار الجديدة
```tsx
{/* قبل */}
<button className="rounded bg-blue-600 px-4 py-2 text-white">

{/* بعد */}
<button className="yc-btn-primary">
```

---

## 🎨 تخصيص الألوان

إذا أردت تغيير نظام الألوان (مثلاً للوضع الداكن)، أضف في `globals.css`:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-body: #0f172a;
    --bg-card: #1e293b;
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --border-light: #334155;
  }
}
```
