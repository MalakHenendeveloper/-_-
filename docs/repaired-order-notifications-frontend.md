# API Contract: إشعارات انتهاء الإصلاح

## 1. تسجيل Push Token

### Endpoint

```http
POST /api/push-tokens
```

### Headers

```http
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

### Request

```json
{
  "token": "FCM_DEVICE_TOKEN"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "تم تسجيل جهاز الإشعارات بنجاح",
  "data": {}
}
```

الأدوار المسموحة: `client`, `delegate`, `center`, `admin`.

---

## 3. تغيير حالة الطلب إلى تم الإصلاح

هذا هو endpoint الخاص بالسنتر، وبعد نجاحه يقوم الباك إند تلقائيًا بإرسال الإشعارين الجديدين.

### Endpoint

```http
PUT /api/centers/dashboard/orders/:orderId/status
```

### Headers

```http
Authorization: Bearer <CENTER_ACCESS_TOKEN>
Content-Type: application/json
```

### Request

```json
{
  "status": "repaired",
  "note": "تم الانتهاء من إصلاح الهاتف"
}
```

### Response `200`

```json
{
  "success": true,
  "message": "تم تحديث حالة الطلب بنجاح",
  "data": {
    "order": {
      "_id": "665f00000000000000000001",
      "orderNumber": "ORD-20260915-0001",
      "status": "repaired"
    }
  }
}
```

قد يحتوي `data.order` على حقول إضافية من الطلب.

### Response خطأ `400`

```json
{
  "success": false,
  "message": "رسالة الخطأ",
  "statusCode": 400,
  "errors": []
}
```

---

# إشعارات FCM الجديدة

لا يوجد endpoint يستدعيه الفرونت لإرسال الإشعار. الباك إند يرسل الإشعارات تلقائيًا بعد حفظ الحالة `repaired` بنجاح.

## إشعار المندوبين: `order_repaired`

### FCM Data

```json
{
  "type": "order_repaired",
  "orderId": "665f00000000000000000001",
  "orderNumber": "ORD-20260915-0001"
}
```

### Notification

```json
{
  "title": "تم إصلاح الجهاز",
  "body": "تم الانتهاء من إصلاح جهاز. افتح الطلبات الجاهزة للتوصيل لاستلام المهمة."
}
```

بعد الضغط، يفتح الفرونت شاشة الطلبات الجاهزة للتوصيل باستخدام:

```http
GET /api/delegate/orders/available-delivery
```

## إشعار العميل: `order_repaired_client`

### FCM Data

```json
{
  "type": "order_repaired_client",
  "orderId": "665f00000000000000000001",
  "orderNumber": "ORD-20260915-0001"
}
```

### Notification

```json
{
  "title": "تم إصلاح جهازك",
  "body": "تم الانتهاء من إصلاح هاتفك وسيتم تجهيزه للتوصيل."
}
```

بعد الضغط، يفتح الفرونت تفاصيل الطلب باستخدام `orderId`.

## أنواع الإشعارات

| `data.type`             | المستلم   | الإجراء                     |
| ----------------------- | --------- | --------------------------- |
| `order_repaired`        | المندوبون | فتح الطلبات الجاهزة للتوصيل |
| `order_repaired_client` | العميل    | فتح تفاصيل الطلب            |
