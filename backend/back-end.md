# back-end.md
## بنية الباك-إند — نظام تسيير محلات المواد الغذائية
**YasCode Solutions — المرحلة 3**

---

## 0. تكييف مهم: من REST إلى Electron IPC

القالب الأصلي يفترض بنية `route → controller → service` بمنطق REST API. بما أن هذا **تطبيق Electron desktop** (لا خادم HTTP، لا شبكة عامة)، طُبِّق نفس المبدأ المعماري بأدوات Electron المكافئة:

| REST التقليدي | المكافئ هنا | الدور |
|---|---|---|
| `route.ts` (Express router) | `*.ipc.ts` | تسجيل "القنوات" (`ipcMain.handle`) وربطها بالـ controller |
| `controller.ts` | `*.controller.ts` | تنسيق فقط: validation → auth guards → استدعاء service |
| `schema.ts` (Zod) | `*.schema.ts` | نفسه تمامًا، بدون تغيير |
| `service.ts` | `*.service.ts` | كل منطق الأعمال والوصول لقاعدة البيانات |
| `middleware/authenticate.ts` | `middleware/ipcAuthGuard.ts` | نفس المبدأ: يتحقق من جلسة صالحة |
| `middleware/authorize.ts` | `middleware/ipcAuthorize.ts` | نفس المبدأ: يتحقق من الدور (owner/cashier) |
| `middleware/errorHandler.ts` | `middleware/ipcErrorHandler.ts` | يغلّف كل handler بدل middleware مركزي (Electron لا يدعم سلسلة middleware مدمجة حول IPC) |
| JWT (`jwt.ts`) | جلسة في ذاكرة main process (`lib/auth.ts`) | **لا حاجة لتوقيع/فك تشفير توكن** — العملية لا تُعرَّض عبر الشبكة إطلاقًا؛ شرح كامل أدناه |

**مهم:** الـ `renderer` (واجهة React) **لا يتحدث مباشرة مع قاعدة البيانات أو أي مكتبة Node** — فقط عبر `contextBridge` في `preload.ts` الذي يعرّض دوال محدودة تستدعي هذه القنوات. هذا يعادل "الفصل بين client وserver" في REST التقليدي رغم أن كل شيء يعمل على نفس الجهاز.

---

## 1. هيكلة الملفات

```
backend/
├── lib/
│   ├── env.ts              # تحقق من إعدادات الإقلاع
│   ├── db.ts                # اتصال SQLite + WAL + migrations
│   ├── auth.ts               # تجزئة كلمات المرور + إدارة الجلسة
│   ├── rateLimit.ts          # حماية تسجيل الدخول من brute-force
│   ├── logger.ts              # تسجيل آمن (لا تسريب تفاصيل تقنية)
│   ├── printer.ts              # طباعة ESC/POS (تذاكر + labels)
│   ├── barcodeGenerator.ts      # توليد باركود للمنتجات بدونه
│   └── backup.ts                 # نسخ احتياطي دوري تلقائي
├── middleware/
│   ├── errors.ts             # أنواع أخطاء موحّدة (AppError وفروعها)
│   ├── ipcErrorHandler.ts     # التقاط/إخفاء الأخطاء غير المتوقعة
│   ├── ipcAuthGuard.ts         # requireAuth
│   ├── ipcAuthorize.ts          # requireRole
│   └── ipcValidate.ts            # withValidation (Zod)
└── modules/
    ├── auth/                       ✅ مكتمل الكود
    ├── inventory/                  ✅ مكتمل الكود
    ├── sales/                      ✅ مكتمل الكود ⭐ الأهم
    ├── products/                   ✅ مكتمل الكود
    ├── suppliers/                  ✅ مكتمل الكود
    ├── purchases/                  ✅ مكتمل الكود
    ├── cash-register/              ✅ مكتمل الكود
    └── registerAllIpcHandlers.ts    # تجميع تسجيل كل القنوات في نقطة واحدة
```

---

## 2. الموديولات المكتملة (كود جاهز)

### `auth`
- `login`: يتحقق من rate limiting أولاً (`assertNotRateLimited`) → يبحث عن المستخدم → **رسالة خطأ موحّدة** سواء المستخدم غير موجود أو كلمة المرور خاطئة (منع user enumeration) → عند النجاح ينشئ جلسة في الذاكرة
- `createUser`: محمي بـ `requireRole(["owner"])` على مستوى الـ controller **و** يُعاد التحقق داخل الـ service نفسه (دفاع مزدوج) — فقط Owner يُنشئ حسابات Cashier
- كل عملية إنشاء مستخدم تُسجَّل في `audit_log`

### `inventory`
- **`applyStockMovement`** هي الدالة المحورية في كل الباك-إند: نقطة الكتابة **الوحيدة** على `products.currentQuantity`، تُستدعى من `inventory` مباشرة (تعديل يدوي/تصحيح جرد) ومن `sales` (بيع/إلغاء) ومن `purchases` (شراء) — هذا يضمن استحالة اختلاف الرصيد المخزَّن عن مجموع سجل الحركات
- ترفض تلقائيًا أي عملية تُنتج كمية سالبة (`BusinessRuleError`)
- تعديل المخزون وتصحيح الجرد محصوران بـ `owner` فقط (الكاشير يبيع فقط، حسب أدوار المرحلة 1)

### `sales` ⭐
يطبّق حرفيًا السيناريوهين 1 و2 من `schemaDB.md` (المرحلة 2):
- **`createSale`**: يتحقق من وجود جلسة صندوق مفتوحة → يحسب الإجمالي من الأسعار الحالية (مع أخذ snapshot لها) → **كل شيء ضمن `db.transaction()` واحدة**: سطر البيع + بنوده + خصم المخزون لكل منتج (عبر `applyStockMovement`، الذي يرمي خطأ ويُلغي كل العملية تلقائيًا إن كانت الكمية غير كافية) + أثر الصندوق
- **`cancelSale`**: محصور بـ `owner`، يعيد الكمية لكل منتج، يعكس أثر الصندوق، ويسجّل في `audit_log` — بدون حذف أي سجل تاريخي إطلاقًا

---

## 3. الموديولات المتبقية — الكود الكامل ✅

كل الموديولات الآن مكتملة الكود بنفس البنية الأربعية (`schema/service/controller/ipc`):

### `products`
- `createProduct` / `updateProduct` — owner فقط. **أي تغيير في `sellingPrice`/`purchasePrice` يُسجَّل تلقائيًا في `audit_log`** (action: `price_change`) بالقيمة القديمة والجديدة
- منع تكرار الباركود عبر تحقق صريح في service قبل الإدخال (رسالة واضحة) بالإضافة لقيد `unique index` في القاعدة كخط دفاع أخير
- `searchProducts(query)` — بحث بالاسم (جزئي) أو الباركود (تطابق تام)، متاح لكل الأدوار (الكاشير يحتاجه أثناء البيع)
- `deactivateProduct` بدل الحذف الفعلي (يحافظ على سلامة `sale_items` التاريخية)

### `suppliers`
- CRUD كامل — owner فقط في كل العمليات (بيانات مالية/تجارية)
- `getSupplierDebt(supplierId)`: `SUM(purchases.totalAmount) - SUM(supplierPayments.amount)` عبر استعلامي `sum()` منفصلين، محسوب عند الطلب مباشرة

### `purchases`
- `createPurchase`: **نفس نمط transaction الحرج في `sales.createSale`** — سطر `purchases` (بحساب `totalAmount` وتحديد `status` تلقائيًا) + `purchase_items` + `applyStockMovement` (type: `purchase`, موجب) لكل منتج + تحديث `products.purchasePrice` + تسجيل دفعة أولى في `supplier_payments` إن دُفع مبلغ فوري — **كل ذلك ضمن transaction واحدة**
- `recordSupplierPayment`: يُدخل سطر `supplier_payments`، وإن كانت الدفعة مرتبطة بفاتورة محددة يُعيد حساب `amountPaid`/`status` الخاصين بها فورًا

### `cash-register`
- **قرار تصميم مهم:** عمود `cashMovements.amount` يُخزَّن دائمًا بإشارة تعكس أثره الفعلي على نقد الدرج (بيع = موجب، إرجاع/مصروف/سحب يدوي = سالب، إيداع يدوي = موجب) — هذا يجعل `expectedAmount = openingAmount + SUM(amount)` حسابًا مباشرًا بدون شروط متفرقة حسب النوع
- `openSession`: يرفض الفتح إن وُجدت جلسة `open` أخرى بالفعل
- `recordExpense`: يُدخل سطرًا في `expenses` **و**سطرًا مقابلًا سالبًا في `cash_movements` ضمن نفس transaction
- `recordManualMovement`: إيداع/سحب يدوي من الصندوق (مثال: تزويد الدرج بفكة في بداية اليوم) خارج سياق بيع/مصروف
- `closeSession`: يحسب `expectedAmount` فعليًا من قاعدة البيانات، يخزّن `difference`، ويقفل الجلسة نهائيًا (لا تعديل لاحق)
- `getOpenSession` متاح لكل الأدوار (الكاشير يحتاج معرفة رقم الجلسة الحالية لإتمام أي بيع)، بقية العمليات owner فقط

### `reports` (أُضيف أثناء المرحلة 4 — احتاجته شاشة التقارير فعليًا)
- `getProfitTrend(period)`: يجلب المبيعات المكتملة ضمن نطاق الفترة (14 يوم/8 أسابيع/12 شهر) **مع بنودها**، ويحسب لكل بيع: `profit = sale.total - Σ(costPriceSnapshot × quantity)` — الاعتماد على `sale.total` (بعد الخصم) و`costPriceSnapshot` (وليس السعر الحالي) يضمن دقة الأرباح التاريخية تلقائيًا دون أي حساب إضافي، لنفس السبب الموثّق في `schemaDB.md` (snapshot الأسعار وقت البيع)
- التجميع (bucketing) بالليبل المناسب (يوم/أسبوع ISO/شهر) يحدث في JavaScript بعد الجلب — مقبول أداءً لحجم بيانات محل واحد، ولا يستدعي تعقيد استعلامات SQL `GROUP BY` مع دوال تواريخ SQLite
- `getTodaySummary()`: نفس المنطق لليوم الحالي فقط، لبطاقات الملخص أعلى شاشة التقارير
- owner فقط في الاثنين (تقارير مالية حسّاسة)

### التجميع
`modules/registerAllIpcHandlers.ts` يجمع تسجيل قنوات كل الموديولات (بما فيها `reports`) في استدعاء واحد، يُنفَّذ من `main.ts` مباشرة بعد `initDatabase()` عند إقلاع التطبيق.

---

## 4. استراتيجية الاختبارات

| نوع الاختبار | الأداة | يغطي |
|---|---|---|
| **Unit tests** | Vitest | دوال `service.ts` المعزولة عن DB الفعلية عبر mock لـ `getDb()` — خصوصًا حسابات: إجمالي البيع، الفرق في الصندوق، حساب دَين المورد |
| **Integration tests** | Vitest + قاعدة SQLite مؤقتة في الذاكرة (`:memory:`) | **الأولوية القصوى:** سيناريو البيع الكامل (`createSale`) والتأكد أن فشل أي خطوة (مثلاً كمية غير كافية لمنتج ثانٍ في السلة) يُلغي **كل** العملية (rollback فعلي، لا تغيير جزئي على المخزون) |
| **Integration tests** | نفسه | تسلسل: فتح جلسة → عدة مبيعات → إغلاق جلسة → التأكد أن `expectedAmount` المحسوب مطابق يدويًا لمجموع المبيعات |
| **Security tests** | Vitest | التأكد أن `requireRole(["owner"])` يرفض فعليًا طلبات بجلسة `cashier` (لكل عملية حسّاسة: إلغاء بيع، تعديل سعر، تعديل مخزون) |

**قاعدة عامة:** كل موديول جديد يُضاف **يجب** أن يترافق مع اختبار integration واحد على الأقل يغطي "المسار السعيد" + اختبار واحد يغطي حالة فشل متوقعة (كمية غير كافية، صلاحية مرفوضة...).

---

## 5. متطلبات الأمان — كيف طُبِّقت في هذا المشروع تحديدًا

| المتطلب | التطبيق الفعلي هنا |
|---|---|
| **Rate Limiting** | `lib/rateLimit.ts`: قفل 15 دقيقة بعد 5 محاولات فاشلة على نفس اسم المستخدم خلال 15 دقيقة |
| **CORS** | ⚪️ **غير قابل للتطبيق فعليًا** — لا يوجد خادم HTTP يستقبل طلبات من دومينات خارجية؛ التواصل الوحيد هو IPC داخل نفس العملية. أهم بديل مكافئ: `webPreferences: { contextIsolation: true, nodeIntegration: false }` في `BrowserWindow` (يُوثَّق في مرحلة الفرونت-إند/main.ts) لمنع الـ renderer من الوصول المباشر لـ Node APIs |
| **SQL Injection** | استخدام Drizzle ORM حصريًا لكل استعلام — لا أي `raw SQL` بدمج نصوص في أي موديول |
| **CSRF** | ⚪️ **غير قابل للتطبيق** — لا cookies، لا جلسات مستعرض، القناة الوحيدة IPC محلية موثوقة بحكم البنية |
| **XSS** | يقع أساسًا على مستوى الفرونت-إند (React يهرب المخرجات تلقائيًا افتراضيًا) — سيُفصَّل في `front-end.md`؛ الباك-إند يضمن عدم تخزين أي HTML/script خام دون تحقق Zod على طول النص ونوعه |
| **Headers أمنية** | ⚪️ Helmet غير قابل للتطبيق (لا HTTP)، البديل: `Content-Security-Policy` عبر `session.defaultSession.webRequest` في main.ts لتقييد الموارد التي يحمّلها الـ renderer (يُفصَّل في مرحلة الفرونت-إند) |
| **Input Validation** | كل قناة IPC تمر إجباريًا عبر `withValidation(zodSchema, ...)` قبل الوصول لأي controller |
| **Secrets Management** | `lib/env.ts`: لا مفاتيح مكتوبة في الكود؛ التطبيق يرفض الإقلاع إن كانت الإعدادات ناقصة/غير صالحة |
| **Authentication/Authorization** | جلسة في ذاكرة main process فقط (`lib/auth.ts`) مع timeout خمول 30 دقيقة — **لماذا لا JWT:** JWT مصمم لإثبات هوية عبر أطراف/خوادم غير موثوقة بينها؛ هنا لا يوجد نقل عبر الشبكة إطلاقًا، فتخزين توكن موقّع وفك تشفيره في كل طلب هو تعقيد بلا فائدة أمنية إضافية مقارنة بجلسة محفوظة في ذاكرة عملية واحدة لا يصل إليها الـ renderer مباشرة |
| **Error Handling آمن** | `middleware/ipcErrorHandler.ts` + `lib/logger.ts`: أي خطأ غير متوقع (DB، bug) يُسجَّل كاملاً في ملف log محلي فقط، ويصل للمستخدم برسالة عامة موحّدة دائمًا |
| **Dependency Security** | يُنصح بتشغيل `npm audit` ضمن سكربت `prebuild` قبل كل تعبئة exe جديدة (يُفصَّل في `Deploy.md`، المرحلة 5) |

### طبقات حماية إضافية خاصة بهذا المشروع
- **نسخ احتياطي تلقائي** (`lib/backup.ts`) كل 6 ساعات + نسخة قبل كل migration — الحماية الفعلية الأهم في تطبيق بلا نسخ سحابي
- **WAL mode + `foreign_keys = ON`** في SQLite — يمنع تلف الملف عند انقطاع الكهرباء ويفرض تناسق العلاقات فعليًا (وليس فقط في تعريف السكيمة)
- **Transactions إجبارية** لكل عملية متعددة الخطوات (بيع، شراء، إغلاق صندوق) — لا استثناءات
- **قفل الجهاز فعليًا (نظام تشغيل) يبقى مسؤولية المالك** — يُذكر كتوصية غير برمجية في `Deploy.md`، لأن أي شخص بوصول فيزيائي للجهاز مع صلاحية Windows admin يمكنه نظريًا الوصول لملف SQLite مباشرة (قيد معروف لتطبيقات desktop غير مشفّرة بالكامل؛ التشفير الكامل للقرص خيار مستقبلي إن رغبت)

---

## 8. تحديث لاحق ثانٍ: إصلاح حرج + فجوات إضافية

### 🔴 أ) خطأ حرج تم اكتشافه وإصلاحه: `db.transaction(async...)` لا يعمل مع better-sqlite3

**هذا كان سيُسقط فعليًا كل عملية بيع، شراء، إرجاع، تعديل/إلغاء بيع، ومصروف في التطبيق عند التشغيل الحقيقي.**

كل الكود عبر 5 موديولات (`sales`, `purchases`, `cash-register`, `returns`, `inventory`) كان يستخدم النمط:
```ts
db.transaction(async (tx) => {
  const x = await tx.query.products.findFirst(...);
  await tx.insert(...);
});
```
هذا نمط شائع جدًا مع معظم قواعد البيانات، لكنه **يفشل فورًا** مع `better-sqlite3` تحديدًا: المكتبة تتحقق من أن الدالة الممرَّرة إلى `.transaction()` لا تُعيد Promise (لأن SQLite transactions يجب أن تكتمل ضمن دورة تنفيذ JS واحدة متزامنة)، وترمي `TypeError: Transaction function cannot return a promise` فور أول استدعاء فعلي.

**كيف اكتُشف:** أثناء كتابة اختبارات integration حقيقية (§ ب أدناه) — لم يكن الخطأ ليظهر بمجرد قراءة الكود، فقط بتشغيله فعليًا.

**الإصلاح المطبَّق في كل الملفات الخمسة:**
- الدالة الممرَّرة لـ `db.transaction(...)` أصبحت **غير async** (بلا `await` بداخلها إطلاقًا)
- `tx.query.X.findFirst(...)` → `.sync()` (تنفيذ متزامن صريح للاستعلامات العلائقية)
- `tx.insert/update/delete(...)` → `.run()` (بلا returning) أو `.get()`/`.all()` (مع returning)
- **القيد يخص فقط الكود الواقع مباشرة داخل `db.transaction()`** — أي كود خارجها (يستخدم `db` العادي وليس `tx`) يبقى `async/await` طبيعيًا تمامًا بلا أي تغيير (مثال: `getSaleForReprint`, `listPurchasesBySupplier`)

هذا الدرس يستحق تسجيله بوضوح: **عند استخدام `better-sqlite3` مع Drizzle، لا تستخدم أبدًا `async` مع `db.transaction()`.**

### ب) اختبارات فعلية مكتوبة الآن (كانت موثَّقة استراتيجيًا فقط، بلا أي ملف اختبار حقيقي)

- `backend/test-utils/setupTestEnv.ts`: يستخدم `initDatabase()` الحقيقية بـ `DB_PATH: ":memory:"` — الاختبارات تمرّ عبر **نفس** مسار الكود المستخدم في الإنتاج (بما فيه migrations حقيقية مولَّدة فعليًا عبر `drizzle-kit generate`، وليست محاكاة يدوية منفصلة)
- `sales.service.test.ts`: يغطي بالضبط "الأولوية القصوى" من § 4 — rollback كامل عند نقص المخزون، رفض البيع بلا جلسة صندوق مفتوحة، عكس المخزون/الصندوق عند الإلغاء، وتصحيح الفرق فقط عند التعديل
- `inventory.service.test.ts`: يغطي `applyStockMovement` (رفض الكمية السالبة، عدم تغيير أي شيء عند الفشل)
- `middleware/authorize.test.ts`: يغطي "Security tests" من § 4 — رفض `requireRole` فعليًا لجلسة cashier
- `lib/auth.test.ts`: تجزئة كلمات المرور + قفل الحساب بعد 5 محاولات فاشلة

**النتيجة الفعلية: 16/16 اختبارًا ناجحًا** (`npx vitest run` — راجع `vitest.config.ts` الجديد في جذر المشروع).

### ج) `lib/env.ts` و`lib/logger.ts` لم يعودا يعتمدان على Electron إطلاقًا

كلا الملفين كانا يستوردان `app` من `"electron"` مباشرة (لحساب مسار قاعدة البيانات ومجلد الـ logs) — ما كان يكسر أي استيراد لهما خارج عملية Electron فعلية (سكربتات، اختبارات). الآن:
- `loadEnv(overrides)` يقبل `DB_PATH` كـ override صريح بدل حسابه داخليًا
- `configureLogger(logDirectory)` تُستدعى مرة من `main.ts` لضبط مسار الـ log
- **`frontend/electron/main.ts`** هو المكان الوحيد الذي يحسب هذين المسارين فعليًا (عبر `app.getPath("userData")`) ويمرّرهما صراحة
- **فائدة مباشرة:** `scripts/seed-owner.ts` أصبح أبسط بكثير (يستخدم `lib/env.ts`/`lib/db.ts` مباشرة بدل إعادة تنفيذ منطقهما بشكل منفصل كما كان سابقًا)

### د) موديول `categories` جديد

جدول `categories` كان موجودًا في السكيمة منذ المرحلة 2 و`products.categoryId` يشير إليه، لكن بلا أي service/ipc لإدارته. الآن `categories.createCategory`/`updateCategory`/`deleteCategory` (owner فقط) و`listCategories` (كل الأدوار). الحذف فعلي (وليس تعطيلاً منطقيًا كالمنتجات) لأن `onDelete: "set null"` في السكيمة يجعل حذف فئة آمنًا تمامًا.

### هـ) `settings.printerName` أصبح له أثر فعلي

كان يُحفظ في `app_settings` بلا أي تأثير حقيقي. الآن `printing.service.ts` يستدعي `getSetting("printerName")` فعليًا قبل كل طباعة، ويهيّئ `lib/printer.ts` بها عبر دالة `configurePrinter()` جديدة.

### التجميع النهائي
`registerAllIpcHandlers.ts` يسجّل الآن **12 موديولاً**: auth, inventory, sales, products, suppliers, purchases, cash-register, reports, printing, settings, returns, categories.

## 9. تحديث لاحق: سدّ فجوات كانت موجودة فعليًا (الجولة الأولى)

بعد مراجعة شاملة، تبيّن أن 5 فجوات حقيقية كانت موجودة رغم اكتمال الموديولات السبعة الأصلية. سُدّت جميعًا كالتالي:

### أ) الطباعة لم تكن موصولة فعليًا — موديول `printing` جديد
`lib/printer.ts` و`lib/barcodeGenerator.ts` (المرحلة 3) كانا طبقتي تجريد **بلا أي ipc channel يستدعيهما**. الآن:
- `printing.printSaleTicket(saleId)`: يجلب بيانات البيع كاملة ويطبع التذكرة فعليًا
- `printing.printBarcodeLabel(productId, copies)`: يولّد باركود تلقائيًا للمنتج إن لم يملك واحدًا، ثم يطبع الملصق
- **قرار مهم:** الطباعة **منفصلة تمامًا** عن `transaction` البيع — فشل الطباعة (طابعة غير متصلة) لا يُلغي بيعًا نجح فعليًا في القاعدة. الواجهة تستدعي `sales:create` ثم `printing:printSaleTicket` كعمليتين متتاليتين منفصلتين

### ب) لا موديول لإعدادات التطبيق — موديول `settings` جديد
جدول `app_settings` (المرحلة 2) كان بلا أي استخدام فعلي. الآن `settings.getSetting`/`getAllSettings`/`setSetting` يديرونه. **قرار متعمّد:** القراءة (`getSetting`/`getAllSettings`) **بلا** `requireAuth` — لأن اللغة الافتراضية يجب أن تُقرأ قبل ظهور شاشة تسجيل الدخول نفسها؛ الكتابة تبقى owner فقط.

### ج) لا "تعديل" لعملية بيع، فقط "إلغاء" — أُضيف `sales.editSale`
كان تحليل المرحلة 1 يطلب صراحة "الغاء **وتعديل** عملية البيع"، وبُني الإلغاء فقط. الآن `editSale`:
1. يعكس أثر كل بند قديم على المخزون (كأنه أُرجع)
2. يحذف البنود القديمة ويطبّق الجديدة من الصفر (نفس منطق `createSale`)
3. **يصحّح أثر الصندوق بالفرق فقط** بين الإجمالي القديم والجديد — وليس عكس الكل ثم إعادته، تفاديًا لحركتي صندوق متضخمتين بلا داعٍ
4. يبقي نفس `saleId` (تعديل في مكانه، لا فاتورة منفصلة) ليكون أوضح عند مراجعة السجل لاحقًا
5. owner فقط، ويُسجَّل بالكامل في `audit_log` (action: `sale_edit`)

### د) جدول `returns` كان معرَّفًا بلا استخدام — موديول `returns` جديد
كان الخيار الوحيد المتاح هو إلغاء **الفاتورة كاملة** حتى لإرجاع منتج واحد فقط منها. الآن `returns.createReturn(saleItemId, quantity, reason)`:
- يمنع إرجاع كمية أكبر من "المتبقي القابل للإرجاع" (يحسب أي إرجاعات جزئية سابقة على نفس البند)
- **يطبّق نسبة الخصم الأصلية على مبلغ الاسترجاع** (`refundAmount = unitPrice × quantity × (sale.total / sale.subtotal)`) حتى يبقى المسترجَع متسقًا مع صافي ما دفعه الزبون فعليًا، وليس السعر الكامل قبل الخصم
- يعيد الكمية للمخزون ويخصمها من الصندوق، owner فقط

### التجميع المحدَّث
`registerAllIpcHandlers.ts` يسجّل الآن **10 موديولات**: auth, inventory, sales, products, suppliers, purchases, cash-register, reports, **printing، settings، returns**.

### ما تبقّى (خارج نطاق الباك-إند تحديدًا)
- سكربت seed لإنشاء أول حساب Owner عند التثبيت الأول (مهمة تشغيل/tooling وليست موديول باك-إند)
- ربط كل هذا بواجهة فعلية (أزرار طباعة، شاشة إعدادات، زر إرجاع جزئي في تفاصيل الفاتورة) — يبقى عمل فرونت-إند

## 10. تحديث لاحق ثالث: قناة `sales:get` (قراءة فقط، بلا أثر جانبي)

**السياق:** الفرونت-إند (`ReturnForm.tsx`) احتاج قراءة فاتورة كاملة مع معرّفات `sale_item` الحقيقية لتنفيذ الإرجاع الجزئي، لكن `getSaleForReprint` الموجودة أصلاً تُنفّذ طباعة فعلية وتزيد `printCount` كأثر جانبي — غير مناسب لعملية "عرض فقط".

**الإضافة:** `getSaleById(saleId)` في `sales.service.ts` — نفس استعلام `getSaleForReprint` (فاتورة + بنودها الكاملة بمعرّفاتها)، **بلا أي كتابة على القاعدة إطلاقًا**. قناة `sales:get` جديدة (متاحة لكل الأدوار، قراءة فقط).

**اختبار مخصص (`sales.get.test.ts`)** يثبت الفرق تحديدًا: استدعاء `getSaleById` ثلاث مرات متتالية لا يغيّر `printCount` إطلاقًا، بينما استدعاء `getSaleForReprint` مرة واحدة يزيده فورًا — الاختبار الأهم هنا هو **إثبات غياب الأثر الجانبي**، وليس فقط "الدالة تُرجع بيانات صحيحة".

**النتيجة:** `ReturnForm.tsx` في الفرونت-إند حُدِّث لاستخدام `sales:get` بدل `sales:reprint`، فأُزيل القيد التقني الذي كان موثَّقًا صراحة في كوده سابقًا (طباعة إضافية عند كل فتح لنموذج الإرجاع).

**إجمالي اختبارات الباك-إند الآن: 19/19 ناجحة** (كانت 16، +3 من `sales.get.test.ts`).

## 11. تحديث لاحق رابع: Pagination حقيقي، استيراد/تصدير CSV، استعادة نسخ احتياطية

### أ) Pagination حقيقي في `products.searchProducts`
كان البحث محدودًا بـ 30 نتيجة ثابتة بلا `offset` — غير عملي مع مخزون كبير. الآن `searchProductsSchema` يقبل `page`/`pageSize`، والدالة تُعيد `{ items, total, page, pageSize, totalPages }` عبر استعلامين متوازيين (`Promise.all`): واحد بـ `.limit().offset()` وآخر بـ `count()` من drizzle-orm للعدد الإجمالي. **اختبار مخصص (`products.service.test.ts`)** يثبت: 25 منتجًا بحجم صفحة 10 يُنتج 3 صفحات بلا أي تداخل بين عناصرها، والصفحة الأخيرة تُعيد الباقي فقط (5 عناصر).

### ب) استيراد/تصدير CSV بالجملة (`products.csv.service.ts`)
يستخدم `dialog.showSaveDialog`/`showOpenDialog` من Electron **مباشرة في الباك-إند** (main process) — الـ renderer لا يصل لنظام الملفات مطلقًا، متسقًا مع مبدأ `contextIsolation` المطبَّق في كل المشروع. محلّل/مصدّر CSV مكتوب يدويًا (بلا مكتبة خارجية) يدعم الحقول المقتبسة، مع BOM UTF-8 عند التصدير لضمان فتح صحيح للعربية في Excel. الاستيراد يتحقق من كل صف على حدة (اسم، سعر، تكرار باركود) ويُرجع ملخصًا `{ created, skipped, errors: [{line, reason}] }` بدل فشل الاستيراد كاملاً بسبب صف واحد سيئ.

### ج) استعادة نسخة احتياطية (`backup` module جديد)
`lib/backup.ts` كان يأخذ نسخًا تلقائية بلا أي إمكانية استعادة. الآن `backup.restoreFromBackup`:
1. يمنع path traversal صراحة (اسم ملف فقط، رفض أي فاصل مسار)
2. يأخذ نسخة أمان لحالة *ما قبل* الاستعادة نفسها قبل الاستبدال
3. يغلق الاتصال الحالي (`closeDatabase()`) قبل الكتابة فوق ملف القاعدة مباشرة
4. يستدعي `app.relaunch()` + `app.exit(0)` لإعادة تشغيل نظيفة كاملة — أبسط وأضمن من محاولة إعادة تهيئة حية لكل الحالة في الذاكرة

### التجميع النهائي
**13 موديولاً الآن**: + `backup` الجديد.

**إجمالي اختبارات الباك-إند: 23/23 ناجحة.**

## 12. تحديث لاحق خامس: إصلاحان حرجان اكتشفهما التشغيل الفعلي الحقيقي للمستخدم

هذان الخطآن **لم يظهرا في أي اختبار Vitest سابق** — ظهرا فقط عند تشغيل المستخدم الفعلي لـ `npm run dev` على جهازه، وهذا درس مهم: اختبارات Vitest تُشغِّل الكود من مكانه المصدري مباشرة (بلا تصريف tsc منفصل)، فلا تكتشف أخطاء خاصة بمرحلة *البناء/التصريف* نفسها.

### أ) 🔴 مسار `drizzle/migrations` خاطئ بعد تصريف tsc (خطأ تشغيلي، كان يمنع الإقلاع بالكامل)
`lib/db.ts` كان يحسب مسار الـ migrations عبر `path.join(__dirname, "../../drizzle/migrations")`. هذا صحيح في الاختبارات (vitest ينفّذ من المصدر مباشرة)، لكن بعد `tsc -p tsconfig.electron.json`، يصبح `__dirname` وقت التشغيل هو `dist-electron/backend/lib` (وليس `backend/lib` المصدر) — والمسار النسبي يشير حينها إلى `dist-electron/drizzle/migrations` **غير الموجود إطلاقًا** (tsc يُصرِّف ملفات `.ts` فقط، لا ينسخ ملفات `.sql`).

**الإصلاح:** `initDatabase()` يقبل الآن `migrationsFolder` كمعطى صريح اختياري، يُحسَب ويُمرَّر من `frontend/electron/main.ts` حصرًا (حيث Electron يعرف الفرق بثقة عبر `app.isPackaged`/`app.getAppPath()`/`process.resourcesPath`) — بدل الاعتماد على حساب `__dirname` الهش. نفس المبدأ المطبَّق سابقًا على `DB_PATH` (loadEnv override) وملف الـ log (`configureLogger`).

### ب) 🔴 خطأ TypeScript ممنهج عبر 8 مواقع: `number | undefined` غير قابل للإسناد لـ `number`
السبب الجذري الوحيد لكل الأخطاء الثمانية: `middleware/ipcValidate.ts` كان يستخدم `ZodSchema<TSchema>` (اختصار لـ `ZodType<TSchema, ZodTypeDef, TSchema>`) الذي **يُجبر TypeScript على اعتبار نوع المُدخَل قبل التحقق مطابقًا تمامًا لنوع المُخرَج بعده** — خطأ لأي حقل فيه `.default(...)` (`pageSize`, `discount`, `amountPaid`, `copies`, `lowStockThreshold`...): قبل التحقق الحقل اختياري، بعده مضمون القيمة. هذا كان يُسرّب نوعًا اختياريًا خاطئًا لكل موديول تقريبًا يستخدم schema فيها قيمة افتراضية.

**الإصلاح:** استبدال التوقيع بـ `<TSchemaType extends ZodType<any, any, any>>` مع استخراج `z.output<TSchemaType>` صراحة لنوع مدخل الـ handler — النوع الصحيح فعليًا بعد `safeParse()`. **اختبار مخصص جديد (`ipcValidate.test.ts`)** يثبت في runtime أن القيم الافتراضية تُملأ فعليًا قبل وصولها للـ handler، مانعًا تكرار هذا الخطأ مستقبلاً.

**إصلاح ثالث صغير مرتبط:** `backend/modules/backup/backup.service.ts` — `restoreFromBackup` لم تكن `async` رغم استخدامها في سياق يتوقع `Promise` (خطأ TS منفصل ظهر في نفس اللوج). أُصلح بإضافة `async`.

**إصلاح رابع وقائي:** `tsconfig.electron.json` كان يُصرِّف ملفات `*.test.ts` ضمن بناء الإنتاج (`dist-electron`) بلا داعٍ — أُضيف `"exclude": ["**/*.test.ts", "backend/test-utils/**"]`.

**تحقق فعلي:** أُعيد تشغيل `tsc -p tsconfig.electron.json --noEmit` بنفس الأمر الحقيقي بالضبط بعد الإصلاح → **صفر أخطاء**. أُعيد تشغيل كل اختبارات Vitest بعد التعديل → **45/45 ناجحة** (لم يتأثر شيء).
