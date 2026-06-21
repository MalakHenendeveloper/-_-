# TESTING GUIDE

دليل شامل لـ اختبار Mobile Maintenance API

## نظرة عامة

المشروع يحتوي على:

- ✅ **Unit Tests** - اختبارات الوحدات الفردية
- ✅ **Integration Tests** - اختبارات التكامل بين الأنظمة
- ✅ **Code Coverage** - تغطية الكود
- ✅ **CI/CD Pipeline** - الاختبار التلقائي

---

## 📦 تثبيت أدوات الاختبار

```bash
npm install
```

### الحزم المثبتة:

- **Jest** - Framework للاختبارات
- **Supertest** - Testing HTTP APIs
- **@testing-library/jest-dom** - DOM testing utilities

---

## 🧪 Unit Tests

### الاختبارات المتوفرة:

#### 1. Token Generation Tests

```bash
npm run test:unit -- generateToken.test.js
```

**ما يتم اختباره:**

- ✅ إنشاء Access Token مع 15 دقيقة انتهاء صلاحية
- ✅ إنشاء Refresh Token مع 30 يوم انتهاء صلاحية
- ✅ تحقق من التوقيع والـ claims
- ✅ رفض Tokens منتهية الصلاحية

#### 2. OTP Generation Tests

```bash
npm run test:unit -- generateOTP.test.js
```

**ما يتم اختباره:**

- ✅ إنشاء OTP بـ 6 أرقام
- ✅ تنوع الـ OTPs المُنشأة
- ✅ التحقق من صيغة الأرقام

#### 3. API Response Tests

```bash
npm run test:unit -- apiResponse.test.js
```

**ما يتم اختباره:**

- ✅ صيغة الاستجابة الناجحة
- ✅ صيغة رسالة الخطأ
- ✅ إضافة pagination
- ✅ رموز HTTP الصحيحة

#### 4. User Model Tests

```bash
npm run test:unit -- User.test.js
```

**ما يتم اختباره:**

- ✅ التحقق من الحقول المطلوبة
- ✅ Uniqueness للـ phone و email
- ✅ Enum validation للـ role
- ✅ Password hashing
- ✅ مقارنة كلمات المرور

---

## 🔗 Integration Tests

### الاختبارات المتوفرة:

#### 1. Authentication Integration

```bash
npm run test:integration -- auth.integration.test.js
```

**الـ Endpoints المُختبرة:**

- `POST /api/auth/register` - التسجيل الجديد
- `POST /api/auth/login` - تسجيل الدخول
- `POST /api/auth/refresh-token` - تحديث Token
- `POST /api/auth/logout` - تسجيل الخروج

#### 2. Order Integration

```bash
npm run test:integration -- order.integration.test.js
```

**الـ Endpoints المُختبرة:**

- `POST /api/orders` - إنشاء طلب
- `GET /api/orders` - قائمة الطلبات
- `GET /api/orders/:id` - تفاصيل الطلب
- `PUT /api/orders/:id/rate` - تقييم الطلب

---

## 📊 تقرير Coverage

### الحصول على التقرير:

```bash
npm run test:coverage
```

### استعراض التقرير:

```bash
# يتم إنشاء مجلد coverage/
open coverage/lcov-report/index.html
```

### الحد الأدنى المطلوب:

```javascript
{
  branches: 50,
  functions: 50,
  lines: 50,
  statements: 50
}
```

---

## 🚀 تشغيل جميع الاختبارات

### تشغيل بسيط:

```bash
npm test
```

### مع تقرير الـ Coverage:

```bash
npm run test:coverage
```

### في Mode المراقبة (Watch):

```bash
npm run test:watch
```

### اختبارات Unit فقط:

```bash
npm run test:unit
```

### اختبارات Integration فقط:

```bash
npm run test:integration
```

---

## ⚙️ إعداد الاختبارات

### ملف الإعداد:

```
jest.config.js
tests/setup.js
```

### متغيرات البيئة للاختبارات:

```
NODE_ENV=test
JWT_SECRET=test-secret-key
MONGO_URI=mongodb://localhost:27017/mobile-maintenance-test
```

---

## 📝 كتابة اختبارات جديدة

### هيكل الاختبار الأساسي:

```javascript
describe("Feature Name", () => {
  beforeAll(async () => {
    // Setup قبل جميع الاختبارات
  });

  beforeEach(async () => {
    // Setup قبل كل اختبار
  });

  test("should do something", () => {
    expect(result).toBe(expected);
  });

  afterEach(async () => {
    // Cleanup بعد كل اختبار
  });

  afterAll(async () => {
    // Cleanup بعد جميع الاختبارات
  });
});
```

### مثال: اختبار Controller

```javascript
const request = require("supertest");
const app = require("../../src/app");

describe("POST /api/users", () => {
  test("should create user with valid data", async () => {
    const response = await request(app).post("/api/users").send({
      phone: "966501234567",
      password: "Test@123",
      name: "Test User",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  test("should reject invalid phone", async () => {
    const response = await request(app).post("/api/users").send({
      phone: "invalid",
      password: "Test@123",
    });

    expect(response.status).toBe(400);
  });
});
```

---

## 🔍 Debug الاختبارات

### إضافة console.log:

```javascript
test("should do something", () => {
  console.log("Debugging:", variable);
  expect(result).toBe(expected);
});
```

### تشغيل اختبار واحد فقط:

```bash
npm test -- --testNamePattern="should do something"
```

### تشغيل ملف واحد فقط:

```bash
npm test -- --testPathPattern="auth"
```

### مع Verbose output:

```bash
npm test -- --verbose
```

### مع Debugger:

```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

---

## 🛠️ أفضل الممارسات

### ✅ نعم:

- اختبر الحالات الطبيعية والشاذة
- استخدم أسماء وصفية
- نظّف البيانات بعد الاختبار
- استخدم مocks للـ external services
- اختبر رسائل الأخطاء

### ❌ لا:

- لا تختبر المكتبات الخارجية
- لا تستخدم delays/timeouts عشوائية
- لا تختبر تفاصيل الكود الداخلية
- لا تعتمد على ترتيب الاختبارات

---

## 🔄 CI/CD التلقائي

### GitHub Actions:

```
.github/workflows/ci-cd.yml
```

### يتم تشغيل الاختبارات تلقائياً على:

- ✅ كل push على main/develop
- ✅ كل pull request

### النتائج:

- ✅ إذا نجحت جميع الاختبارات ✅
- ❌ إذا فشلت أي اختبار ❌

---

## 📈 تحسين التغطية

### المناطق التي تحتاج اختبارات:

- [ ] Middleware tests
- [ ] Route validation tests
- [ ] Database connection tests
- [ ] Error handling tests
- [ ] Security tests (injection, XSS)

### زيادة التغطية:

```bash
# ابحث عن الملفات بـ تغطية منخفضة
npm run test:coverage -- --coverage

# لاحظ الأسطر الحمراء في التقرير
```

---

## 🚨 استكشاف الأخطاء

### خطأ: "Cannot find module"

```bash
npm install
```

### خطأ: "Timeout"

```javascript
test("should work", async () => {
  // ...
}, 10000); // 10 ثوانٍ timeout
```

### خطأ: "Port in use"

```bash
# غيّر PORT في test environment
# أو استخدم ephemeral ports
```

---

## 📚 موارد إضافية

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Examples](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

---

**آخر تحديث:** 2026-06-20
