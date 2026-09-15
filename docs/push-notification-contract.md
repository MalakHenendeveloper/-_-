# Push Notification Contract

This document describes the push token registration endpoints and the expected order notification flow for delegates, admins, and selected repair center owners.

## 1. Token registration endpoints

### Register token

- Method: `POST`
- URL: `/api/push-tokens`
- Auth: `Bearer <access_token>` for a delegate, center owner, or admin
- Allowed roles: `delegate`, `center`, `admin`
- Body:

```json
{
  "token": "FCM_DEVICE_TOKEN_HERE"
}
```

- Success response:

```json
{
  "success": true,
  "message": "تم تسجيل جهاز الإشعارات بنجاح",
  "data": {}
}
```

## 2. Order notification flow

When a client creates an order through the order creation endpoint, the backend saves the order and triggers notification fan-out through the shared service.

### Notification targets

1. Delegates
   - Function: `notifyDelegatesAboutNewOrder(order)`
   - Title: `طلب جديد`
   - Body: `يوجد طلب جديد يحتاج إلى استلامه.`
   - Data payload:

```json
{
  "type": "new_order",
  "orderId": "<order_id>",
  "orderNumber": "<order_number>"
}
```

2. Admins
   - Function: `notifyAdminsAboutNewOrder(order)`
   - Title: `طلب جديد`
   - Body: `تم إنشاء طلب جديد رقم <orderNumber>`
   - Data payload:

```json
{
  "type": "new_order_admin",
  "orderId": "<order_id>",
  "orderNumber": "<order_number>"
}
```

3. Selected center owner
   - Function: `notifyCenterOwnerAboutNewOrder(order)`
   - Runs only when the order contains `repairCenter`
   - Title: `طلب جديد`
   - Body: `تم إنشاء طلب جديد داخل مركزك.`
   - Data payload:

```json
{
  "type": "new_order_center",
  "orderId": "<order_id>",
  "orderNumber": "<order_number>"
}
```

## 3. Backend implementation notes

- Push tokens are stored in `PushToken` collection using the `user`, `token`, and `platform` fields.
- All role token endpoints reuse the existing delegate controller token registration/removal logic.
- The service uses Firebase Admin `sendEachForMulticast` and removes invalid tokens from the token store.
- If Firebase credentials are missing in environment variables, the service logs a warning and safely returns without sending notifications.

## 4. Frontend brief (جاهز للتنفيذ)

### الفكرة العامة

الفرونت مسؤول عن:

1. طلب Firebase FCM token من الجهاز.
2. إرسال الـ token إلى الـ backend بعد نجاح تسجيل الدخول.
3. إعادة إرسال الـ token عند تغيّره.
4. حذف الـ token عند تسجيل الخروج من الجهاز.
5. استقبال الإشعار وفتح تفاصيل الطلب عند الضغط عليه.

الفرونت لا يستدعي API لإرسال الإشعار. عند إنشاء العميل طلبًا بنجاح، الـ backend يرسل الإشعارات تلقائيًا للمستلمين الذين لديهم token مسجل.

### الـ headers المطلوبة

كل endpoints الخاصة بالـ push تحتاج access token الخاص بالمستخدم الحالي:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

استبدل `<BASE_URL>` بعنوان الـ API المستخدم في البيئة الحالية.

### 1. تسجيل الـ FCM token

يتم استدعاء endpoint واحد حسب نوع المستخدم:

| نوع المستخدم | Method | URL                                   |
| ------------ | ------ | ------------------------------------- |
| Delegate     | `POST` | `<BASE_URL>/api/delegate/push-tokens` |
| Center owner | `POST` | `<BASE_URL>/api/centers/push-tokens`  |
| Admin        | `POST` | `<BASE_URL>/api/admin/push-tokens`    |

Request body:

```json
{
  "token": "FCM_DEVICE_TOKEN_HERE"
}
```

ملاحظات:

- قيمة `token` يجب أن تكون string ولا تقل عن 20 حرفًا.
- لا نرسل `platform` من الفرونت؛ الـ backend يسجل المنصة حاليًا كـ `android`.
- يجب تنفيذ الطلب بعد login ومع وجود access token.
- إذا تغير FCM token بسبب إعادة تثبيت التطبيق أو تحديث بيانات Firebase، يجب إرسال القيمة الجديدة مرة أخرى.

Success response (`200`):

```json
{
  "success": true,
  "message": "تم تسجيل جهاز الإشعارات بنجاح",
  "data": {}
}
```

### 2. إلغاء تسجيل الـ token

يتم استدعاؤه عند logout من الجهاز، وبنفس endpoint الخاص بالدور مع تغيير method إلى `DELETE`:

| نوع المستخدم | Method   | URL                                   |
| ------------ | -------- | ------------------------------------- |
| Delegate     | `DELETE` | `<BASE_URL>/api/delegate/push-tokens` |
| Center owner | `DELETE` | `<BASE_URL>/api/centers/push-tokens`  |
| Admin        | `DELETE` | `<BASE_URL>/api/admin/push-tokens`    |

Request body:

```json
{
  "token": "FCM_DEVICE_TOKEN_HERE"
}
```

Success response (`200`):

```json
{
  "success": true,
  "message": "تم إلغاء تسجيل جهاز الإشعارات بنجاح",
  "data": {}
}
```

### 3. Error response

في حالة token غير صحيح أو access token غير موجود/منتهي:

```json
{
  "success": false,
  "message": "رسالة الخطأ",
  "statusCode": 400,
  "errors": []
}
```

يجب عدم اعتبار تسجيل الـ token ناجحًا إلا إذا كانت قيمة `success` تساوي `true`.

### 4. متى تصل الإشعارات؟

عند إنشاء طلب جديد بنجاح من خلال `POST /api/orders`، يرسل الـ backend الإشعارات تلقائيًا:

| المستلم                   | `data.type`        | عنوان الإشعار | نص الإشعار                            |
| ------------------------- | ------------------ | ------------- | ------------------------------------- |
| كل الـ delegates النشطين  | `new_order`        | `طلب جديد`    | `يوجد طلب جديد يحتاج إلى استلامه.`    |
| كل الـ admins النشطين     | `new_order_admin`  | `طلب جديد`    | `تم إنشاء طلب جديد رقم <orderNumber>` |
| مالك مركز الصيانة المختار | `new_order_center` | `طلب جديد`    | `تم إنشاء طلب جديد داخل مركزك.`       |

كل إشعار يحتوي على البيانات التالية:

```json
{
  "type": "new_order",
  "orderId": "<order_id>",
  "orderNumber": "<order_number>"
}
```

قيمة `type` تختلف حسب المستلم كما هو موضح في الجدول، أما `orderId` و`orderNumber` فهما string ويُستخدمان لفتح تفاصيل الطلب.

### 5. المطلوب في تطبيق الفرونت

- طلب صلاحية الإشعارات من المستخدم.
- الحصول على FCM token من Firebase.
- تسجيله باستخدام endpoint الدور بعد login.
- إعداد handlers لحالات foreground وbackground وterminated.
- عند الضغط على إشعار، قراءة `data.type` و`data.orderId` ثم فتح شاشة تفاصيل الطلب المناسبة.
- عدم الاعتماد على نص العنوان أو body لتحديد نوع الإشعار؛ استخدم `data.type`.
- عند logout، استدعاء `DELETE` ثم مسح token المحلي إن كان ذلك مناسبًا لتدفق التطبيق.

مثال توجيه الضغط على الإشعار:

```text
new_order        -> شاشة الطلبات المتاحة للـ delegate
new_order_admin  -> شاشة تفاصيل الطلب في لوحة admin
new_order_center -> شاشة تفاصيل الطلب في لوحة المركز
```
