# Mobile Maintenance API - Backend Documentation

## 📋 نظرة عامة

منصة باك إند متكاملة لإدارة صيانة الأجهزة الإلكترونية (هواتف، تابلت، لابتوب...) مع:

- نظام تصنيف الطلبات والحالات
- تتبع المندوبين في الوقت الفعلي
- عروض أسعار من مراكز الصيانة
- نظام تقييم وتعليقات
- لوحة تحكم إدارية كاملة

---

## 🚀 البدء السريع

### التثبيت

```bash
# نسخ المشروع
git clone <repo-url>
cd nagek

# تثبيت المتطلبات
npm install

# تعيين متغيرات البيئة
cp .env.example .env

# تعبئة قاعدة البيانات بالبيانات الاختبارية
node scripts/seed.js

# تشغيل السيرفر
npm start   # للإنتاج
npm run dev # للتطوير
```

---

## 🔐 المصادقة (Authentication)

### JWT Token Flow

```
1. المستخدم → POST /api/auth/login
   ↓
2. السيرفر يعطيه Access Token (15 دقيقة) + Refresh Token (30 يوم)
   ↓
3. المستخدم يستخدم Access Token في كل طلب
   Authorization: Bearer <access_token>
   ↓
4. لو انتهى → POST /api/auth/refresh-token
   ↓
5. السيرفر يعطيه Access Token جديد
```

### الأدوار (Roles)

| الدور        | الصلاحيات                        |
| ------------ | -------------------------------- |
| **client**   | إنشاء طلبات، تتبع، تقييم، تسليم  |
| **delegate** | استقبال مهام، رفع صور، تأكيد OTP |
| **center**   | عرض الطلبات، فحص، عروض أسعار     |
| **admin**    | إدارة النظام بالكامل             |

---

## 📦 API Endpoints الرئيسية

### 🔐 Authentication (`/api/auth`)

| Method | Endpoint           | الوصف                  |
| ------ | ------------------ | ---------------------- |
| POST   | `/register`        | تسجيل عميل جديد        |
| POST   | `/login`           | تسجيل دخول             |
| POST   | `/refresh-token`   | تجديد الـ Access Token |
| POST   | `/logout`          | تسجيل خروج             |
| POST   | `/send-otp`        | إرسال OTP للتحقق       |
| POST   | `/verify-otp`      | التحقق من OTP          |
| POST   | `/forgot-password` | استرجاع كلمة المرور    |
| POST   | `/reset-password`  | تعيين كلمة مرور جديدة  |

### 👤 User Profile (`/api/users`)

| Method | Endpoint           | الوصف                 |
| ------ | ------------------ | --------------------- |
| GET    | `/profile`         | بيانات الحساب         |
| PUT    | `/profile`         | تعديل البيانات        |
| PUT    | `/avatar`          | رفع صورة الملف الشخصي |
| PUT    | `/change-password` | تغيير كلمة المرور     |
| GET    | `/addresses`       | قائمة العناوين        |
| POST   | `/addresses`       | إضافة عنوان           |
| PUT    | `/addresses/:id`   | تعديل عنوان           |
| DELETE | `/addresses/:id`   | حذف عنوان             |

### 📦 Orders (`/api/orders`)

| Method | Endpoint              | الوصف                        |
| ------ | --------------------- | ---------------------------- |
| POST   | `/`                   | إنشاء طلب جديد               |
| GET    | `/`                   | طلبات العميل (مع pagination) |
| GET    | `/:id`                | تفاصيل طلب                   |
| GET    | `/:id/tracking`       | تتبع الطلب                   |
| GET    | `/:id/status-history` | تاريخ التحديثات              |
| PUT    | `/:id/cancel`         | إلغاء الطلب                  |
| PUT    | `/:id/approve-offer`  | قبول عرض السعر               |
| PUT    | `/:id/reject-offer`   | رفض عرض السعر                |
| PUT    | `/:id/rate`           | تقييم الخدمة                 |

### 🏪 Repair Centers (`/api/centers`)

| Method | Endpoint                       | الوصف                  |
| ------ | ------------------------------ | ---------------------- |
| GET    | `/`                            | قائمة المراكز (public) |
| GET    | `/:id`                         | تفاصيل مركز            |
| GET    | `/dashboard/orders`            | طلبات المركز           |
| GET    | `/dashboard/orders/:id`        | تفاصيل طلب             |
| PUT    | `/dashboard/orders/:id/status` | تحديث حالة الطلب       |
| PUT    | `/dashboard/profile`           | تعديل بيانات المركز    |
| GET    | `/dashboard/stats`             | إحصائيات المركز        |

### 🛵 Delegates (`/api/delegate`)

| Method | Endpoint                       | الوصف                |
| ------ | ------------------------------ | -------------------- |
| GET    | `/tasks`                       | المهام النشطة        |
| PUT    | `/tasks/:id/accept`            | قبول المهمة          |
| PUT    | `/tasks/:id/reject`            | رفض المهمة           |
| POST   | `/tasks/:id/pickup-photos`     | صور الاستلام         |
| POST   | `/tasks/:id/verify-pickup-otp` | تحقق من OTP الاستلام |
| PUT    | `/tasks/:id/confirm-delivery`  | تأكيد التسليم        |
| POST   | `/tasks/:id/delivery-photos`   | صور التسليم          |
| GET    | `/tasks/history`               | سجل المهام السابقة   |

### 🔍 Inspection (`/api/inspection`)

| Method | Endpoint    | الوصف                  |
| ------ | ----------- | ---------------------- |
| POST   | `/`         | تسجيل نتيجة الفحص      |
| GET    | `/:orderId` | الحصول على نتيجة الفحص |
| PUT    | `/:id`      | تحديث الفحص            |
| DELETE | `/:id`      | حذف الفحص              |

### 💰 Price Offers (`/api/price-offer`)

| Method | Endpoint       | الوصف            |
| ------ | -------------- | ---------------- |
| POST   | `/`            | إرسال عرض سعر    |
| GET    | `/:orderId`    | الحصول على العرض |
| PUT    | `/:id/approve` | قبول العرض       |
| PUT    | `/:id/reject`  | رفض العرض        |
| DELETE | `/:id`         | حذف العرض        |

### 🛡️ Admin (`/api/admin`)

| Method | Endpoint                      | الوصف            |
| ------ | ----------------------------- | ---------------- |
| GET    | `/users`                      | قائمة المستخدمين |
| GET    | `/users/:id`                  | تفاصيل مستخدم    |
| PUT    | `/users/:id/status`           | تفعيل/تعطيل      |
| DELETE | `/users/:id`                  | حذف مستخدم       |
| GET    | `/delegates`                  | قائمة المندوبين  |
| POST   | `/delegates`                  | إضافة مندوب      |
| DELETE | `/delegates/:id`              | حذف مندوب        |
| GET    | `/centers`                    | قائمة المراكز    |
| POST   | `/centers`                    | إضافة مركز       |
| DELETE | `/centers/:id`                | حذف مركز         |
| GET    | `/orders`                     | جميع الطلبات     |
| PUT    | `/orders/:id/assign-delegate` | تعيين مندوب      |
| GET    | `/stats/overview`             | إحصائيات عامة    |
| GET    | `/stats/revenue`              | تقرير الإيرادات  |
| GET    | `/stats/centers`              | أداء المراكز     |
| GET    | `/stats/delegates`            | أداء المندوبين   |

---

## 🗄️ Database Models

### User

- name, phone, email, password
- role: client/delegate/center/admin
- avatar (Cloudinary)
- addresses: []
- refreshTokens: [] (للـ token rotation)

### Order

- orderNumber (ORD-YYYYMMDD-XXXX)
- client, repairCenter, delegate
- device: { type, brand, model, problemType, images }
- fees: { inspection, delivery, repair, total }
- status: 14 حالة مختلفة
- statusHistory: تاريخ التغييرات
- rating: { score, comment }

### RepairCenter

- name, owner, phone, email, address
- supportedBrands, supportedDeviceTypes
- inspectionFee
- rating, totalRatings

### Inspection

- order, findings[], images
- technician, notes

### PriceOffer

- order, repairCenter
- spareParts[], laborCost, totalCost
- estimatedDays, status

### OTP

- phone, code, type, expiresAt
- TTL Index: auto-delete after expiration

---

## 🔒 Security Features

✅ **Password Security**

- bcryptjs hashing (10 salt rounds)
- Password reset via email + OTP

✅ **JWT Authentication**

- Access Token: 15 دقيقة
- Refresh Token: 30 يوم (مع rotation detection)

✅ **Input Validation**

- Joi schema validation
- XSS protection (sanitization)
- NoSQL injection protection

✅ **Rate Limiting**

- Auth routes: 5 requests/15 min
- Sensitive operations: 20 requests/15 min

✅ **Security Headers**

- Helmet.js
- CORS enabled
- HTTPS recommended in production

---

## 📊 Pagination

جميع list endpoints تدعم الـ pagination:

```
GET /api/orders?page=1&limit=10

Response:
{
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

---

## 🌩️ File Upload

تُرفع الملفات مباشرة إلى **Cloudinary**:

```
مجلدات التنظيم:
├── orders/{orderId}/device/
├── orders/{orderId}/inspection/
├── orders/{orderId}/pickup/
├── orders/{orderId}/delivery/
├── users/avatars/
└── centers/logos/
```

**Transformations:**

- Format: WebP
- Max width: 1200px
- Quality: 80%

---

## 🧪 Testing

```bash
# تحميل بيانات اختبارية
node scripts/seed.js

# تشغيل الاختبارات (قريباً)
npm test
```

---

## 📝 Response Format

### Success Response

```json
{
  "success": true,
  "message": "رسالة النجاح",
  "data": {...},
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "رسالة الخطأ",
  "statusCode": 400,
  "errors": [
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

---

## 🚀 Deployment

### مع Railway

```bash
npm install -g railway
railway link
railway up
```

### مع Render

```bash
# ربط المستودع وتكوين متغيرات البيئة
# Render سيقوم بـ auto-deploy على كل push
```

### مع VPS (DigitalOcean/AWS)

```bash
# تثبيت Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# تنسيق المشروع
git clone <repo>
cd nagek
npm install

# استخدام PM2 للإدارة
npm install -g pm2
pm2 start server.js --name "api"
pm2 startup
pm2 save
```

---

## 📞 Support

للمزيد من المعلومات، راجع:

- `/backend-plan.md` - المتطلبات الكاملة
- `.env.example` - متغيرات البيئة المطلوبة

---

**Last Updated:** 2026-06-20
**Status:** ✅ Production Ready
