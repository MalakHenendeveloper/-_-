# 📱 دليل الـ API Endpoints والفلو الكامل

## جدول المحتويات

1. [نظرة عامة على المشروع](#نظرة-عامة)
2. [Architecture وتدفق البيانات](#architecture)
3. [سيناريوهات الاستخدام](#سيناريوهات)
4. [شرح كل مجموعة endpoints](#endpoints)
5. [كيفية رفع الصور](#رفع-الصور)
6. [كيفية التيست](#التيست)
7. [أمثلة عملية](#أمثلة)

---

## 🎯 نظرة عامة

### ما هي المنصة؟

**Mobile Maintenance API** - منصة متخصصة في إصلاح الأجهزة المحمولة والإلكترونية:

- ✅ **العملاء** يرسلون أجهزتهم للإصلاح
- ✅ **المندوبون** يستلمون الأجهزة من العملاء ويسلمونها للمراكز
- ✅ **مراكز الإصلاح** تفحص وتصلح الأجهزة
- ✅ **المسؤولون** يديرون العملية كاملة

### الأدوار الأساسية

```
1. Client (عميل)      → ينشئ طلب إصلاح
2. Delegate (مندوب)    → يستلم ويسلم الأجهزة
3. Center (مركز)       → يفحص ويصلح الأجهزة
4. Admin (مسؤول)       → يدير كل شيء
```

---

## 🏗️ Architecture وتدفق البيانات

### الـ Request/Response Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1️⃣ Client Application (Mobile/Web)                        │
│    - يرسل Request مع Auth Token                            │
│    - بيتوقع Response قياسي                                 │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP Request
                 │ Authorization: Bearer <token>
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 2️⃣ Express Server (Port 5000)                              │
│    ├─ CORS Middleware (السماح بالطلبات من أي origin)      │
│    ├─ Body Parser (تحليل JSON)                            │
│    ├─ Morgan Logger (تسجيل الطلبات)                       │
│    ├─ Rate Limiter (حماية من الهجمات)                      │
│    └─ Routes Handler                                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 3️⃣ Auth Middleware                                         │
│    - التحقق من الـ JWT Token                              │
│    - استخراج معلومات المستخدم                             │
│    - في حالة انتهاء الصلاحية → 401                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 4️⃣ Role-Based Authorization                               │
│    - التحقق من الصلاحيات (admin, center, delegate, etc) │
│    - في حالة عدم السماح → 403                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 5️⃣ Validation Middleware (Joi)                             │
│    - التحقق من البيانات المرسلة                           │
│    - التحقق من الأنواع والتنسيقات                          │
│    - في حالة الخطأ → 400 مع تفاصيل الخطأ                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 6️⃣ Sanitization (XSS Protection)                           │
│    - إزالة الأوامر البرمجية الخطيرة                       │
│    - تنظيف البيانات                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 7️⃣ File Upload (إذا كان الـ request يحتوي صور)             │
│    - رفع الصور إلى Cloudinary                              │
│    - تحويل إلى WebP + Resize                               │
│    - الحصول على URL للصورة                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 8️⃣ Controller (معالج الطلب الفعلي)                        │
│    - التحقق من البيانات في الـ DB                         │
│    - تطبيق البيزنس لوجك                                   │
│    - تعديل أو إنشاء بيانات في الـ DB                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 9️⃣ Response (الرد)                                         │
│    - Success: 200 OK مع البيانات                          │
│    - Error: 400-500 مع رسالة الخطأ                        │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP Response
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ 🔟 Client Application                                       │
│    - استقبال النتيجة                                        │
│    - تحديث واجهة المستخدم                                  │
└─────────────────────────────────────────────────────────────┘
```

### قاعدة البيانات (MongoDB)

```
MongoDB (Cloud أو Local)
    ├─ Users Collection
    │  └─ (Clients, Delegates, Admins)
    │
    ├─ RepairCenters Collection
    │  └─ (المراكز المسجلة)
    │
    ├─ Orders Collection ⭐ (الأساسي)
    │  └─ (كل طلب إصلاح)
    │
    ├─ Devices Collection
    │  └─ (معلومات الأجهزة)
    │
    ├─ Inspections Collection
    │  └─ (نتائج الفحوصات)
    │
    ├─ PriceOffers Collection
    │  └─ (عروض الأسعار)
    │
    └─ OTPs Collection
       └─ (أكواد التحقق - تُحذف تلقائياً بعد الانتهاء)
```

---

## 📋 سيناريوهات الاستخدام

### السيناريو 1️⃣: طلب إصلاح من البداية للنهاية

```
الخطوة 1: العميل يسجل حساب
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /api/auth/register
Body: {
  "name": "أحمد محمد",
  "phone": "01012345678",
  "email": "ahmed@example.com",
  "password": "SecurePass123!"
}
Response: {
  "success": true,
  "data": {
    "user": { id, name, phone, role: "client" },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}

الخطوة 2: العميل يسجل دخول
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /api/auth/login
Body: {
  "phone": "01012345678",
  "password": "SecurePass123!"
}
Response: نفس Response التسجيل

الخطوة 3: العميل ينشئ طلب إصلاح (مع صور الجهاز)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /api/orders/
Header: Authorization: Bearer <accessToken>
Body: {
  "device": {
    "type": "phone",
    "brand": "Apple",
    "model": "iPhone 14",
    "problemType": "screen",
    "problemDescription": "الشاشة مكسورة بشكل كامل"
  },
  "pickupAddress": {
    "address": "شارع النيل، برج النيل",
    "city": "القاهرة",
    "coordinates": { "lat": 30.0444, "lng": 31.2357 }
  }
}
Files: [صور الجهاز]
Response: {
  "orderNumber": "ORD-20260620-0001",
  "status": "pending",
  "id": "507f1f77bcf86cd799439011"
}

الخطوة 4: المسؤول يعيّن مندوب للاستلام
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUT /api/admin/orders/:orderId/assign-delegate
Header: Authorization: Bearer <adminToken>
Body: {
  "delegateId": "507f1f77bcf86cd799439012"
}
Response: { success: true, order updated }

الخطوة 5: المندوب يقبل المهمة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUT /api/delegate/tasks/:orderId/accept
Header: Authorization: Bearer <delegateToken>
Response: { success: true, task accepted }

الخطوة 6: المندوب يذهب للعميل ويأخذ صور الاستلام
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /api/delegate/tasks/:orderId/pickup-photos
Header: Authorization: Bearer <delegateToken>
Files: [صور الاستلام من العميل]
Response: { success: true, photos uploaded }

الخطوة 7: المندوب يطلب OTP من العميل للتأكيد
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /api/delegate/tasks/:orderId/verify-pickup-otp
Header: Authorization: Bearer <delegateToken>
Body: {
  "otp": "123456"  // الكود الذي أرسل للعميل عبر SMS
}
Response: { success: true, OTP verified }

الخطوة 8: المندوب يؤكد الاستلام من العميل
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUT /api/delegate/tasks/:orderId/confirm-pickup
Header: Authorization: Bearer <delegateToken>
Response: { success: true, status: "picked_up" }

الخطوة 9: المندوب يسلم للمركز (صور + OTP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /api/delegate/tasks/:orderId/pickup-photos (صور التسليم)
PUT /api/delegate/tasks/:orderId/confirm-drop-center
Response: { success: true, status: "at_center" }

الخطوة 10: مركز الإصلاح يستلم الجهاز ويفحصه
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUT /api/delegate/tasks/:orderId/confirm-pickup-center
PUT /api/centers/dashboard/orders/:orderId/status
Body: { "status": "inspecting" }
Response: { success: true }

الخطوة 11: مركز الإصلاح ينشئ تقرير الفحص
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /api/inspections/
Header: Authorization: Bearer <centerToken>
Body: {
  "orderId": "507f1f77bcf86cd799439011",
  "findings": [
    { "issue": "شاشة مكسورة", "severity": "major" },
    { "issue": "بطارية ضعيفة", "severity": "minor" }
  ],
  "notes": "الجهاز يحتاج استبدال شاشة وبطارية"
}
Files: [صور الفحص]
Response: { success: true, inspection created }

الخطوة 12: مركز الإصلاح يرسل عرض سعر
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /api/priceOffers/
Header: Authorization: Bearer <centerToken>
Body: {
  "orderId": "507f1f77bcf86cd799439011",
  "spareParts": [
    { "name": "شاشة iPhone 14", "cost": 2500 },
    { "name": "بطارية", "cost": 300 }
  ],
  "laborCost": 500,
  "inspectionFee": 100,
  "deliveryFee": 50,
  "totalCost": 3450,
  "estimatedDays": 2,
  "notes": "سيتم التسليم بعد يومين"
}
Response: { success: true, offer created }

الخطوة 13: العميل يراجع ويوافق على العرض
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUT /api/orders/:orderId/approve-offer
Header: Authorization: Bearer <clientToken>
Body: { "approved": true }
Response: { success: true, status: "approved" }

الخطوة 14: مركز الإصلاح يصلح الجهاز
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUT /api/centers/dashboard/orders/:orderId/status
Body: { "status": "repairing" }
// ثم بعد الإصلاح
Body: { "status": "repaired" }
Response: { success: true }

الخطوة 15: المندوب يستلم الجهاز من المركز
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUT /api/delegate/tasks/:orderId/confirm-pickup-center
POST /api/delegate/tasks/:orderId/pickup-photos (صور الاستلام من المركز)
Response: { success: true }

الخطوة 16: المندوب يسلم الجهاز للعميل (صور + OTP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST /api/delegate/tasks/:orderId/delivery-photos
POST /api/delegate/tasks/:orderId/verify-delivery-otp
Body: { "otp": "654321" }
PUT /api/delegate/tasks/:orderId/confirm-delivery
Response: { success: true, status: "delivered" }

الخطوة 17: العميل يقيّم الخدمة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUT /api/orders/:orderId
Header: Authorization: Bearer <clientToken>
Body: {
  "rating": {
    "score": 5,
    "comment": "خدمة ممتازة وسريعة"
  }
}
Response: { success: true }
```

---

## 🔌 شرح كل مجموعة Endpoints

### 1️⃣ **Auth Endpoints** - `/api/auth`

#### POST `/register` - تسجيل عميل جديد

```
الغرض: إنشاء حساب جديد للعميل
الدور المطلوب: Public (بدون تسجيل دخول)
Rate Limit: 5 requests/15 minutes

Request:
{
  "name": "اسم العميل",
  "phone": "01012345678",
  "email": "email@example.com",
  "password": "SecurePass123!"
}

Response (Success):
{
  "success": true,
  "message": "تم التسجيل بنجاح",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "اسم العميل",
      "phone": "01012345678",
      "role": "client"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

Response (Error):
{
  "success": false,
  "message": "رقم الهاتف مسجل بالفعل",
  "statusCode": 400,
  "errors": [...]
}
```

#### POST `/login` - تسجيل دخول

```
الغرض: تسجيل دخول المستخدم
الدور المطلوب: Public
Rate Limit: 5 requests/15 minutes

Request:
{
  "phone": "01012345678",
  "password": "SecurePass123!"
}

Response: نفس Response التسجيل (يتضمن tokens)
```

#### POST `/refresh-token` - تجديد الـ Access Token

```
الغرض: الحصول على access token جديد عند انتهاء الصلاحية
الدور المطلوب: Public (لكن يحتاج refresh token صحيح)

Request:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

ملاحظة: إذا تم اكتشاف محاولة استخدام refresh token مسروق
→ يتم حذف جميع refresh tokens من الـ DB (Security Feature)
```

#### POST `/logout` - تسجيل خروج

```
الغرض: حذف refresh token من الـ DB
الدور المطلوب: Authenticated User

Header: Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "message": "تم تسجيل الخروج بنجاح"
}

بعده: Client يحذف tokens من التخزين المحلي
```

#### POST `/send-otp` - إرسال OTP للتحقق

```
الغرض: إرسال كود تحقق عبر SMS
الدور المطلوب: Public
استخدامات: تسجيل، استرجاع كلمة المرور، تأكيد العمليات

Request:
{
  "phone": "01012345678",
  "type": "verify_phone"  // أو reset_password
}

Response:
{
  "success": true,
  "message": "تم إرسال OTP بنجاح",
  "data": {
    "expiresIn": 600  // عدد الثواني قبل انتهاء الصلاحية (10 دقائق)
  }
}

العملية: Server يولد OTP 6 أرقام ويرسله عبر SMS
في التطوير: يظهر في Console فقط
```

#### POST `/verify-otp` - التحقق من OTP

```
الغرض: التحقق من صحة الكود المرسل
الدور المطلوب: Public

Request:
{
  "phone": "01012345678",
  "code": "123456",
  "type": "verify_phone"
}

Response:
{
  "success": true,
  "message": "تم التحقق بنجاح",
  "data": {
    "verified": true
  }
}
```

#### POST `/forgot-password` - طلب استرجاع كلمة المرور

```
الغرض: بدء عملية استرجاع كلمة المرور
الدور المطلوب: Public

Request:
{
  "phone": "01012345678"
}

Response:
{
  "success": true,
  "message": "تم إرسال OTP على رقمك"
}
```

#### POST `/reset-password` - تغيير كلمة المرور

```
الغرض: تعيين كلمة المرور جديدة
الدور المطلوب: Public (لكن يحتاج OTP صحيح)

Request:
{
  "phone": "01012345678",
  "code": "123456",
  "newPassword": "NewSecurePass123!"
}

Response:
{
  "success": true,
  "message": "تم تغيير كلمة المرور بنجاح"
}
```

---

### 2️⃣ **User Endpoints** - `/api/users`

#### GET `/profile` - الحصول على البيانات الشخصية

```
الغرض: الحصول على معلومات حساب المستخدم
الدور المطلوب: Authenticated User

Header: Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "اسم العميل",
    "phone": "01012345678",
    "email": "email@example.com",
    "role": "client",
    "avatar": "https://res.cloudinary.com/.../avatar.webp",
    "isActive": true,
    "isVerified": true,
    "addresses": [
      {
        "id": "507f1f77bcf86cd799439012",
        "label": "البيت",
        "address": "شارع النيل، برج النيل",
        "city": "القاهرة",
        "coordinates": { "lat": 30.0444, "lng": 31.2357 }
      }
    ],
    "createdAt": "2026-06-20T10:30:00Z"
  }
}
```

#### PUT `/profile` - تعديل البيانات الشخصية

```
الغرض: تحديث معلومات المستخدم
الدور المطلوب: Authenticated User

Header: Authorization: Bearer <accessToken>

Request:
{
  "name": "اسم جديد",
  "email": "newemail@example.com"
}

Response: البيانات المحدثة
```

#### PUT `/avatar` - تغيير صورة الملف الشخصي

```
الغرض: رفع صورة جديدة للملف الشخصي
الدور المطلوب: Authenticated User
Storage: Cloudinary (/users/avatars)

Header: Authorization: Bearer <accessToken>
Files: [image file]

Response:
{
  "success": true,
  "data": {
    "avatar": "https://res.cloudinary.com/.../avatar.webp"
  }
}
```

#### GET `/addresses` - قائمة العناوين

```
الغرض: الحصول على كل عناوين المستخدم
الدور المطلوب: Authenticated User

Header: Authorization: Bearer <accessToken>

Response:
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "label": "البيت",
      "address": "...",
      "city": "..."
    }
  ]
}
```

#### POST `/addresses` - إضافة عنوان جديد

```
الغرض: إضافة عنوان جديد (البيت، الشغل، إلخ)
الدور المطلوب: Authenticated User

Header: Authorization: Bearer <accessToken>

Request:
{
  "label": "الشغل",
  "address": "شارع رمسيس، برج الشركة",
  "city": "القاهرة",
  "coordinates": {
    "lat": 30.0562,
    "lng": 31.2449
  }
}

Response:
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439013",
    "label": "الشغل",
    ...
  }
}
```

#### PUT `/addresses/:id` - تعديل عنوان

```
الغرض: تعديل عنوان موجود
الدور المطلوب: Authenticated User

Header: Authorization: Bearer <accessToken>

Request: نفس بيانات الإضافة
```

#### DELETE `/addresses/:id` - حذف عنوان

```
الغرض: حذف عنوان من القائمة
الدور المطلوب: Authenticated User

Header: Authorization: Bearer <accessToken>

Response: { "success": true }
```

#### PUT `/change-password` - تغيير كلمة المرور

```
الغرض: تغيير كلمة المرور من داخل الحساب
الدور المطلوب: Authenticated User

Header: Authorization: Bearer <accessToken>

Request:
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}

Response: { "success": true }
```

---

### 3️⃣ **Order Endpoints** - `/api/orders`

#### POST `/` - إنشاء طلب إصلاح جديد

```
الغرض: إنشاء طلب إصلاح مع صور الجهاز
الدور المطلوب: Client (Authenticated)
Storage: Cloudinary (/orders/{orderId}/device)

Header: Authorization: Bearer <clientToken>
Files: [صور الجهاز - حتى 5 صور]

Request:
{
  "device": {
    "type": "phone",                    // phone, tablet, laptop
    "brand": "Apple",
    "model": "iPhone 14",
    "problemType": "screen",           // screen, battery, display, etc
    "problemDescription": "الشاشة مكسورة"
  },
  "pickupAddress": {
    "address": "شارع النيل",
    "city": "القاهرة",
    "coordinates": { "lat": 30.0444, "lng": 31.2357 }
  }
}

Response:
{
  "success": true,
  "message": "تم إنشاء الطلب بنجاح",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "orderNumber": "ORD-20260620-0001",
    "status": "pending",
    "device": {
      "type": "phone",
      "brand": "Apple",
      "model": "iPhone 14",
      "problemType": "screen",
      "images": [
        "https://res.cloudinary.com/.../device1.webp",
        "https://res.cloudinary.com/.../device2.webp"
      ]
    },
    "fees": {
      "inspection": 0,
      "delivery": 0,
      "repair": 0,
      "total": 0
    },
    "createdAt": "2026-06-20T10:30:00Z"
  }
}
```

#### GET `/` - قائمة طلبات العميل

```
الغرض: الحصول على كل طلبات العميل مع pagination
الدور المطلوب: Client (Authenticated)

Header: Authorization: Bearer <clientToken>
Query Parameters:
  - status: pending, picked_up, delivered, etc (optional)
  - page: 1 (default)
  - limit: 10 (default)
  - sort: createdAt (default)

Response:
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "orderNumber": "ORD-20260620-0001",
      "status": "pending",
      "device": { ... },
      "createdAt": "2026-06-20T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

#### GET `/:id` - تفاصيل طلب محدد

```
الغرض: الحصول على تفاصيل كاملة لطلب معين
الدور المطلوب: Client, Delegate, Center, Admin (بصلاحيات محدودة)

Header: Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "orderNumber": "ORD-20260620-0001",
    "status": "at_center",
    "client": {
      "id": "...",
      "name": "اسم العميل",
      "phone": "..."
    },
    "delegate": {
      "id": "...",
      "name": "اسم المندوب"
    },
    "repairCenter": {
      "id": "...",
      "name": "اسم المركز"
    },
    "device": { ... },
    "fees": { ... },
    "statusHistory": [
      {
        "status": "pending",
        "timestamp": "2026-06-20T10:30:00Z",
        "note": "تم إنشاء الطلب"
      },
      {
        "status": "picked_up",
        "timestamp": "2026-06-20T11:00:00Z",
        "note": "تم الاستلام من العميل"
      }
    ],
    "delegatePhotos": {
      "atPickup": ["https://..."],
      "atCenterDrop": ["https://..."],
      "atCenterPickup": [],
      "atDelivery": []
    },
    "clientApproval": {
      "status": "pending",
      "timestamp": null,
      "note": null
    },
    "rating": null,
    "paymentStatus": "unpaid",
    "createdAt": "2026-06-20T10:30:00Z",
    "updatedAt": "2026-06-20T11:00:00Z"
  }
}
```

#### PUT `/:id/cancel` - إلغاء الطلب

```
الغرض: إلغاء طلب (قبل الاستلام فقط)
الدور المطلوب: Client (صاحب الطلب)

Header: Authorization: Bearer <clientToken>

Request:
{
  "reason": "غيرت رأيي"  // optional
}

Response: { "success": true, "status": "cancelled" }

ملاحظة: لا يمكن إلغاء طلب بعد استلام الجهاز من العميل
```

#### PUT `/:id/approve-offer` - موافقة على عرض السعر

```
الغرض: وافقة العميل على عرض السعر من المركز
الدور المطلوب: Client

Header: Authorization: Bearer <clientToken>

Response:
{
  "success": true,
  "data": {
    "status": "approved",
    "clientApproval": {
      "status": "approved",
      "timestamp": "2026-06-20T12:00:00Z"
    }
  }
}
```

#### PUT `/:id/reject-offer` - رفض عرض السعر

```
الغرض: رفض عرض السعر (يعود الجهاز للعميل)
الدور المطلوب: Client

Header: Authorization: Bearer <clientToken>

Response:
{
  "success": true,
  "status": "rejected"
}
```

#### GET `/:id/status-history` - تاريخ حالات الطلب

```
الغرض: الحصول على كل التغييرات في حالة الطلب
الدور المطلوب: Client (طلبه فقط), Admin (أي طلب)

Header: Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "status": "pending",
      "timestamp": "2026-06-20T10:30:00Z",
      "note": "تم إنشاء الطلب",
      "updatedBy": { "id": "...", "name": "اسم العميل" }
    },
    {
      "status": "picked_up",
      "timestamp": "2026-06-20T11:00:00Z",
      "note": "تم الاستلام من العميل",
      "updatedBy": { "id": "...", "name": "اسم المندوب" }
    }
  ]
}
```

#### GET `/:id/tracking` - تتبع الطلب (Live)

```
الغرض: معلومات مختصرة عن الطلب الحالي (للتطبيق)
الدور المطلوب: Client

Header: Authorization: Bearer <clientToken>

Response:
{
  "success": true,
  "data": {
    "orderNumber": "ORD-20260620-0001",
    "status": "at_center",
    "currentLocation": {
      "place": "مركز الإصلاح - Cairo Fix",
      "coordinates": { "lat": 30.0500, "lng": 31.2300 }
    },
    "estimatedDelivery": "2026-06-22T14:00:00Z",
    "lastUpdate": "2026-06-20T14:30:00Z"
  }
}
```

---

### 4️⃣ **Repair Center Endpoints** - `/api/centers`

#### GET `/` - قائمة المراكز المتاحة

```
الغرض: الحصول على المراكز المتاحة للإصلاح (للعملاء)
الدور المطلوب: Public (بدون تسجيل دخول)

Query Parameters:
  - city: القاهرة (optional)
  - deviceType: phone (optional)
  - brand: Apple (optional)
  - page: 1 (default)
  - limit: 10 (default)

Response:
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439020",
      "name": "Cairo Fix",
      "phone": "01112345678",
      "email": "info@cairofix.com",
      "address": "شارع رمسيس",
      "city": "القاهرة",
      "logo": "https://res.cloudinary.com/.../logo.webp",
      "status": "active",
      "supportedBrands": ["Apple", "Samsung", "Huawei"],
      "supportedDeviceTypes": ["phone", "tablet"],
      "rating": 4.7,
      "totalRatings": 145,
      "inspectionFee": 100,
      "coordinates": { "lat": 30.0500, "lng": 31.2300 }
    }
  ],
  "pagination": { ... }
}
```

#### GET `/:id` - تفاصيل مركز محدد

```
الغرض: الحصول على معلومات كاملة عن المركز
الدور المطلوب: Public

Response: نفس بيانات المركز من القائمة + معلومات إضافية
```

#### GET `/dashboard/orders` - طلبات المركز

```
الغرض: قائمة الطلبات المرسلة للمركز
الدور المطلوب: Center (Authenticated)

Header: Authorization: Bearer <centerToken>

Query Parameters:
  - status: inspecting, approved, repairing, etc
  - page: 1
  - limit: 20

Response:
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "orderNumber": "ORD-20260620-0001",
      "status": "at_center",
      "client": { ... },
      "device": { ... },
      "createdAt": "2026-06-20T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### GET `/dashboard/orders/:id` - تفاصيل طلب للمركز

```
الغرض: الحصول على تفاصيل طلب معين من وجهة نظر المركز
الدور المطلوب: Center

Header: Authorization: Bearer <centerToken>

Response: نفس بيانات الطلب من GET /orders/:id
```

#### PUT `/dashboard/orders/:id/status` - تحديث حالة الطلب

```
الغرض: تحديث حالة الطلب (inspecting → repairing → repaired)
الدور المطلوب: Center

Header: Authorization: Bearer <centerToken>

Request:
{
  "status": "inspecting",  // أو repairing, repaired, etc
  "note": "جاري الفحص الآن"
}

Response:
{
  "success": true,
  "data": {
    "status": "inspecting",
    "statusHistory": [
      { "status": "inspecting", "timestamp": "...", "note": "..." }
    ]
  }
}

ملاحظة: الـ Server يتحقق من أن التغيير صحيح (لا يمكن الرجوع للخلف)
```

#### POST `/dashboard/orders/:id/inspection` - إنشاء تقرير فحص

```
الغرض: تسجيل نتائج فحص الجهاز
الدور المطلوب: Center
Storage: Cloudinary (/orders/{orderId}/inspection)

Header: Authorization: Bearer <centerToken>
Files: [صور الفحص]

Request:
{
  "findings": [
    {
      "issue": "شاشة مكسورة",
      "severity": "major"     // minor, major, critical
    },
    {
      "issue": "بطارية ضعيفة",
      "severity": "minor"
    }
  ],
  "notes": "الجهاز يحتاج استبدال شاشة وبطارية"
}

Response:
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439030",
    "findings": [ ... ],
    "notes": "...",
    "images": ["https://...", "https://..."],
    "inspectedAt": "2026-06-20T12:30:00Z"
  }
}
```

#### POST `/dashboard/orders/:id/price-offer` - إرسال عرض سعر

```
الغرض: إرسال عرض سعر للعميل
الدور المطلوب: Center

Header: Authorization: Bearer <centerToken>

Request:
{
  "spareParts": [
    { "name": "شاشة iPhone 14", "cost": 2500 },
    { "name": "بطارية", "cost": 300 }
  ],
  "laborCost": 500,
  "inspectionFee": 100,
  "deliveryFee": 50,
  "estimatedDays": 2,
  "notes": "سيتم التسليم بعد يومين"
}

Response:
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439031",
    "spareParts": [ ... ],
    "laborCost": 500,
    "totalCost": 3450,
    "status": "pending",
    "createdAt": "2026-06-20T12:30:00Z"
  }
}

ملاحظة: العميل سيراه في تطبيقه ويقرر الموافقة أو الرفض
```

#### PUT `/dashboard/profile` - تعديل بيانات المركز

```
الغرض: تحديث معلومات المركز (الأسعار، المجالات المدعومة، إلخ)
الدور المطلوب: Center

Header: Authorization: Bearer <centerToken>

Request:
{
  "inspectionFee": 150,
  "supportedBrands": ["Apple", "Samsung", "Huawei", "OnePlus"],
  "supportedDeviceTypes": ["phone", "tablet", "laptop"]
}

Response: البيانات المحدثة
```

#### GET `/dashboard/stats` - إحصائيات المركز

```
الغرض: الحصول على إحصائيات الأداء
الدور المطلوب: Center

Header: Authorization: Bearer <centerToken>

Response:
{
  "success": true,
  "data": {
    "totalOrders": 156,
    "completedOrders": 145,
    "pendingOrders": 8,
    "cancelledOrders": 3,
    "averageRating": 4.7,
    "totalRatings": 145,
    "averageRepairTime": "1.8 days",
    "revenueThisMonth": 45000,
    "topIssues": [
      { "issue": "screen", "count": 45 },
      { "issue": "battery", "count": 32 }
    ]
  }
}
```

---

### 5️⃣ **Delegate Endpoints** - `/api/delegate`

#### GET `/tasks` - مهام المندوب الحالية

```
الغرض: الحصول على المهام الموكلة للمندوب
الدور المطلوب: Delegate

Header: Authorization: Bearer <delegateToken>

Query Parameters:
  - status: pending, in_progress, completed
  - page: 1

Response:
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "orderNumber": "ORD-20260620-0001",
      "status": "assigned",
      "client": {
        "name": "اسم العميل",
        "phone": "01012345678",
        "address": "شارع النيل"
      },
      "repairCenter": {
        "name": "Cairo Fix",
        "address": "شارع رمسيس"
      },
      "device": {
        "type": "phone",
        "brand": "Apple",
        "model": "iPhone 14"
      },
      "pickupAddress": { ... },
      "currentStep": "awaiting_acceptance"  // awaiting_acceptance, en_route_to_client, etc
    }
  ]
}
```

#### PUT `/tasks/:orderId/accept` - قبول المهمة

```
الغرض: قبول المهمة (الموافقة على الذهاب للعميل)
الدور المطلوب: Delegate

Header: Authorization: Bearer <delegateToken>

Response:
{
  "success": true,
  "message": "تم قبول المهمة",
  "data": {
    "status": "assigned",
    "currentStep": "en_route_to_client"
  }
}
```

#### PUT `/tasks/:orderId/reject` - رفض المهمة

```
الغرض: رفض المهمة (إذا لم يستطع الذهاب)
الدور المطلوب: Delegate
شرط: يجب أن تكون في حالة "assigned"

Header: Authorization: Bearer <delegateToken>

Request:
{
  "reason": "مشغول حالياً"  // optional
}

Response: { "success": true }
```

#### POST `/tasks/:orderId/pickup-photos` - رفع صور الاستلام

```
الغرض: رفع صور توثيقية عند الاستلام من العميل/المركز
الدور المطلوب: Delegate
Storage: Cloudinary (/orders/{orderId}/pickup or /delivery)

Header: Authorization: Bearer <delegateToken>
Files: [صور التوثيق]

Request:
{
  "photoType": "atPickup"  // أو atCenterDrop, atCenterPickup
}

Response:
{
  "success": true,
  "data": {
    "photos": ["https://...", "https://..."],
    "uploadedAt": "2026-06-20T11:00:00Z"
  }
}
```

#### POST `/tasks/:orderId/verify-pickup-otp` - تأكيد OTP الاستلام

```
الغرض: إدخال OTP التي أرسلت للعميل للتأكيد
الدور المطلوب: Delegate

Header: Authorization: Bearer <delegateToken>

Request:
{
  "otp": "123456"  // الكود الذي أرسل للعميل عبر SMS
}

Response:
{
  "success": true,
  "message": "تم التحقق من OTP بنجاح",
  "data": {
    "verified": true
  }
}

ملاحظة: إذا أخطأ المندوب في إدخال الكود أكثر من 3 مرات → محظور لمدة 15 دقيقة
```

#### PUT `/tasks/:orderId/confirm-pickup` - تأكيد الاستلام من العميل

```
الغرض: تأكيد استلام الجهاز من العميل
الدور المطلوب: Delegate
شرط: يجب رفع الصور والتحقق من OTP أولاً

Header: Authorization: Bearer <delegateToken>

Response:
{
  "success": true,
  "message": "تم تأكيد الاستلام",
  "data": {
    "status": "picked_up",
    "orderNumber": "ORD-20260620-0001"
  }
}
```

#### PUT `/tasks/:orderId/confirm-drop-center` - تأكيد التسليم للمركز

```
الغرض: تأكيد تسليم الجهاز لمركز الإصلاح
الدور المطلوب: Delegate

Header: Authorization: Bearer <delegateToken>

Request:
{
  "note": "تم التسليم للمركز"
}

Response:
{
  "success": true,
  "status": "at_center"
}
```

#### PUT `/tasks/:orderId/confirm-pickup-center` - تأكيد الاستلام من المركز

```
الغرض: تأكيد استلام الجهاز من المركز (بعد الإصلاح)
الدور المطلوب: Delegate

Header: Authorization: Bearer <delegateToken>

Response:
{
  "success": true,
  "status": "returning"
}
```

#### POST `/tasks/:orderId/delivery-photos` - رفع صور التسليم

```
الغرض: رفع صور توثيقية عند التسليم للعميل
الدور المطلوب: Delegate
Storage: Cloudinary (/orders/{orderId}/delivery)

Header: Authorization: Bearer <delegateToken>
Files: [صور التسليم]

Response: نفس Response رفع الصور
```

#### POST `/tasks/:orderId/verify-delivery-otp` - تأكيد OTP التسليم

```
الغرض: إدخال OTP التي أرسلت للعميل عند التسليم
الدور المطلوب: Delegate

Header: Authorization: Bearer <delegateToken>

Request:
{
  "otp": "654321"
}

Response: { "success": true, "verified": true }
```

#### PUT `/tasks/:orderId/confirm-delivery` - تأكيد التسليم للعميل

```
الغرض: تأكيد تسليم الجهاز المصلح للعميل
الدور المطلوب: Delegate
شرط: يجب التحقق من OTP أولاً

Header: Authorization: Bearer <delegateToken>

Response:
{
  "success": true,
  "status": "delivered",
  "message": "تم تسليم الجهاز بنجاح"
}
```

#### GET `/tasks/history` - سجل المهام السابقة

```
الغرض: الحصول على المهام المكتملة (للأرشفة والإحصائيات)
الدور المطلوب: Delegate

Header: Authorization: Bearer <delegateToken>

Query Parameters:
  - page: 1
  - limit: 20
  - from: 2026-06-01
  - to: 2026-06-30

Response:
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "orderNumber": "ORD-20260620-0001",
      "client": { ... },
      "device": { ... },
      "status": "delivered",
      "completedAt": "2026-06-21T15:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### 6️⃣ **Admin Endpoints** - `/api/admin`

#### GET `/users` - قائمة العملاء

```
الغرض: الحصول على جميع العملاء (للإدارة)
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Query Parameters:
  - search: اسم أو هاتف
  - status: active, inactive
  - page: 1
  - limit: 20

Response:
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "اسم العميل",
      "phone": "01012345678",
      "email": "email@example.com",
      "isActive": true,
      "totalOrders": 5,
      "createdAt": "2026-06-20T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### GET `/users/:id` - تفاصيل عميل محدد

```
الغرض: الحصول على معلومات كاملة عن عميل
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Response: معلومات العميل + طلباته + نشاطه
```

#### PUT `/users/:id/status` - تفعيل/تعطيل حساب عميل

```
الغرض: تفعيل أو تعطيل حساب (في حالة المخالفات)
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Request:
{
  "isActive": false,
  "reason": "سوء السلوك"
}

Response: { "success": true, "isActive": false }
```

#### GET `/delegates` - قائمة المندوبين

```
الغرض: الحصول على جميع المندوبين
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Query Parameters: نفس parameters الـ users

Response:
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "اسم المندوب",
      "phone": "01112345678",
      "email": "delegate@example.com",
      "status": "active",
      "rating": 4.8,
      "totalDeliveries": 234,
      "createdAt": "2026-06-20T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### POST `/delegates` - إضافة مندوب جديد

```
الغرض: تسجيل مندوب جديد (بدلاً من التسجيل العادي)
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Request:
{
  "name": "اسم المندوب",
  "phone": "01112345678",
  "email": "delegate@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "name": "اسم المندوب",
    "role": "delegate"
  }
}
```

#### PUT `/delegates/:id/status` - تفعيل/تعطيل مندوب

```
الغرض: تفعيل أو تعطيل حساب المندوب
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Request:
{
  "isActive": false
}

Response: { "success": true }
```

#### GET `/centers` - قائمة المراكز

```
الغرض: الحصول على جميع مراكز الإصلاح
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Response:
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439020",
      "name": "Cairo Fix",
      "owner": { "name": "اسم المالك" },
      "status": "active",
      "rating": 4.7,
      "createdAt": "2026-06-20T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### POST `/centers` - إضافة مركز جديد

```
الغرض: تسجيل مركز إصلاح جديد
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Request:
{
  "name": "Cairo Fix",
  "ownerId": "507f1f77bcf86cd799439012",
  "phone": "01112345678",
  "email": "info@cairofix.com",
  "address": "شارع رمسيس",
  "city": "القاهرة",
  "supportedBrands": ["Apple", "Samsung"],
  "supportedDeviceTypes": ["phone", "tablet"]
}

Response:
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439020",
    "name": "Cairo Fix",
    "status": "pending"  // ينتظر الاعتماد من الإدارة
  }
}
```

#### PUT `/centers/:id/status` - اعتماد/تعليق المركز

```
الغرض: اعتماد مركز جديد أو تعليق مركز موجود
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Request:
{
  "status": "active",  // pending, active, suspended
  "note": "تم الفحص والاعتماد"
}

Response: { "success": true, "status": "active" }
```

#### GET `/orders` - جميع الطلبات (مع فلترة)

```
الغرض: الحصول على جميع الطلبات في النظام
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Query Parameters:
  - status: pending, picked_up, delivered, etc
  - clientId: (optional)
  - centerId: (optional)
  - delegateId: (optional)
  - from: 2026-06-01
  - to: 2026-06-30
  - page: 1
  - limit: 20

Response:
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "orderNumber": "ORD-20260620-0001",
      "status": "delivered",
      "client": { "name": "..." },
      "delegate": { "name": "..." },
      "repairCenter": { "name": "..." },
      "totalFees": 3450,
      "createdAt": "2026-06-20T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### GET `/orders/:id` - تفاصيل أي طلب

```
الغرض: الحصول على معلومات كاملة عن أي طلب
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Response: نفس بيانات GET /orders/:id
```

#### PUT `/orders/:id/assign-delegate` - تعيين مندوب يدوياً

```
الغرض: تعيين مندوب للطلب (إذا لم يقبل المندوب المعين)
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Request:
{
  "delegateId": "507f1f77bcf86cd799439012"
}

Response: { "success": true, "delegate": { ... } }
```

#### GET `/stats/overview` - إحصائيات عامة

```
الغرض: الحصول على ملخص الأداء الكلي
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Response:
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "totalDelegates": 45,
    "totalCenters": 15,
    "totalOrders": 3456,
    "completedOrders": 3120,
    "cancelledOrders": 125,
    "totalRevenue": 2500000,
    "averageOrderValue": 723,
    "thisMonthOrders": 456,
    "thisMonthRevenue": 350000
  }
}
```

#### GET `/stats/revenue` - تقرير الإيرادات

```
الغرض: الحصول على تقرير الإيرادات المفصل
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Query Parameters:
  - from: 2026-06-01
  - to: 2026-06-30
  - groupBy: day, week, month

Response:
{
  "success": true,
  "data": {
    "totalRevenue": 350000,
    "breakdown": [
      {
        "date": "2026-06-20",
        "orders": 15,
        "revenue": 12000
      }
    ],
    "topCenters": [
      {
        "center": "Cairo Fix",
        "orders": 120,
        "revenue": 85000
      }
    ]
  }
}
```

#### GET `/stats/centers` - أداء المراكز

```
الغرض: ترتيب المراكز حسب الأداء
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Response:
{
  "success": true,
  "data": [
    {
      "center": "Cairo Fix",
      "totalOrders": 250,
      "completedOrders": 245,
      "averageRating": 4.7,
      "revenue": 125000
    }
  ]
}
```

#### GET `/stats/delegates` - أداء المندوبين

```
الغرض: ترتيب المندوبين حسب الأداء
الدور المطلوب: Admin

Header: Authorization: Bearer <adminToken>

Response:
{
  "success": true,
  "data": [
    {
      "delegate": "اسم المندوب",
      "totalDeliveries": 456,
      "averageRating": 4.9,
      "onTimeDeliveryRate": 98.5
    }
  ]
}
```

---

## 📸 رفع الصور (Upload)

### كيفية رفع الصور؟

#### الخطوة 1: إعداد الملف

```javascript
// في Front-end (JavaScript/React)

// الحصول على الملف من الـ input
const fileInput = document.getElementById("imageInput");
const file = fileInput.files[0];

// أو في React
const handleFileChange = (e) => {
  const file = e.target.files[0];
  console.log(file);
};
```

#### الخطوة 2: إنشاء FormData

```javascript
// يجب إرسال البيانات كـ FormData (ليس JSON!)

const formData = new FormData();
formData.append("images", file); // اسم الـ field يجب أن يكون 'images'
// إذا كان في عدة صور:
formData.append("images", file1);
formData.append("images", file2);
formData.append("images", file3);

// إضافة بيانات أخرى:
formData.append("photoType", "atPickup");
```

#### الخطوة 3: إرسال الـ Request

```javascript
// استخدام fetch
fetch("http://localhost:5000/api/delegate/tasks/:orderId/pickup-photos", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    // لا تضيف 'Content-Type': 'application/json'
    // Browser سيضيفه تلقائياً كـ 'multipart/form-data'
  },
  body: formData,
})
  .then((res) => res.json())
  .then((data) => console.log(data))
  .catch((err) => console.error(err));

// أو باستخدام axios
import axios from "axios";

axios
  .post(
    "http://localhost:5000/api/delegate/tasks/:orderId/pickup-photos",
    formData,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "multipart/form-data",
      },
    },
  )
  .then((res) => console.log(res.data))
  .catch((err) => console.error(err));
```

#### الخطوة 4: استقبال الرد

```javascript
// الرد يحتوي على URLs الصور
{
  "success": true,
  "data": {
    "photos": [
      "https://res.cloudinary.com/.../image1.webp",
      "https://res.cloudinary.com/.../image2.webp",
      "https://res.cloudinary.com/.../image3.webp"
    ],
    "uploadedAt": "2026-06-20T11:00:00Z"
  }
}
```

### Endpoints التي تتقبل رفع صور:

| Endpoint                                   | الحقل  | المجلد في Cloudinary      | العدد الأقصى |
| ------------------------------------------ | ------ | ------------------------- | ------------ |
| POST `/orders/`                            | images | `/orders/{id}/device`     | 5            |
| PUT `/users/avatar`                        | avatar | `/users/avatars`          | 1            |
| POST `/delegate/tasks/:id/pickup-photos`   | images | `/orders/{id}/pickup`     | 5            |
| POST `/delegate/tasks/:id/delivery-photos` | images | `/orders/{id}/delivery`   | 5            |
| POST `/inspections/`                       | images | `/orders/{id}/inspection` | 5            |
| POST `/centers/dashboard/profile`          | logo   | `/centers/logos`          | 1            |

---

## 🧪 كيفية التيست

### 1️⃣ التيست المحلي (Unit Tests)

```bash
# تشغيل جميع الـ tests
npm test

# تشغيل test واحد فقط
npm test -- generateToken.test.js

# التيست مع المراقبة (يعيد التشغيل عند كل حفظ)
npm test -- --watch

# تقرير تغطية الـ Code (Code Coverage)
npm run test:coverage
```

**ملفات الـ Test الموجودة:**

```
tests/
├── unit/
│   ├── generateToken.test.js      (4 tests)
│   ├── generateOTP.test.js        (3 tests)
│   ├── apiResponse.test.js        (6 tests)
│   └── User.test.js               (9 tests)
│
└── integration/
    ├── auth.integration.test.js   (5 tests)
    └── order.integration.test.js  (5 tests)
```

### 2️⃣ التيست العملي (Manual Testing)

#### الطريقة الأولى: استخدام Postman

```
1. افتح ملف: postman_collection.json
2. Import في Postman
3. ستجد جميع الـ endpoints مع أمثلة الـ requests
4. غيّر بيانات الـ request حسب احتياجاتك
5. اضغط Send
```

#### الطريقة الثانية: استخدام cURL

```bash
# 1. التسجيل
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ahmed",
    "phone": "01012345678",
    "email": "ahmed@example.com",
    "password": "SecurePass123!"
  }'

# 2. تسجيل الدخول (ستحصل على tokens)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "01012345678",
    "password": "SecurePass123!"
  }'

# 3. استخدام الـ token (ضع الـ accessToken من الخطوة السابقة)
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### الطريقة الثالثة: استخدام JavaScript

```javascript
// في المتصفح أو Node.js

const BASE_URL = "http://localhost:5000/api";

// 1. التسجيل
async function register() {
  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Ahmed",
      phone: "01012345678",
      email: "ahmed@example.com",
      password: "SecurePass123!",
    }),
  });

  const data = await response.json();
  return data;
}

// 2. تسجيل الدخول
async function login() {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: "01012345678",
      password: "SecurePass123!",
    }),
  });

  const data = await response.json();
  localStorage.setItem("accessToken", data.data.accessToken);
  localStorage.setItem("refreshToken", data.data.refreshToken);
  return data;
}

// 3. استخدام الـ token
async function getProfile() {
  const token = localStorage.getItem("accessToken");
  const response = await fetch(`${BASE_URL}/users/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return response.json();
}

// 4. تشغيل
(async () => {
  console.log("1. Registering...");
  // await register();

  console.log("2. Logging in...");
  await login();

  console.log("3. Getting profile...");
  const profile = await getProfile();
  console.log(profile);
})();
```

### 3️⃣ كيفية تجربة العمليات الكاملة

#### سيناريو اختبار كامل:

```javascript
// اجعل هذا الملف: test-scenario.js

const BASE_URL = "http://localhost:5000/api";

const testScenario = {
  // البيانات
  newUser: {
    name: "Test User",
    phone: "01099999999",
    email: "test@example.com",
    password: "TestPass123!",
  },

  accessToken: "",
  refreshToken: "",
  userId: "",
  orderId: "",

  // 1. التسجيل
  async registerUser() {
    console.log("\n1️⃣ REGISTERING USER...");
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.newUser),
      });

      const data = await response.json();

      if (!data.success) {
        console.error("❌ Registration failed:", data.message);
        return false;
      }

      this.accessToken = data.data.accessToken;
      this.refreshToken = data.data.refreshToken;
      this.userId = data.data.user.id;

      console.log("✅ Registration successful!");
      console.log("   User ID:", this.userId);
      console.log(
        "   Access Token:",
        this.accessToken.substring(0, 20) + "...",
      );
      return true;
    } catch (err) {
      console.error("❌ Error:", err.message);
      return false;
    }
  },

  // 2. الحصول على الملف الشخصي
  async getProfile() {
    console.log("\n2️⃣ GETTING PROFILE...");
    try {
      const response = await fetch(`${BASE_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      const data = await response.json();

      if (!data.success) {
        console.error("❌ Failed to get profile:", data.message);
        return false;
      }

      console.log("✅ Profile retrieved!");
      console.log("   Name:", data.data.name);
      console.log("   Phone:", data.data.phone);
      console.log("   Role:", data.data.role);
      return true;
    } catch (err) {
      console.error("❌ Error:", err.message);
      return false;
    }
  },

  // 3. إنشاء طلب إصلاح
  async createOrder() {
    console.log("\n3️⃣ CREATING ORDER...");
    try {
      const formData = new FormData();

      // إضافة بيانات الطلب كـ JSON string
      const orderData = {
        device: {
          type: "phone",
          brand: "Apple",
          model: "iPhone 14",
          problemType: "screen",
          problemDescription: "شاشة مكسورة",
        },
        pickupAddress: {
          address: "شارع النيل، برج النيل",
          city: "القاهرة",
          coordinates: { lat: 30.0444, lng: 31.2357 },
        },
      };

      formData.append("deviceData", JSON.stringify(orderData));

      const response = await fetch(`${BASE_URL}/orders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.accessToken}` },
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        console.error("❌ Failed to create order:", data.message);
        return false;
      }

      this.orderId = data.data.id;

      console.log("✅ Order created!");
      console.log("   Order Number:", data.data.orderNumber);
      console.log("   Order ID:", this.orderId);
      console.log("   Status:", data.data.status);
      return true;
    } catch (err) {
      console.error("❌ Error:", err.message);
      return false;
    }
  },

  // 4. الحصول على الطلب
  async getOrder() {
    console.log("\n4️⃣ GETTING ORDER DETAILS...");
    try {
      const response = await fetch(`${BASE_URL}/orders/${this.orderId}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      const data = await response.json();

      if (!data.success) {
        console.error("❌ Failed to get order:", data.message);
        return false;
      }

      console.log("✅ Order details retrieved!");
      console.log("   Order Number:", data.data.orderNumber);
      console.log("   Status:", data.data.status);
      console.log("   Device:", data.data.device.brand, data.data.device.model);
      return true;
    } catch (err) {
      console.error("❌ Error:", err.message);
      return false;
    }
  },

  // 5. تجديد الـ Token
  async refreshToken() {
    console.log("\n5️⃣ REFRESHING TOKEN...");
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error("❌ Failed to refresh token:", data.message);
        return false;
      }

      this.accessToken = data.data.accessToken;

      console.log("✅ Token refreshed!");
      console.log("   New Token:", this.accessToken.substring(0, 20) + "...");
      return true;
    } catch (err) {
      console.error("❌ Error:", err.message);
      return false;
    }
  },

  // 6. تسجيل الخروج
  async logout() {
    console.log("\n6️⃣ LOGGING OUT...");
    try {
      const response = await fetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      const data = await response.json();

      if (!data.success) {
        console.error("❌ Failed to logout:", data.message);
        return false;
      }

      console.log("✅ Logged out successfully!");
      return true;
    } catch (err) {
      console.error("❌ Error:", err.message);
      return false;
    }
  },

  // تشغيل جميع الاختبارات
  async runAll() {
    console.log("========================================");
    console.log("🚀 STARTING COMPLETE TEST SCENARIO");
    console.log("========================================");

    const results = {
      register: await this.registerUser(),
      profile: await this.getProfile(),
      createOrder: await this.createOrder(),
      getOrder: await this.getOrder(),
      refresh: await this.refreshToken(),
      logout: await this.logout(),
    };

    console.log("\n========================================");
    console.log("📊 TEST RESULTS");
    console.log("========================================");
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? "✅" : "❌"} ${test}`);
    });

    const passed = Object.values(results).filter((r) => r).length;
    const total = Object.values(results).length;
    console.log(`\nTotal: ${passed}/${total} passed`);
  },
};

// تشغيل الاختبار
testScenario.runAll();
```

**لتشغيل الاختبار:**

```bash
node test-scenario.js
```

---

## 📚 أمثلة عملية

### مثال 1: تسجيل عميل جديد ثم إنشاء طلب إصلاح

```bash
# الخطوة 1: التسجيل
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "محمد علي",
    "phone": "201001234567",
    "email": "mohamed@example.com",
    "password": "MohamedPass123!"
  }'

# الرد:
# {
#   "success": true,
#   "data": {
#     "user": {
#       "id": "507f1f77bcf86cd799439011",
#       "name": "محمد علي",
#       "role": "client"
#     },
#     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
#   }
# }

# الخطوة 2: إنشاء طلب إصلاح (استخدم accessToken من الخطوة 1)
curl -X POST http://localhost:5000/api/orders/ \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "device": {
      "type": "phone",
      "brand": "Samsung",
      "model": "Galaxy S21",
      "problemType": "battery",
      "problemDescription": "البطارية لا تشحن"
    },
    "pickupAddress": {
      "address": "شارع القاهرة",
      "city": "القاهرة",
      "coordinates": {
        "lat": 30.0500,
        "lng": 31.2300
      }
    }
  }'

# الرد:
# {
#   "success": true,
#   "data": {
#     "id": "507f1f77bcf86cd799439020",
#     "orderNumber": "ORD-20260620-0001",
#     "status": "pending",
#     ...
#   }
# }
```

### مثال 2: التحقق من طلب ثم إضافة عنوان جديد

```javascript
// 1. الحصول على تفاصيل الطلب
async function checkOrderStatus(orderId, accessToken) {
  const response = await fetch(`http://localhost:5000/api/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json();
  console.log("Order Status:", data.data.status);
  console.log("Device:", data.data.device);
  return data.data;
}

// 2. إضافة عنوان جديد
async function addAddress(label, address, city, accessToken) {
  const response = await fetch("http://localhost:5000/api/users/addresses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      label,
      address,
      city,
      coordinates: { lat: 30.05, lng: 31.23 },
    }),
  });

  return response.json();
}

// الاستخدام
const order = await checkOrderStatus("507f1f77bcf86cd799439020", token);
const newAddress = await addAddress("الشغل", "برج الشركة", "القاهرة", token);
```

---

## 🎯 النقاط المهمة عند الاستخدام

### ✅ يجب عليك:

- ✅ حفظ `accessToken` و `refreshToken` عند التسجيل
- ✅ إرسال `accessToken` في كل request (في الـ Header)
- ✅ عند انتهاء الصلاحية، استخدم `refreshToken` للحصول على token جديد
- ✅ إرسال الصور كـ `FormData` وليس JSON
- ✅ التحقق من `success: true` في الرد قبل المتابعة
- ✅ استخدام الأدوار الصحيحة (client للعملاء، delegate للمندوبين، إلخ)

### ❌ تجنب:

- ❌ حفظ `refreshToken` بدون تشفير
- ❌ إرسال `password` في الـ requests (استخدم `phone` و `password` فقط في login)
- ❌ محاولة الوصول إلى طلب لا ينتمي للمستخدم (سيرجع 403 Forbidden)
- ❌ تغيير حالة الطلب بطريقة غير صحيحة (يجب اتباع التسلسل)
- ❌ نسيان الـ Authorization Header

---

## 🔍 الأخطاء الشائعة وحلولها

| الخطأ                     | السبب                            | الحل                                               |
| ------------------------- | -------------------------------- | -------------------------------------------------- |
| 401 Unauthorized          | Token غير صحيح أو منتهي الصلاحية | استخدم `refresh-token` للحصول على token جديد       |
| 403 Forbidden             | ليس لديك صلاحيات                 | تأكد من أن دورك صحيح                               |
| 404 Not Found             | الـ endpoint غير صحيح            | تحقق من URL                                        |
| 400 Bad Request           | البيانات المرسلة غير صحيحة       | اقرأ رسالة الخطأ في `errors`                       |
| 422 Validation Error      | بيانات البطلب فاشلة في التحقق    | تأكد من نوع البيانات والحقول الإلزامية             |
| Content-Type header error | صيغة البيانات خاطئة              | استخدم `application/json` أو `multipart/form-data` |

---

**الآن أنت جاهز لاستخدام جميع endpoints! 🚀**
