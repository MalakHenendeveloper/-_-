# ENVIRONMENT SETUP GUIDE

دليل إعداد متغيرات البيئة والـ Configuration

---

## 📁 ملف .env

### الموقع:

```
project-root/.env
```

### الكيفية:

```bash
# 1. انسخ الملف القالب
cp .env.example .env

# 2. عدّل القيم
nano .env

# 3. تأكد من القيم الحقيقية
```

---

## 📝 جميع متغيرات البيئة المطلوبة

### 1️⃣ Server Configuration

```env
# بيئة التشغيل
NODE_ENV=development
# اختيارات: development, production, test

# رقم المنفذ
PORT=5000
```

**مثال للإنتاج:**

```env
NODE_ENV=production
PORT=80
```

---

### 2️⃣ Database Configuration

```env
# MongoDB Connection String
MONGO_URI=mongodb://localhost:27017/mobile-maintenance

# للـ MongoDB Atlas (السحابة):
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/mobile-maintenance?retryWrites=true&w=majority

# للـ Docker:
MONGO_URI=mongodb://root:password@mongodb:27017/mobile-maintenance?authSource=admin
```

**اختبار الاتصال:**

```bash
mongosh <MONGO_URI>
```

---

### 3️⃣ JWT Configuration

```env
# مفتاح سر لـ Access Token
JWT_SECRET=your-very-secure-random-string-here-min-32-chars

# مفتاح سر لـ Refresh Token
JWT_REFRESH_SECRET=another-very-secure-random-string-here-min-32-chars

# مدة صلاحية Access Token
JWT_EXPIRE=15m

# مدة صلاحية Refresh Token
JWT_REFRESH_EXPIRE=30d
```

**توليد مفاتيح آمنة:**

```bash
# على Unix/Linux/Mac:
openssl rand -base64 32

# على Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Maximum 256) }))
```

---

### 4️⃣ Cloudinary Configuration

```env
# اسم السحابة الخاص بك
CLOUDINARY_CLOUD_NAME=your-cloud-name

# مفتاح API
CLOUDINARY_API_KEY=your-api-key

# سر API
CLOUDINARY_API_SECRET=your-api-secret
```

**الحصول على الـ Credentials:**

1. تسجيل حساب: https://cloudinary.com/
2. Dashboard → Settings
3. API Keys
4. نسخ القيم

**مثال:**

```env
CLOUDINARY_CLOUD_NAME=djkx8k9d9
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=abcdef123xyz
```

---

### 5️⃣ SMTP Configuration (البريد الإلكتروني)

```env
# خادم SMTP
SMTP_HOST=smtp.mailtrap.io
# أو: smtp.gmail.com, smtp.outlook.com, إلخ

# منفذ SMTP
SMTP_PORT=2525
# أو: 587 (مع STARTTLS), 465 (مع SSL)

# بريد الإرسال
SMTP_USER=your-email@example.com

# كلمة المرور
SMTP_PASS=your-app-password
```

**خيارات SMTP الموصى بها:**

| الخدمة   | Host              | Port | SSL |
| -------- | ----------------- | ---- | --- |
| Gmail    | smtp.gmail.com    | 587  | Yes |
| Outlook  | smtp.outlook.com  | 587  | Yes |
| SendGrid | smtp.sendgrid.net | 587  | Yes |
| Mailtrap | smtp.mailtrap.io  | 2525 | No  |

**إعداد Gmail:**

```
1. تفعيل 2FA على الحساب
2. تطبيقات → كلمة مرور التطبيق
3. نسخ الكلمة المولدة
4. استخدمها كـ SMTP_PASS
```

---

### 6️⃣ SMS Configuration (الرسائل النصية)

```env
# مفتاح API للـ SMS (مثلاً Vonage)
SMS_API_KEY=your-sms-api-key

# معرّف المرسل
SMS_SENDER=MobileMaintenance
```

**خيارات SMS الموصى بها:**

| الخدمة  | الـ API            |
| ------- | ------------------ |
| Vonage  | vonage.com         |
| Twilio  | twilio.com         |
| AWS SNS | aws.amazon.com/sns |

**مثال Vonage:**

```env
SMS_API_KEY=abcd1234efgh5678
SMS_SENDER=MobileMaintenance
```

---

## 🔒 أمان متغيرات البيئة

### ✅ يجب فعله:

1. **استخدم .gitignore**

   ```
   # .gitignore
   .env
   .env.local
   .env.*.local
   ```

2. **استخدم .env.example للقالب**

   ```env
   # .env.example (بدون قيم حقيقية)
   NODE_ENV=development
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/database
   JWT_SECRET=your-secret-here
   ```

3. **استخدم Vault للقيم الحساسة**
   ```
   HashiCorp Vault
   AWS Secrets Manager
   Azure Key Vault
   ```

### ❌ لا تفعل:

1. **لا تضع .env في Git**
2. **لا تشارك Secrets عبر البريد**
3. **لا تترك كلمات المرور في الأكواد**
4. **لا تستخدم نفس Secret في Dev و Prod**

---

## 📋 Checklist الإعداد

### في بيئة التطوير:

- [ ] نسخ .env.example إلى .env
- [ ] تعيين NODE_ENV=development
- [ ] تثبيت MongoDB محلياً أو استخدام Atlas
- [ ] توليد JWT_SECRET و JWT_REFRESH_SECRET
- [ ] إعداد Cloudinary (أو ترك mock)
- [ ] إعداد SMTP (أو استخدام Mailtrap)

### في بيئة الإنتاج:

- [ ] استخدام قيم قوية آمنة للجميع
- [ ] تفعيل HTTPS و SSL
- [ ] استخدام Vault أو Secrets Manager
- [ ] تعيين NODE_ENV=production
- [ ] استخدام MongoDB Atlas أو managed service
- [ ] إعداد SMTP حقيقي (Gmail, SendGrid, etc)
- [ ] فعّل monitoring و logging
- [ ] عمّل نسخ احتياطية دوري

---

## 🧪 اختبار الإعدادات

### اختبار MongoDB:

```bash
mongosh <MONGO_URI>
# أو
mongo <MONGO_URI>
```

### اختبار JWT:

```javascript
const jwt = require("jsonwebtoken");
const token = jwt.sign({ test: true }, process.env.JWT_SECRET);
console.log(token);
```

### اختبار SMTP:

```javascript
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) console.log(error);
  else console.log("SMTP ready");
});
```

### اختبار Cloudinary:

```javascript
const cloudinary = require("cloudinary").v2;
cloudinary.api.resources((error, result) => {
  if (error) console.log(error);
  else console.log("Cloudinary OK");
});
```

---

## 🔄 تغيير البيئة

### من Development إلى Production:

```bash
# تحديث .env
NODE_ENV=production
PORT=80
MONGO_URI=<production-url>
JWT_SECRET=<strong-secret>
# إلخ...

# أعد تشغيل الخادم
npm run start
```

### من Production إلى Staging:

```bash
# نسخ ملف جديد
cp .env .env.staging

# عدّل القيم
NODE_ENV=staging
MONGO_URI=<staging-url>

# استخدمه
NODE_ENV=staging node server.js
```

---

## 🚨 استكشاف الأخطاء

### خطأ: "Cannot connect to MongoDB"

```bash
# تحقق من MONGO_URI
echo $MONGO_URI

# اختبر الاتصال
mongosh <MONGO_URI>

# تحقق من Firewall
sudo ufw allow 27017
```

### خطأ: "JWT_SECRET is undefined"

```bash
# تأكد من وجود .env
ls -la .env

# تحقق من القيمة
echo $JWT_SECRET

# أعد تشغيل الخادم
npm run dev
```

### خطأ: "SMTP connection refused"

```bash
# تحقق من host و port
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# تأكد من كلمة المرور (app password و ليس الحساب)
# تحقق من 2FA
```

### خطأ: "Cloudinary upload failed"

```bash
# تحقق من الـ Credentials
CLOUDINARY_CLOUD_NAME=your-cloud-name

# اختبر الاتصال
curl -I https://api.cloudinary.com/

# تحقق من الـ Folder path في upload middleware
```

---

## 📚 موارد إضافية

- MongoDB: https://mongodb.com/docs
- Cloudinary: https://cloudinary.com/documentation
- Nodemailer: https://nodemailer.com/
- JWT: https://jwt.io/

---

**آخر تحديث:** 2026-06-20
