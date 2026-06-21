# SECURITY GUIDE

دليل الأمان الشامل لـ Mobile Maintenance API

---

## 🔐 مستويات الأمان المطبقة

### 1️⃣ Authentication & Authorization

#### JWT (JSON Web Tokens)

```javascript
// Access Token: 15 دقيقة
// Refresh Token: 30 يوم
// Token Reuse Detection: ممكّن
```

**الـ Flow:**

```
1. المستخدم يسجّل الدخول → يحصل على Access + Refresh Token
2. يستخدم Access Token في الطلبات
3. عند انتهاء Access Token → استخدم Refresh Token للحصول على واحد جديد
4. الـ Refresh Token يُحفظ في DB → يمكن الكشف عن إعادة الاستخدام
```

#### Role-Based Access Control (RBAC)

```javascript
// 4 أدوار مختلفة:
- client: العميل الذي يطلب الصيانة
- delegate: موظف التوصيل
- center: مركز الصيانة
- admin: مسؤول النظام
```

**Middleware حماية:**

```javascript
// مثال
router.put("/profile", authorize("center", "admin"), updateProfile);
```

---

### 2️⃣ Password Security

#### Hashing

```javascript
// bcryptjs مع 10 salt rounds
bcrypt.hash(password, 10);
```

**لا يتم حفظ كلمات المرور بنص عادي:**

```javascript
// ❌ خطأ
user.password = "1234567";
await user.save();

// ✅ صحيح
// يتم التشفير تلقائياً في pre-save hook
const user = new User({ password: "1234567" });
await user.save();
```

#### Password Reset Flow

```
1. المستخدم ينسى كلمة المرور
2. يطلب OTP عبر /forgot-password
3. يستقبل OTP على رقم الهاتف
4. يتحقق من OTP + يدخل كلمة جديدة
5. كلمة جديدة مشفرة بـ bcryptjs
```

---

### 3️⃣ Input Validation & Sanitization

#### Joi Validation

```javascript
// معالجة قبل الـ Controller
const schema = Joi.object({
  phone: Joi.string()
    .pattern(/^966\d{9}$/)
    .required(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(8).required(),
});

const { error, value } = schema.validate(req.body, {
  abortEarly: false, // جمع جميع الأخطاء
});
```

#### XSS Protection

```javascript
// تنظيف جميع المدخلات من JavaScript الضار
// مثال: <script>alert('XSS')</script> → يتم حذفه
const xss = require("xss");
const clean = xss(userInput);
```

**الـ Middleware:**

```javascript
// يتم تطبيق على كل طلب
app.use(sanitize);
```

---

### 4️⃣ Rate Limiting

#### Auth Routes (صارم جداً)

```javascript
// 5 طلبات كل 15 دقيقة
// يمنع هجمات Brute Force
POST /api/auth/login → max 5/15min
POST /api/auth/register → max 5/15min
POST /api/auth/refresh-token → max 5/15min
```

#### Sensitive Operations

```javascript
// 20 طلب كل 15 دقيقة
PUT /api/orders/:id → max 20/15min
DELETE /api/admin/users/:id → max 20/15min
```

---

### 5️⃣ CORS & Headers Security

#### Helmet.js

```javascript
// تفعيل Security Headers
app.use(helmet());
```

**الـ Headers المضافة:**

```
X-Content-Type-Options: nosniff          // منع MIME sniffing
X-Frame-Options: DENY                    // منع Clickjacking
Strict-Transport-Security: max-age=...   // فرض HTTPS
Content-Security-Policy: ...             // منع Inline Scripts
X-XSS-Protection: 1; mode=block          // حماية XSS
```

#### CORS

```javascript
app.use(cors()); // السماح بـ Cross-Origin Requests
```

---

### 6️⃣ Data Protection

#### Sensitive Data in Responses

```javascript
// ❌ لا تُرجع كلمات المرور
res.json({
  user: { name, email, phone }, // بدون password
});

// ✅ أستخدم select('-password')
User.findById(id).select("-password");
```

#### Database Indexes

```javascript
// Unique indexes على الحقول الحساسة
phone: { type: String, unique: true }
email: { type: String, unique: true, sparse: true }
```

---

### 7️⃣ OTP Security

#### OTP Generation & Verification

```javascript
// 6 أرقام عشوائية
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// صلاحية محدودة (10 دقائق)
expiresAt: new Date(Date.now() + 10 * 60 * 1000);

// منع إعادة الاستخدام
isUsed: true; // بعد أول استخدام
```

#### OTP Types

```javascript
verify_phone; // تحقق من رقم الهاتف
reset_password; // إعادة تعيين كلمة المرور
pickup_confirm; // تأكيد الالتقاط
delivery_confirm; // تأكيد التسليم
```

---

### 8️⃣ API Endpoint Security

#### Authentication Requirements

```javascript
// Public (بدون توثيق)
GET /api/centers             // قائمة المراكز
GET /api/centers/:id         // تفاصيل المركز

// Protected (يتطلب توثيق)
GET /api/users/profile       // يتطلب Authorization header
POST /api/orders             // يتطلب Authorization header

// Admin Only
DELETE /api/admin/users/:id  // يتطلب admin role
PUT /api/admin/users/:id/status
```

#### Authorization Header

```javascript
// الصيغة الصحيحة:
Authorization: Bearer <access_token>

// مثال:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 9️⃣ File Upload Security

#### Cloudinary Storage

```javascript
// التخزين: cloud بدلاً من local
// المميزات:
- ✅ تحويل تلقائي إلى WebP
- ✅ ضغط (max 1200px, quality 80%)
- ✅ فحص MIME type
- ✅ حد أقصى 5MB
```

#### Allowed File Types

```javascript
// الأنواع المسموحة:
image/jpeg
image/png
image/webp
image/gif

// الأنواع الممنوعة:
executable files
scripts
archives
```

---

### 🔟 Database Security

#### Connection String

```javascript
// لا تُضع credentials في الكود
// استخدم Environment Variables

// ❌ خطأ:
const uri = "mongodb://admin:pass123@host/db";

// ✅ صحيح:
const uri = process.env.MONGO_URI;
```

#### Data Validation in Models

```javascript
// Schema validation
const UserSchema = new Schema({
  phone: {
    type: String,
    required: [true, "Phone is required"],
    match: [/^966\d{9}$/, "Invalid phone format"],
    unique: true,
  },
  email: {
    type: String,
    match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "Invalid email"],
    sparse: true,
  },
});
```

---

## 🚨 نقاط الضعف الشائعة و الحماية

### SQL Injection

```javascript
// ❌ عرضة:
User.find({ email: userInput });

// ✅ محمي:
// Mongoose يتعامل مع الـ escaping تلقائياً
// + Joi validation قبل الوصول للـ DB
```

### XSS Attacks

```javascript
// ❌ عرضة:
res.send(`<h1>${userInput}</h1>`);

// ✅ محمي:
// sanitize.middleware ينظف جميع المدخلات
const cleanInput = xss(userInput);
```

### CSRF Attacks

```javascript
// ✅ محمي بـ:
- CORS configuration
- Origin validation
- SameSite cookies (في الـ auth)
```

### Brute Force

```javascript
// ✅ محمي بـ:
- Rate limiting على auth routes
- Account lockout (اختياري)
- Delayed responses
```

### Token Hijacking

```javascript
// ✅ محمي بـ:
- HTTPS only
- Short-lived access tokens (15 دقيقة)
- Refresh token rotation
- Secure storage
```

---

## 🔧 أفضل الممارسات

### ✅ يجب فعله:

1. **استخدم HTTPS في الإنتاج**

   ```
   غير HTTP → HTTPS دائماً
   ```

2. **أضف SSL Certificate**

   ```bash
   # Let's Encrypt
   certbot certonly --standalone -d yourdomain.com
   ```

3. **استخدم Environment Variables**

   ```javascript
   const secret = process.env.JWT_SECRET;
   ```

4. **فعّل Logging للأنشطة المريبة**

   ```javascript
   logger.warn(`Failed login attempt from ${ip}`);
   ```

5. **عمّل نسخ احتياطية منتظمة**

   ```bash
   # يومياً
   mongodump --uri="mongodb://..." --out=/backups/daily
   ```

6. **راقب الأداء والهجمات**

   ```javascript
   // استخدم monitoring tools
   - New Relic
   - Datadog
   - Prometheus
   ```

7. **أضف 2FA (Two-Factor Authentication)**
   ```javascript
   // SMS OTP عند تسجيل دخول غريب
   ```

---

### ❌ لا تفعل:

1. **لا تضع Secrets في الكود**

   ```javascript
   // ❌ خطأ:
   const SECRET = "my-secret-key";

   // ✅ صحيح:
   const SECRET = process.env.JWT_SECRET;
   ```

2. **لا تستخدم Default Passwords**

   ```javascript
   // ❌ خطأ:
   mongodb://admin:admin@localhost

   // ✅ صحيح:
   // استخدم كلمات قوية + random
   ```

3. **لا تشغّل بـ Root على VPS**

   ```bash
   # ❌ خطأ:
   sudo node server.js

   # ✅ صحيح:
   # استخدم non-root user
   ```

4. **لا تعطّل Security Headers**

   ```javascript
   // ❌ خطأ:
   app.disable("x-powered-by");

   // ✅ يتم بـ Helmet تلقائياً
   ```

5. **لا تعطّل Rate Limiting**
   ```javascript
   // حتى في التطوير، استخدم rate limiting
   ```

---

## 📋 Security Checklist

### قبل النشر على الإنتاج:

- [ ] تفعيل HTTPS و SSL Certificate
- [ ] تحديث جميع المتعلقات (npm audit fix)
- [ ] إضافة Environment Variables الفعلية
- [ ] إعادة كلمات السر القوية
- [ ] فعّل Database authentication
- [ ] أضف Firewall rules
- [ ] فعّل Logging و Monitoring
- [ ] عمّل نسخة احتياطية من البيانات
- [ ] اختبر Security headers
- [ ] فحص حساسية البيانات في الاستجابات
- [ ] اختبر Rate Limiting
- [ ] تحقق من CORS configuration
- [ ] اختبر XSS و Injection attacks
- [ ] أضف WAF (Web Application Firewall) - اختياري
- [ ] تفعيل DDoS protection - اختياري

---

## 🛡️ أدوات الأمان الموصى بها

| الأداة        | الاستخدام          | الـ Link        |
| ------------- | ------------------ | --------------- |
| OWASP ZAP     | اختبار penetration | owasp.org/zap   |
| Snyk          | فحص الثغرات        | snyk.io         |
| npm audit     | تحديث المتعلقات    | npm docs        |
| Let's Encrypt | SSL مجاني          | letsencrypt.org |
| Cloudflare    | CDN و DDoS         | cloudflare.com  |
| Auth0         | خدمة توثيق         | auth0.com       |

---

## 🆘 الإبلاغ عن الثغرات الأمنية

إذا اكتشفت ثغرة أمنية:

1. **لا تنشرها على الملأ**
2. **أرسل بريد آمن**
3. **اشرح الثغرة بوضوح**
4. **أرفق Proof of Concept (اختياري)**

---

**آخر تحديث:** 2026-06-20
