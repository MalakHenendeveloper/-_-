# بلان الباك إند الكامل — منصة صيانة الموبايلات
### Node.js + Express + MongoDB + Cloudinary

---

## أولاً: هيكل المشروع (Project Structure)

```
mobile-maintenance-api/
│
├── src/
│   ├── config/
│   │   ├── db.js               # الاتصال بـ MongoDB
│   │   ├── cloudinary.js       # إعدادات Cloudinary
│   │   └── env.js              # قراءة المتغيرات البيئية
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── RepairCenter.js
│   │   ├── Order.js
│   │   ├── Device.js
│   │   ├── Inspection.js
│   │   ├── PriceOffer.js
│   │   └── OTP.js
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── order.controller.js
│   │   ├── repairCenter.controller.js
│   │   ├── delegate.controller.js
│   │   ├── inspection.controller.js
│   │   ├── priceOffer.controller.js
│   │   └── admin.controller.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── order.routes.js
│   │   ├── repairCenter.routes.js
│   │   ├── delegate.routes.js
│   │   ├── inspection.routes.js
│   │   ├── priceOffer.routes.js
│   │   └── admin.routes.js
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js       # التحقق من JWT
│   │   ├── role.middleware.js       # التحقق من الدور (client/delegate/center/admin)
│   │   ├── upload.middleware.js     # Multer + Cloudinary
│   │   ├── validate.middleware.js   # Joi validation
│   │   └── errorHandler.js         # Global error handler
│   │
│   ├── utils/
│   │   ├── generateToken.js        # JWT generator
│   │   ├── generateOTP.js
│   │   ├── sendEmail.js            # Nodemailer
│   │   ├── sendSMS.js              # SMS provider
│   │   └── apiResponse.js          # Standard response format
│   │
│   └── app.js                      # Express setup
│
├── .env
├── .gitignore
├── package.json
└── server.js
```

---

## ثانياً: المتغيرات البيئية (.env)

```env
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://...

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRE=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# SMS (مثلاً Vonage أو Twilio)
SMS_API_KEY=
SMS_SENDER=
```

---

## ثالثاً: MongoDB Schemas

### 1. User Schema
```js
// models/User.js
{
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },           // bcrypt hashed
  role: {
    type: String,
    enum: ['client', 'delegate', 'admin'],
    default: 'client'
  },
  avatar: { type: String },                             // Cloudinary URL
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  addresses: [
    {
      label: String,       // "البيت" أو "الشغل"
      address: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    }
  ],
  refreshTokens: [{ type: String }],                   // للـ Refresh Token Rotation
  createdAt: { type: Date, default: Date.now }
}
```

### 2. RepairCenter Schema
```js
// models/RepairCenter.js
{
  name: { type: String, required: true },
  owner: { type: ObjectId, ref: 'User' },
  phone: { type: String, required: true },
  email: { type: String },
  address: { type: String, required: true },
  city: { type: String },
  coordinates: { lat: Number, lng: Number },
  logo: { type: String },                               // Cloudinary URL
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended'],
    default: 'pending'
  },
  supportedBrands: [String],                            // ["Apple", "Samsung", ...]
  supportedDeviceTypes: [String],                       // ["phone", "tablet", "laptop"]
  inspectionFee: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}
```

### 3. Order Schema ⭐ (الأهم)
```js
// models/Order.js
{
  orderNumber: { type: String, unique: true },          // مثلاً: ORD-20240101-0001
  client: { type: ObjectId, ref: 'User', required: true },
  repairCenter: { type: ObjectId, ref: 'RepairCenter' },
  delegate: { type: ObjectId, ref: 'User' },

  // بيانات الجهاز
  device: {
    type: { type: String, required: true },             // phone / tablet / laptop
    brand: { type: String, required: true },            // Apple / Samsung / ...
    model: { type: String, required: true },            // iPhone 14 / ...
    problemType: { type: String, required: true },      // screen / battery / ...
    problemDescription: { type: String },
    images: [String]                                    // Cloudinary URLs
  },

  // عنوان الاستلام
  pickupAddress: {
    address: String,
    city: String,
    coordinates: { lat: Number, lng: Number }
  },

  // رسوم
  fees: {
    inspection: { type: Number, default: 0 },
    delivery: { type: Number, default: 0 },
    repair: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },

  // حالة الطلب
  status: {
    type: String,
    enum: [
      'pending',           // تم إنشاء الطلب
      'assigning_delegate', // جاري تعيين مندوب
      'delegate_assigned',  // تم تعيين مندوب
      'picked_up',          // تم استلام الجهاز
      'at_center',          // الجهاز في المركز
      'inspecting',         // جاري الفحص
      'awaiting_approval',  // انتظار موافقة العميل
      'approved',           // العميل وافق
      'rejected',           // العميل رفض
      'repairing',          // جاري الإصلاح
      'repaired',           // تم الإصلاح
      'returning',          // جاري الإعادة
      'delivered',          // تم التسليم
      'cancelled'           // ملغي
    ],
    default: 'pending'
  },

  // تاريخ كل حالة
  statusHistory: [
    {
      status: String,
      timestamp: { type: Date, default: Date.now },
      note: String,
      updatedBy: { type: ObjectId, ref: 'User' }
    }
  ],

  // OTP للاستلام والتسليم
  pickupOTP: { code: String, expiresAt: Date, verified: Boolean },
  deliveryOTP: { code: String, expiresAt: Date, verified: Boolean },

  // صور التوثيق
  delegatePhotos: {
    atPickup: [String],       // صور عند الاستلام من العميل
    atCenterDrop: [String],   // صور عند التسليم للمركز
    atCenterPickup: [String], // صور عند استلام من المركز بعد الإصلاح
    atDelivery: [String]      // صور عند التسليم للعميل
  },

  // موافقة العميل
  clientApproval: {
    status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    timestamp: Date,
    note: String
  },

  // تقييم
  rating: {
    score: { type: Number, min: 1, max: 5 },
    comment: String,
    createdAt: Date
  },

  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid'
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

### 4. Inspection Schema
```js
// models/Inspection.js
{
  order: { type: ObjectId, ref: 'Order', required: true },
  repairCenter: { type: ObjectId, ref: 'RepairCenter' },
  technician: String,
  findings: [
    {
      issue: String,                    // "شاشة مكسورة"
      severity: { type: String, enum: ['minor', 'major', 'critical'] }
    }
  ],
  notes: String,
  images: [String],                     // صور الفحص
  inspectedAt: { type: Date, default: Date.now }
}
```

### 5. PriceOffer Schema
```js
// models/PriceOffer.js
{
  order: { type: ObjectId, ref: 'Order', required: true },
  repairCenter: { type: ObjectId, ref: 'RepairCenter' },
  spareParts: [
    {
      name: String,
      cost: Number
    }
  ],
  laborCost: { type: Number, required: true },
  inspectionFee: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  totalCost: { type: Number, required: true },
  estimatedDays: { type: Number },
  notes: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  respondedAt: Date,
  createdAt: { type: Date, default: Date.now }
}
```

### 6. OTP Schema
```js
// models/OTP.js
{
  phone: { type: String, required: true },
  code: { type: String, required: true },
  type: {
    type: String,
    enum: ['verify_phone', 'reset_password', 'pickup_confirm', 'delivery_confirm']
  },
  expiresAt: { type: Date, required: true },
  isUsed: { type: Boolean, default: false }
}
// Index: { expiresAt: 1 }, expireAfterSeconds: 0
```

---

## رابعاً: الـ Middleware

### auth.middleware.js
```js
// يتحقق من الـ Access Token في الـ Header
// Authorization: Bearer <token>
// لو انتهت صلاحيته → 401 → الـ client يطلب Refresh Token
```

### role.middleware.js
```js
// authorize('admin', 'client')
// بيتحقق إن الـ user.role موجود في القائمة المسموحة
```

### upload.middleware.js
```js
// Multer (memory storage) + Cloudinary
// بيتعمل middleware لكل route محتاج رفع صور
// مثال: uploadOrderImages = upload.array('images', 5)
```

### errorHandler.js
```js
// Global Error Handler آخر middleware في app.js
// بيمسك كل الأخطاء ويبعتها بفورمات موحدة
{
  success: false,
  message: "رسالة الخطأ",
  statusCode: 400,
  errors: []    // في حالة validation errors
}
```

---

## خامساً: الـ Routes والـ APIs الكاملة

### 🔐 Auth Routes — `/api/auth`
| Method | Endpoint | الوصف | الـ Role |
|--------|----------|-------|---------|
| POST | `/register` | تسجيل عميل جديد | Public |
| POST | `/login` | تسجيل دخول | Public |
| POST | `/refresh-token` | تجديد الـ Access Token | Public |
| POST | `/logout` | تسجيل خروج (حذف refresh token) | Auth |
| POST | `/send-otp` | إرسال OTP للتحقق | Public |
| POST | `/verify-otp` | التحقق من OTP | Public |
| POST | `/forgot-password` | طلب استرجاع كلمة المرور | Public |
| POST | `/reset-password` | تغيير كلمة المرور | Public |

---

### 👤 User Routes — `/api/users`
| Method | Endpoint | الوصف | الـ Role |
|--------|----------|-------|---------|
| GET | `/profile` | بيانات الحساب | client |
| PUT | `/profile` | تعديل البيانات | client |
| PUT | `/avatar` | تغيير الصورة (Cloudinary) | client |
| PUT | `/change-password` | تغيير كلمة المرور | client |
| GET | `/addresses` | قائمة العناوين | client |
| POST | `/addresses` | إضافة عنوان | client |
| PUT | `/addresses/:id` | تعديل عنوان | client |
| DELETE | `/addresses/:id` | حذف عنوان | client |

---

### 📦 Order Routes — `/api/orders`
| Method | Endpoint | الوصف | الـ Role |
|--------|----------|-------|---------|
| POST | `/` | إنشاء طلب جديد (+ رفع صور) | client |
| GET | `/` | طلبات العميل | client |
| GET | `/:id` | تفاصيل طلب | client/delegate/center/admin |
| PUT | `/:id/cancel` | إلغاء الطلب | client |
| PUT | `/:id/approve-offer` | موافقة على عرض السعر | client |
| PUT | `/:id/reject-offer` | رفض عرض السعر | client |
| GET | `/:id/status-history` | تاريخ حالات الطلب | client/admin |
| GET | `/:id/tracking` | تتبع الطلب | client |

---

### 🏪 Repair Center Routes — `/api/centers`
| Method | Endpoint | الوصف | الـ Role |
|--------|----------|-------|---------|
| GET | `/` | قائمة المراكز المتاحة | client |
| GET | `/:id` | تفاصيل مركز | client |
| GET | `/dashboard/orders` | طلبات المركز | center |
| GET | `/dashboard/orders/:id` | تفاصيل طلب | center |
| PUT | `/dashboard/orders/:id/status` | تحديث حالة الطلب | center |
| POST | `/dashboard/orders/:id/inspection` | تسجيل نتيجة الفحص | center |
| POST | `/dashboard/orders/:id/price-offer` | إرسال عرض سعر | center |
| PUT | `/dashboard/profile` | تعديل بيانات المركز | center |
| GET | `/dashboard/stats` | إحصائيات المركز | center |

---

### 🛵 Delegate Routes — `/api/delegate`
| Method | Endpoint | الوصف | الـ Role |
|--------|----------|-------|---------|
| GET | `/tasks` | مهامه الحالية والقادمة | delegate |
| PUT | `/tasks/:orderId/accept` | قبول المهمة | delegate |
| PUT | `/tasks/:orderId/reject` | رفض المهمة | delegate |
| POST | `/tasks/:orderId/pickup-photos` | رفع صور الاستلام | delegate |
| POST | `/tasks/:orderId/verify-pickup-otp` | تأكيد OTP الاستلام | delegate |
| PUT | `/tasks/:orderId/confirm-pickup` | تأكيد استلام الجهاز من العميل | delegate |
| PUT | `/tasks/:orderId/confirm-drop-center` | تأكيد تسليم المركز | delegate |
| PUT | `/tasks/:orderId/confirm-pickup-center` | تأكيد استلام من المركز | delegate |
| POST | `/tasks/:orderId/delivery-photos` | رفع صور التسليم | delegate |
| POST | `/tasks/:orderId/verify-delivery-otp` | تأكيد OTP التسليم | delegate |
| PUT | `/tasks/:orderId/confirm-delivery` | تأكيد تسليم الجهاز للعميل | delegate |
| GET | `/tasks/history` | سجل المهام السابقة | delegate |

---

### 🛡️ Admin Routes — `/api/admin`
| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/users` | قائمة العملاء |
| GET | `/users/:id` | تفاصيل عميل |
| PUT | `/users/:id/status` | تفعيل / تعطيل حساب |
| GET | `/delegates` | قائمة المندوبين |
| POST | `/delegates` | إضافة مندوب |
| PUT | `/delegates/:id/status` | تفعيل / تعطيل مندوب |
| GET | `/centers` | قائمة المراكز |
| POST | `/centers` | إضافة مركز |
| PUT | `/centers/:id/status` | اعتماد / تعليق مركز |
| GET | `/orders` | جميع الطلبات (فلترة + بحث) |
| GET | `/orders/:id` | تفاصيل أي طلب |
| PUT | `/orders/:id/assign-delegate` | تعيين مندوب يدوياً |
| GET | `/stats/overview` | إحصائيات عامة |
| GET | `/stats/revenue` | تقرير الإيرادات |
| GET | `/stats/centers` | أداء المراكز |
| GET | `/stats/delegates` | أداء المندوبين |

---

## سادساً: Authentication Flow (JWT + Refresh Token)

```
1. Login → يتبعت Access Token (15 دقيقة) + Refresh Token (30 يوم)
2. كل Request → Access Token في Header
3. لو الـ Access Token انتهى → الـ Client يبعت POST /auth/refresh-token
4. الـ Server يتحقق من الـ Refresh Token → يبعت Access Token جديد
5. Logout → الـ Refresh Token بيتحذف من الـ DB
```

**الـ Refresh Token بيتخزن في:**
- الـ DB (في مصفوفة `refreshTokens` في User)
- الـ Client (في HttpOnly Cookie أو Secure Storage)

---

## سابعاً: سيناريو OTP للاستلام والتسليم

```
1. المندوب عند الاستلام → يضغط "تأكيد الاستلام"
2. الـ Server يولد OTP مكون من 6 أرقام
3. بيتبعت للعميل عن طريق SMS
4. العميل بيقوله الكود
5. المندوب بيدخله في التطبيق → POST /delegate/tasks/:id/verify-pickup-otp
6. الـ Server يتحقق → يحدث حالة الطلب → "تم الاستلام"
7. نفس الخطوات عند التسليم
```

---

## ثامناً: إدارة رفع الصور (Cloudinary)

```
المجلدات في Cloudinary:
├── orders/
│   ├── {orderId}/
│   │   ├── device/          ← صور الجهاز عند إنشاء الطلب
│   │   ├── inspection/      ← صور الفحص
│   │   ├── pickup/          ← صور الاستلام
│   │   └── delivery/        ← صور التسليم
├── users/avatars/
├── centers/logos/
```

**Transformations:**
- كل صورة بتتحول لـ WebP تلقائياً
- Resize: max 1200px width
- Quality: 80%

---

## تاسعاً: Standard API Response Format

```js
// Success
{
  "success": true,
  "message": "تم إنشاء الطلب بنجاح",
  "data": { ... },
  "pagination": {          // في حالة القوائم
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}

// Error
{
  "success": false,
  "message": "حدث خطأ ما",
  "statusCode": 400,
  "errors": []
}
```

---

## عاشراً: الـ Packages المطلوبة

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cloudinary": "^1.41.0",
    "multer": "^1.4.5",
    "multer-storage-cloudinary": "^4.0.0",
    "nodemailer": "^6.9.7",
    "joi": "^17.11.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "morgan": "^1.10.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

## حادي عشر: ترتيب التنفيذ المقترح (MVP)

```
الأسبوع 1:
✅ إعداد المشروع + DB Connection
✅ User Schema + Auth (Register/Login/JWT)
✅ OTP System

الأسبوع 2:
✅ RepairCenter Schema + Admin APIs
✅ Order Schema + Client APIs
✅ File Upload (Cloudinary)

الأسبوع 3:
✅ Delegate APIs + OTP Flow
✅ Inspection + PriceOffer
✅ Order Status Machine

الأسبوع 4:
✅ Admin Dashboard APIs
✅ Stats & Reports

الأسبوع 5:
✅ Testing + Bug Fixes
✅ Documentation (Postman Collection)
✅ Deployment (Railway / Render / VPS)
```

---

## ملاحظات مهمة للتنفيذ

1. **Order Number Generation:** استخدم `ORD-{YYYYMMDD}-{autoIncrement}` أو UUID
2. **Status Machine:** أعمل validation إن كل تغيير في الـ status بيتبع التسلسل الصح
3. **Index المهمة:**
   - `User`: phone, email
   - `Order`: client, delegate, repairCenter, status, createdAt
4. **Rate Limiting:** طبق على الـ Auth routes خصوصاً (max 5 requests/15 min)
5. **Security:** Helmet + CORS + Input Sanitization على كل الـ routes
```
