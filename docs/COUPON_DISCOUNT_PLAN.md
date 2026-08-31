# خطة إضافة كوبونات الخصم

## المتطلبات النهائية

- نوع الخصم: مبلغ ثابت `fixed` فقط.
- مدة الكوبون: ينتهي بعد 5 أيام من تاريخ إنشائه.
- نفس المستخدم يستطيع استخدام نفس الكوبون بحد أقصى 3 مرات.
- لا يوجد حد أدنى لقيمة الطلب.
- لا تتم إضافة شرط يمنع وصول الإجمالي إلى أقل من صفر حسب القرار الحالي.
- إذا أُلغي الطلب قبل الدفع، يعود الاستخدام متاحًا للمستخدم.
- إذا أُلغي الطلب بعد الدفع، لا يعود الاستخدام متاحًا.

## 1. إنشاء نموذج الكوبون

إضافة الملف:

`src/models/Coupon.js`

الحقول المقترحة:

```js
{
  code: String,
  discountType: "fixed",
  discountValue: Number,
  expiresAt: Date,
  isActive: Boolean,
  createdBy: ObjectId,
  createdAt: Date
}
```

القواعد:

- جعل `code` فريدًا وتحويله إلى uppercase.
- تثبيت `discountType` على `fixed`.
- يجب أن تكون قيمة `discountValue` أكبر من صفر.
- حساب `expiresAt` تلقائيًا بعد 5 أيام من الإنشاء.
- عدم إضافة `minimumOrderAmount`.

## 2. تسجيل استخدام الكوبون

إضافة الملف:

`src/models/CouponUsage.js`

```js
{
  coupon: ObjectId,
  user: ObjectId,
  order: ObjectId,
  usageNumber: Number,
  status: "active" | "reversed",
  usedAt: Date,
  reversedAt: Date
}
```

يجب إضافة index يمنع تسجيل استخدام مكرر لنفس الكوبون والمستخدم والطلب:

```js
{
  coupon: 1,
  user: 1,
  order: 1
}
```

يُسمح للمستخدم بثلاثة سجلات استخدام فعالة فقط لنفس الكوبون.

## 3. APIs الخاصة بالأدمن

تُضاف إلى `src/routes/admin.routes.js`:

```http
POST   /api/admin/coupons
GET    /api/admin/coupons
GET    /api/admin/coupons/:id
PUT    /api/admin/coupons/:id
DELETE /api/admin/coupons/:id
```

وظائف الأدمن:

- إنشاء كوبون بقيمة خصم ثابتة.
- عرض الكوبونات وتواريخ انتهائها.
- تفعيل أو إيقاف الكوبون.
- عرض عدد مرات الاستخدام.
- حذف أو تعطيل الكوبون.
- عدم تغيير `code` بعد الإنشاء حتى لا تتأثر الطلبات القديمة.

## 4. فحص الكوبون قبل إنشاء الطلب

إضافة endpoint للعميل:

```http
POST /api/orders/validate-coupon
```

Body:

```json
{
  "code": "WELCOME20",
  "amount": 50000
}
```

التحقق من:

1. وجود الكوبون.
2. أن الكوبون فعال.
3. أن الكوبون لم ينتهِ.
4. أن المستخدم لم يصل إلى 3 استخدامات فعالة.
5. عدم استخدام الكوبون سابقًا في نفس الطلب.

مثال للرد:

```json
{
  "valid": true,
  "discountAmount": 20000,
  "finalAmount": 30000,
  "remainingUses": 2,
  "expiresAt": "2026-09-01T10:00:00.000Z"
}
```

## 5. ربط الكوبون بالطلب

تعديل `src/models/Order.js` لإضافة snapshot للكوبون:

```js
coupon: {
  id: ObjectId,
  code: String,
  discountType: "fixed",
  discountValue: Number,
  discountAmount: Number
}
```

يتم حفظ بيانات الكوبون داخل الطلب حتى لا تتغير حسابات الطلبات القديمة عند تعديل الكوبون أو إيقافه.

## 6. تعديل إنشاء الطلب

تعديل `src/controllers/order.controller.js` لقبول:

```json
{
  "couponCode": "WELCOME20"
}
```

أثناء إنشاء الطلب:

1. حساب قيمة الطلب الأصلية.
2. البحث عن الكوبون والتحقق من صلاحيته.
3. التأكد من عدم تجاوز المستخدم 3 استخدامات فعالة.
4. حساب الخصم الثابت.
5. حفظ snapshot داخل الطلب.
6. إنشاء سجل `CouponUsage` مع رقم الاستخدام.

يجب تنفيذ إنشاء الطلب وسجل الاستخدام داخل MongoDB transaction حتى لا يتم إنشاء طلب بدون تسجيل الاستخدام أو العكس.

## 7. تعديل الحساب المالي

تعديل `src/utils/financialCalculator.js` لإضافة `discountAmount` إلى الحساب المالي.

الحساب المقترح:

```js
const subtotal = repair + pickup + delivery + admin;
const clientTotal = subtotal - discount;
```

ويُضاف إلى breakdown الخاص بالعميل:

```js
breakdown: {
  (repairCost, pickupFee, deliveryFee, adminFee, discountAmount);
}
```

الخصم يؤثر على المبلغ المطلوب من العميل، بينما تظل مستحقات مركز الصيانة والمندوب محسوبة من القيم الأصلية.

## 8. تحديث Financial Snapshot

إضافة الحقول التالية إلى `financialSnapshot` داخل `Order`:

```js
{
  subtotal: Number,
  discountAmount: Number,
  clientTotal: Number
}
```

وتحديث الدوال التالية:

- `buildFinancialSnapshot`
- `hasValidFinancialSnapshot`
- `buildFinancialViewForRole`

بحيث تشمل قيمة الخصم في الحساب والتحقق.

## 9. إلغاء الطلب وإعادة الاستخدام

عند إلغاء الطلب:

```text
إذا paymentStatus === "unpaid":
    تغيير CouponUsage.status إلى "reversed"
    تسجيل reversedAt
    السماح باستخدام جديد

إذا paymentStatus !== "unpaid":
    عدم إعادة الاستخدام
```

لا يتم حذف سجل الاستخدام؛ يتم تغييره إلى `reversed` للحفاظ على السجل والتقارير.

يُحسب حد الاستخدام باستخدام السجلات الفعالة فقط:

```js
countDocuments({
  coupon,
  user,
  status: "active",
});
```

## 10. تحديث التوثيق

تحديث الملفات التالية:

- `docs/swagger.json`
- `postman_collection.json`
- `docs/mobile-maintenance-api.postman_collection.json`

يجب توثيق:

- إنشاء الكوبون.
- فحص الكوبون.
- استخدام الكوبون عند إنشاء الطلب.
- الكوبون المنتهي.
- تجاوز الحد الأقصى للاستخدام.
- إعادة الاستخدام بعد إلغاء الطلب قبل الدفع.

## 11. الاختبارات المطلوبة

### Unit Tests

- إنشاء كوبون بتاريخ انتهاء بعد 5 أيام.
- قبول الخصم الثابت.
- رفض قيمة خصم تساوي صفرًا أو أقل.
- رفض كوبون منتهي.
- رفض كوبون غير فعال.
- السماح للمستخدم باستخدام الكوبون 3 مرات.
- رفض الاستخدام الرابع.
- السماح لمستخدم آخر باستخدام نفس الكوبون.
- حساب الإجمالي بعد الخصم.
- حفظ الخصم داخل `financialSnapshot`.

### Integration Tests

- إنشاء طلب باستخدام كوبون.
- منع استخدام نفس الكوبون أكثر من 3 مرات للمستخدم نفسه.
- إلغاء طلب غير مدفوع وإعادة الاستخدام.
- إلغاء طلب مدفوع وعدم إعادة الاستخدام.
- منع إنشاء استخدام مكرر لنفس الطلب.
- اختبار طلبين متزامنين للتأكد من عدم تجاوز الحد الأقصى.

## ترتيب التنفيذ

1. إنشاء `Coupon` model.
2. إنشاء `CouponUsage` model.
3. إنشاء utility للتحقق من الكوبون وحساب الخصم.
4. إضافة Admin CRUD APIs.
5. إضافة API لفحص الكوبون.
6. ربط الكوبون بإنشاء الطلب داخل transaction.
7. تعديل `financialCalculator.js`.
8. تعديل `Order.js` والـ financial snapshot.
9. تعديل إلغاء الطلب.
10. إضافة Unit وIntegration tests.
11. تحديث Swagger وPostman.
