# DEPLOYMENT GUIDE

دليل شامل لـ نشر تطبيق Mobile Maintenance API

## المتطلبات

- Node.js 18+ و npm
- MongoDB 7.0+
- Docker و Docker Compose (اختياري)
- Cloudinary account (لـ uploads)
- SMTP server (لـ email)
- Vonage/Twilio account (لـ SMS - اختياري)

---

## 1️⃣ Local Development Setup

### خطوات التثبيت الأساسية:

```bash
# استنساخ المشروع
git clone <repository-url>
cd nagek

# تثبيت المتعلقات
npm install

# إعداد متغيرات البيئة
cp .env.example .env
# عدّل .env بـ بيانات MongoDB و Cloudinary الفعلية

# تشغيل MongoDB محلياً (اختياري)
mongod

# تشغيل الخادم في بيئة التطوير
npm run dev

# تشغيل البذر (seed) بـ بيانات الاختبار
npm run seed
```

### الوصول للـ API:

```
http://localhost:5000
```

---

## 2️⃣ Testing

### تشغيل جميع الاختبارات:

```bash
npm test
```

### اختبارات Unit فقط:

```bash
npm run test:unit
```

### اختبارات Integration فقط:

```bash
npm run test:integration
```

### تقرير Coverage:

```bash
npm run test:coverage
```

### مراقبة الاختبارات (Watch Mode):

```bash
npm run test:watch
```

### متطلبات النجاح:

- ✅ جميع Unit Tests تمر
- ✅ جميع Integration Tests تمر
- ✅ Coverage ≥ 50%

---

## 3️⃣ Docker Deployment

### الخيار الأول: Docker Compose (الأسهل)

```bash
# نسخ .env
cp .env.example .env

# تشغيل كل شيء
docker-compose up -d

# مراقبة السجلات
docker-compose logs -f api

# إيقاف الخدمات
docker-compose down
```

**المخدومات المتاحة:**

- API: `http://localhost:5000`
- MongoDB: `localhost:27017`
- Mongo Express (اختياري): `http://localhost:8081`

### الخيار الثاني: Docker يدوياً

```bash
# بناء الصورة
docker build -t mobile-maintenance-api .

# تشغيل حاوية
docker run -d \
  --name mobile-api \
  -p 5000:5000 \
  --env-file .env \
  mobile-maintenance-api
```

---

## 4️⃣ البيئات المختلفة

### Environment Variables المطلوبة:

```env
# Server
NODE_ENV=production
PORT=5000

# Database
MONGO_URI=mongodb://user:pass@host:27017/database

# JWT
JWT_SECRET=<your-secret-key>
JWT_REFRESH_SECRET=<your-refresh-secret>
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=30d

# Cloudinary (File Upload)
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password

# SMS (اختياري)
SMS_API_KEY=your-api-key
SMS_SENDER=MobileMaintenance
```

---

## 5️⃣ نشر على Railway.app

Railway.app هو الخيار الأسهل للنشر السريع:

### الخطوات:

1. **إنشاء حساب على Railway**

   ```
   https://railway.app
   ```

2. **ربط مستودع GitHub**
   - اضغط "New Project"
   - اختر "Deploy from GitHub"
   - اختر مستودعك

3. **إضافة متغيرات البيئة**
   - في Railway Dashboard
   - أضف جميع متغيرات .env

4. **إضافة MongoDB**
   - في Railway اضغط "Add Service"
   - اختر MongoDB
   - استخدم `${{Mongo.DATABASE_URL}}`

5. **Deploy**
   - سيتم النشر تلقائياً مع كل push

**الرابط:** `https://<your-project>.railway.app`

---

## 6️⃣ نشر على Render.com

### الخطوات:

1. **إنشاء حساب على Render**

   ```
   https://render.com
   ```

2. **إنشاء Web Service**
   - اختر "New Web Service"
   - اربط حساب GitHub
   - اختر المستودع

3. **الإعدادات**
   - Build Command: `npm install`
   - Start Command: `npm start`

4. **البيئة**
   - أضف جميع Environment Variables من .env

5. **قاعدة البيانات**
   - استخدم MongoDB Atlas للـ cloud database
   - أضف MONGO_URI

6. **Deploy**
   - سيتم النشر التلقائي

**الرابط:** `https://<your-service>.onrender.com`

---

## 7️⃣ نشر على VPS (DigitalOcean/Linode)

### المتطلبات:

- VPS بـ Ubuntu 20.04+
- SSH access

### الخطوات:

```bash
# 1. تحديث النظام
sudo apt update && sudo apt upgrade -y

# 2. تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. تثبيت MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# 4. تثبيت Nginx (reverse proxy)
sudo apt install -y nginx
```

### تكوين Nginx:

```nginx
# /etc/nginx/sites-available/mobile-maintenance
upstream nodejs {
  server localhost:5000;
}

server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://nodejs;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

### تفعيل Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/mobile-maintenance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### نشر التطبيق:

```bash
# استنساخ المستودع
git clone <repo-url> /home/app/mobile-maintenance
cd /home/app/mobile-maintenance

# تثبيت المتعلقات
npm install

# إنشاء .env
nano .env

# تشغيل بـ PM2
npm install -g pm2
pm2 start server.js --name "mobile-maintenance"
pm2 startup
pm2 save
```

### إضافة SSL (اختياري):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 8️⃣ CI/CD Pipeline

تم إعداد GitHub Actions لـ automation:

### الـ Workflow:

1. **Lint** - فحص جودة الكود
2. **Test** - تشغيل جميع الاختبارات
3. **Security** - فحص الثغرات الأمنية
4. **Build** - بناء صورة Docker
5. **Deploy** - نشر على الإنتاج (اختياري)

### ملف الإعداد:

```
.github/workflows/ci-cd.yml
```

---

## 9️⃣ مراقبة التطبيق

### الصحة:

```bash
curl http://your-domain.com/health
```

### السجلات:

```bash
# Docker
docker-compose logs -f api

# PM2
pm2 logs

# Systemd
journalctl -u nodejs -f
```

### الأداء:

```bash
# Docker
docker stats

# Unix
top -p $(pgrep node)
```

---

## 🔟 استكشاف الأخطاء

### المشكلة: Cannot connect to MongoDB

```bash
# تحقق من الاتصال
mongosh <MONGO_URI>

# تحقق من firewall
sudo ufw status
sudo ufw allow 27017
```

### المشكلة: Port 5000 مشغول

```bash
# ابحث عن العملية
lsof -i :5000

# أو غيّر PORT في .env
```

### المشكلة: صور غير محملة

```bash
# تحقق من Cloudinary credentials
curl -I https://api.cloudinary.com/

# اختبر الاتصال
node -e "require('cloudinary')"
```

---

## أفضل الممارسات

✅ **Always:**

- استخدم HTTPS في الإنتاج
- أضف SSL certificate
- استخدم environment variables
- فعّل rate limiting
- عمّل نسخ احتياطية منتظمة

❌ **Never:**

- ضع secrets في الكود
- استخدم default passwords
- شغّل بـ root على VPS
- عطّل security headers

---

## الدعم والمساعدة

للمزيد من المعلومات:

- 📖 [README.md](./README.md)
- 🧪 [Testing Guide](./TESTING.md)
- 🔐 [Security Best Practices](./SECURITY.md)

---

**آخر تحديث:** 2026-06-20
