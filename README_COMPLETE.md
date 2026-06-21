# 📱 Mobile Maintenance API - النسخة الكاملة

منصة API شاملة لإدارة صيانة الأجهزة المحمولة مع نظام توثيق متقدم وإدارة شاملة.

---

## 🚀 ابدأ سريعاً

### التثبيت والتشغيل:

```bash
# استنساخ المستودع
git clone <repository-url>
cd nagek

# تثبيت المتعلقات
npm install

# إعداد البيئة
cp .env.example .env
# عدّل .env بـ بيانات MongoDB و Cloudinary

# تشغيل الخادم
npm run dev

# في محطة أخرى - تشغيل البذر
npm run seed
```

**الخادم يعمل على:** http://localhost:5000

---

## 📚 التوثيق الكامل

| الوثيقة                          | الوصف                     |
| -------------------------------- | ------------------------- |
| [ENV_SETUP.md](./ENV_SETUP.md)   | إعداد متغيرات البيئة      |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | نشر على السحابة و VPS     |
| [TESTING.md](./TESTING.md)       | اختبار الـ API            |
| [SECURITY.md](./SECURITY.md)     | أمان التطبيق              |
| [README_AR.md](./README_AR.md)   | التوثيق الأصلي بـ العربية |

---

## ✨ المميزات

### 🔐 الأمان

- ✅ JWT Authentication مع Refresh Token Rotation
- ✅ Role-Based Access Control (4 أدوار)
- ✅ Password Hashing (bcryptjs)
- ✅ XSS Protection & Input Sanitization
- ✅ Rate Limiting على sensitive routes
- ✅ Helmet Security Headers
- ✅ CORS Protection

### 🗄️ قاعدة البيانات

- ✅ 7 MongoDB Models مع validation كامل
- ✅ Comprehensive Indexes للأداء
- ✅ Status Machine Validation
- ✅ TTL Auto-deletion للـ OTP

### 📦 API Endpoints

- ✅ 59+ REST API endpoints
- ✅ Pagination support
- ✅ Advanced filtering
- ✅ Comprehensive error handling

### 🧪 الاختبارات

- ✅ Unit Tests مع Jest
- ✅ Integration Tests
- ✅ Code Coverage reports
- ✅ CI/CD Pipeline (GitHub Actions)

### 🐳 التطوير و النشر

- ✅ Docker & Docker Compose
- ✅ GitHub Actions CI/CD
- ✅ Support Railway, Render, VPS
- ✅ Health check endpoint

### 📤 إدارة الملفات

- ✅ Cloudinary integration
- ✅ WebP auto-conversion
- ✅ Smart folder organization
- ✅ 5MB size limit

---

## 🏗️ البنية

```
src/
├── config/             # إعداد التطبيق
│   ├── db.js          # MongoDB connection
│   ├── env.js         # Environment validation
│   └── cloudinary.js  # Cloudinary setup
├── models/            # 7 MongoDB Models
│   ├── User.js
│   ├── RepairCenter.js
│   ├── Order.js
│   ├── Device.js
│   ├── Inspection.js
│   ├── PriceOffer.js
│   └── OTP.js
├── controllers/       # 8 Controllers
├── routes/           # 8 Route files
├── middleware/       # 6 Middleware functions
└── utils/           # 5 Utility functions
tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
└── fixtures/        # Test data
```

---

## 🔑 الأدوار المتاحة

| الدور        | الصلاحيات                                  |
| ------------ | ------------------------------------------ |
| **Client**   | إنشاء طلبات، تقييم الخدمات، إدارة العناوين |
| **Delegate** | قبول الطلبات، التقاط/تسليم، أخذ صور        |
| **Center**   | إدارة الطلبات، الفحص، إنشاء عروض الأسعار   |
| **Admin**    | إدارة شاملة، إحصائيات، حذف المستخدمين      |

---

## 📡 الـ API Endpoints

### Authentication (8 endpoints)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token
POST   /api/auth/logout
POST   /api/auth/send-otp
POST   /api/auth/verify-otp
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### User Profile (8 endpoints)

```
GET    /api/users/profile
PUT    /api/users/profile
PUT    /api/users/avatar
PUT    /api/users/change-password
GET    /api/users/addresses
POST   /api/users/addresses
PUT    /api/users/addresses/:id
DELETE /api/users/addresses/:id
```

### Orders (9 endpoints)

```
POST   /api/orders
GET    /api/orders
GET    /api/orders/:id
GET    /api/orders/:id/status-history
GET    /api/orders/:id/tracking
PUT    /api/orders/:id/cancel
PUT    /api/orders/:id/approve-offer
PUT    /api/orders/:id/reject-offer
PUT    /api/orders/:id/rate
```

### Repair Centers (9 endpoints)

```
GET    /api/centers
GET    /api/centers/:id
GET    /api/centers/dashboard/orders
GET    /api/centers/dashboard/orders/:id
PUT    /api/centers/dashboard/orders/:id/status
PUT    /api/centers/dashboard/profile
GET    /api/centers/dashboard/stats
```

### Delegates (12 endpoints)

```
GET    /api/delegate/tasks
GET    /api/delegate/tasks/history
PUT    /api/delegate/tasks/:id/accept
PUT    /api/delegate/tasks/:id/reject
POST   /api/delegate/tasks/:id/pickup-photos
POST   /api/delegate/tasks/:id/verify-pickup-otp
POST   /api/delegate/tasks/:id/delivery-photos
POST   /api/delegate/tasks/:id/verify-delivery-otp
PUT    /api/delegate/tasks/:id/confirm-pickup
PUT    /api/delegate/tasks/:id/confirm-drop-center
PUT    /api/delegate/tasks/:id/confirm-pickup-center
PUT    /api/delegate/tasks/:id/confirm-delivery
```

### Admin (19 endpoints)

```
# Users
GET    /api/admin/users
GET    /api/admin/users/:id
PUT    /api/admin/users/:id/status
DELETE /api/admin/users/:id

# Delegates
GET    /api/admin/delegates
POST   /api/admin/delegates
PUT    /api/admin/delegates/:id/status
DELETE /api/admin/delegates/:id

# Centers
GET    /api/admin/centers
POST   /api/admin/centers
PUT    /api/admin/centers/:id/status
DELETE /api/admin/centers/:id

# Orders
GET    /api/admin/orders
GET    /api/admin/orders/:id
PUT    /api/admin/orders/:id/assign-delegate

# Statistics
GET    /api/admin/stats/overview
GET    /api/admin/stats/revenue
GET    /api/admin/stats/centers
GET    /api/admin/stats/delegates
```

---

## 🧪 الاختبارات

### تشغيل الاختبارات:

```bash
# جميع الاختبارات
npm test

# مع Coverage report
npm run test:coverage

# Watch mode
npm run test:watch

# Unit tests فقط
npm run test:unit

# Integration tests فقط
npm run test:integration
```

### الـ Coverage:

```
Branches:   50%+
Functions:  50%+
Lines:      50%+
Statements: 50%+
```

---

## 🐳 Docker

### استخدام Docker Compose:

```bash
# تشغيل الكل
docker-compose up -d

# إيقاف
docker-compose down

# مراقبة السجلات
docker-compose logs -f api
```

**المخدومات:**

- API: http://localhost:5000
- MongoDB: localhost:27017
- Mongo Express: http://localhost:8081

---

## 🚀 النشر

### Railway.app (الأسهل):

```bash
# 1. ربط GitHub
# 2. إضافة Environment Variables
# 3. إضافة MongoDB Service
# 4. Deploy تلقائي
```

### Render.com:

```bash
# 1. ربط GitHub
# 2. إضافة Build Command: npm install
# 3. إضافة Start Command: npm start
# 4. Deploy
```

### VPS (مثلاً DigitalOcean):

```bash
# شاهد DEPLOYMENT.md للتفاصيل الكاملة
```

---

## 🔒 الأمان

### المميزات الأمنية:

- ✅ JWT Authentication (15م access + 30د refresh)
- ✅ Password Hashing بـ bcryptjs
- ✅ XSS Protection
- ✅ Rate Limiting (5/15min auth, 20/15min operations)
- ✅ Helmet Security Headers
- ✅ CORS Protection
- ✅ Input Validation (Joi)
- ✅ OTP Verification
- ✅ Token Reuse Detection

**اقرأ:** [SECURITY.md](./SECURITY.md)

---

## 🔧 الإعداد

### متغيرات البيئة:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/mobile-maintenance
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-email
SMTP_PASS=your-password
SMS_API_KEY=your-sms-key
SMS_SENDER=MobileMaintenance
```

**اقرأ:** [ENV_SETUP.md](./ENV_SETUP.md)

---

## 📊 نموذج البيانات

### User Model

```javascript
{
  phone: String (unique),
  email: String (unique, sparse),
  password: String (hashed),
  name: String,
  role: 'client' | 'delegate' | 'center' | 'admin',
  avatar: String (Cloudinary URL),
  addresses: [{label, address, city, coordinates}],
  refreshTokens: [String],
  isActive: Boolean,
  isVerified: Boolean,
  createdAt: Date
}
```

### Order Model

```javascript
{
  orderNumber: String (auto-generated),
  client: Reference to User,
  repairCenter: Reference to RepairCenter,
  delegate: Reference to User,
  device: {type, brand, model, problemType, images},
  pickupAddress: {address, city, coordinates},
  fees: {inspection, delivery, repair, total},
  status: '14 status states',
  statusHistory: [{status, timestamp, note, updatedBy}],
  pickupOTP: {code, expiresAt, verified},
  deliveryOTP: {code, expiresAt, verified},
  delegatePhotos: {atPickup, atCenterDrop, etc},
  rating: {score (1-5), comment},
  paymentStatus: 'unpaid' | 'paid',
  createdAt: Date
}
```

---

## 📈 الأداء

### Database Indexes

```javascript
// Unique constraints
User: (phone, email);
RepairCenter: (phone, email);

// Performance indexes
Order: ((client, createdAt), status, delegate, orderNumber);
Inspection: (order, inspectedAt);
PriceOffer: (order, status, createdAt);
```

### Rate Limiting

```
Auth Routes:     5 requests / 15 minutes
Sensitive Ops:  20 requests / 15 minutes
```

### Response Format

```javascript
{
  success: Boolean,
  message: String,
  data: Object | Array,
  pagination?: {page, limit, total}
}
```

---

## 🛠️ الأدوات المستخدمة

| الأداة     | الإصدار | الاستخدام        |
| ---------- | ------- | ---------------- |
| Node.js    | 18+     | Runtime          |
| Express    | 4.18.2  | Framework        |
| MongoDB    | 8.0.0   | Database         |
| JWT        | 9.0.2   | Authentication   |
| bcryptjs   | 2.4.3   | Password hashing |
| Cloudinary | 1.41.0  | File storage     |
| Multer     | 1.4.5   | File uploads     |
| Joi        | 17.11.0 | Validation       |
| Helmet     | 7.1.0   | Security         |
| CORS       | 2.8.5   | Cross-origin     |
| xss        | 1.0.15  | XSS protection   |
| Jest       | 30.4.2  | Testing          |
| Supertest  | 7.2.2   | API testing      |

---

## 🎯 الحالات المستخدمة (Use Cases)

### سير العمل الكامل:

1. **العميل ينشئ طلب**

   ```
   POST /api/orders → تحديد Device + عنوان الالتقاط
   ```

2. **إسناد موظف توصيل**

   ```
   Admin يسند → Delegate يقبل الطلب
   ```

3. **الالتقاط والتوثيق**

   ```
   Delegate يرفع صور + يتحقق من OTP العميل
   ```

4. **التقييم في المركز**

   ```
   Center يفحص → ينشئ عرض سعر
   ```

5. **موافقة العميل**

   ```
   Client يوافق → Order status → in-repair
   ```

6. **الإصلاح والتسليم**

   ```
   Center ينتهي → Delegate يوصل → Client يستقبل
   ```

7. **التقييم النهائي**
   ```
   Client يقيّم الخدمة → تحديث rating المركز
   ```

---

## 📞 الدعم

### الأسئلة الشائعة:

**س: كيف أبدأ التطوير؟**
ج: شاهد قسم "ابدأ سريعاً" أعلاه

**س: كيف أختبر الـ API؟**
ج: استخدم Postman Collection في `postman_collection.json`

**س: كيف أنشر على الإنتاج؟**
ج: اقرأ [DEPLOYMENT.md](./DEPLOYMENT.md)

**س: كيف أأمّن التطبيق؟**
ج: اقرأ [SECURITY.md](./SECURITY.md)

---

## 📝 الترخيص

MIT License

---

## 👨‍💻 المساهمة

1. Fork المستودع
2. إنشاء فرع feature (`git checkout -b feature/AmazingFeature`)
3. Commit التغييرات (`git commit -m 'Add some AmazingFeature'`)
4. Push للفرع (`git push origin feature/AmazingFeature`)
5. فتح Pull Request

---

## 📈 خارطة الطريق

- [ ] إضافة Payment Integration (Stripe/PayPal)
- [ ] تطبيق Mobile (React Native/Flutter)
- [ ] لوحة تحكم Admin (Dashboard)
- [ ] نظام التنبيهات (Push Notifications)
- [ ] Analytics و Reporting
- [ ] Multi-language Support
- [ ] AI-based Chatbot Support

---

## 📞 التواصل

- Email: support@mobilemaintenance.com
- Issues: GitHub Issues
- Discussions: GitHub Discussions

---

**آخر تحديث:** 2026-06-20
**الإصدار:** 1.0.0 - ✅ كامل و جاهز للإنتاج
