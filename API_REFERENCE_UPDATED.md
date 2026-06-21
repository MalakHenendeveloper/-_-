# API Reference: Updated Authentication Endpoints

## 1. Registration (NEW - Immediate Access)

### Endpoint

```
POST /api/auth/register
Content-Type: application/json
```

### Request

```json
{
  "name": "Ahmed Ali",
  "phone": "+1234567890",
  "email": "ahmed@example.com", // Optional
  "password": "SecurePass123"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "message": "تم تسجيل الحساب بنجاح",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Ahmed Ali",
      "phone": "+1234567890",
      "email": "ahmed@example.com",
      "role": "client",
      "isVerified": true,
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Key Points

- ✅ Users immediately verified (`isVerified: true`)
- ✅ Tokens returned on registration
- ✅ Email optional (no OTP requirement)
- ✅ User can login immediately
- ✅ No 'verify-otp' step required

### Error Responses

```json
// Phone already registered
{
  "success": false,
  "error": "رقم الهاتف مسجل بالفعل"
}

// Email already registered
{
  "success": false,
  "error": "البريد الإلكتروني مسجل بالفعل"
}

// Invalid request
{
  "success": false,
  "error": "\"name\" is required"
}
```

---

## 2. Login (UNCHANGED)

### Endpoint

```
POST /api/auth/login
Content-Type: application/json
```

### Request

```json
{
  "phone": "+1234567890",
  "password": "SecurePass123"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Ahmed Ali",
      "phone": "+1234567890",
      "email": "ahmed@example.com",
      "role": "client",
      "isVerified": true,
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Key Points

- ✅ No OTP required for login
- ✅ New users can login immediately after registration
- ✅ Old users work as before

---

## 3. Verify OTP - NOW ONLY FOR PASSWORD RESET

### Endpoint

```
POST /api/auth/verify-otp
Content-Type: application/json
```

### Request

```json
{
  "phone": "+1234567890",
  "code": "123456",
  "type": "reset_password" // Only type supported
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "تم التحقق من الرمز بنجاح",
  "data": {
    "phone": "+1234567890",
    "verified": true
  }
}
```

### Key Points

- ✅ Only accepts `"reset_password"` type
- ✅ `"verify_email"` and `"verify_phone"` no longer supported
- ✅ Registration verification removed
- ✅ Used only in password recovery flow

### Error Responses

```json
// Invalid OTP
{
  "success": false,
  "error": "رمز التحقق غير صحيح أو منتهي الصلاحية"
}

// Invalid type
{
  "success": false,
  "error": "\"type\" must be one of [reset_password]"
}
```

---

## 4. Send OTP - NOW ONLY FOR PASSWORD RESET

### Endpoint

```
POST /api/auth/send-otp
Content-Type: application/json
```

### Request

```json
{
  "phone": "+1234567890",
  "type": "reset_password" // Only type supported
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "تم إرسال رمز التحقق بنجاح"
}
```

### Backend Log

```
[MOCK SMS] To: +1234567890, Message: رمز التحقق الخاص بك هو: 123456
```

### Key Points

- ✅ Only accepts `"reset_password"` type
- ✅ `"verify_phone"` no longer supported
- ✅ Used only in password recovery flow
- ✅ Sends SMS (not email)

### Error Responses

```json
// Invalid type
{
  "success": false,
  "error": "\"type\" must be one of [reset_password]"
}
```

---

## 5. Forgot Password (UNCHANGED)

### Endpoint

```
POST /api/auth/forgot-password
Content-Type: application/json
```

### Request

```json
{
  "phone": "+1234567890"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "تم إرسال رمز إعادة تعيين كلمة المرور بنجاح..."
}
```

### Backend Flow

1. User provides phone
2. Server generates OTP (calls `sendOtp` internally)
3. SMS sent to phone
4. User verifies with `verify-otp`

### Error Responses

```json
// Phone not found
{
  "success": false,
  "error": "رقم الهاتف غير مسجل لدينا"
}

// No email configured
{
  "success": false,
  "error": "لا يوجد بريد إلكتروني مسجل..."
}
```

---

## 6. Reset Password (UNCHANGED)

### Endpoint

```
POST /api/auth/reset-password
Content-Type: application/json
```

### Request

```json
{
  "phone": "+1234567890",
  "code": "123456",
  "newPassword": "NewSecurePass456"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "تم إعادة تعيين كلمة المرور بنجاح"
}
```

### Key Points

- ✅ Uses SMS OTP verification
- ✅ Forces logout on all devices
- ✅ Clears all refresh tokens for security

### Error Responses

```json
// Invalid OTP
{
  "success": false,
  "error": "رمز التحقق غير صحيح أو منتهي الصلاحية"
}

// User not found
{
  "success": false,
  "error": "المستخدم غير موجود"
}
```

---

## 7. Refresh Token (UNCHANGED)

### Endpoint

```
POST /api/auth/refresh-token
Content-Type: application/json
```

### Request

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "تم تجديد التوكن بنجاح",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 8. Logout (UNCHANGED)

### Endpoint

```
POST /api/auth/logout
Content-Type: application/json
```

### Request

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "تم تسجيل الخروج بنجاح"
}
```

---

## Complete Registration → Login Flow

### Step 1: Register (NEW - Get Tokens)

```
POST /api/auth/register
{
  "name": "Ahmed",
  "phone": "+1234567890",
  "email": "ahmed@example.com",
  "password": "Secure123"
}

Response: 201 Created
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { ... }
}
```

### Step 2: Use Token Immediately (NEW - No OTP Wait)

```
GET /api/orders
Authorization: Bearer {accessToken}

✅ Success - User immediately authenticated
```

### Step 3: Refresh Token (Unchanged)

```
POST /api/auth/refresh-token
{
  "refreshToken": "..."
}

Response:
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

---

## Authentication Header Format (UNCHANGED)

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Migration Guide for Frontend Clients

### OLD FLOW (Deprecated)

```javascript
// 1. Register
const registerRes = await fetch("/api/auth/register", {
  body: JSON.stringify({ name, phone, email, password }),
});
// Response: { message: "Check your email" }

// 2. Wait for OTP email
// 3. User enters OTP manually
const verifyRes = await fetch("/api/auth/verify-otp", {
  body: JSON.stringify({ email, code, type: "verify_email" }),
});
// Response: { verified: true }

// 4. Then login
const loginRes = await fetch("/api/auth/login", {
  body: JSON.stringify({ phone, password }),
});
// Response: { accessToken, refreshToken }

// 5. Use token
headers.Authorization = `Bearer ${accessToken}`;
```

### NEW FLOW (Current)

```javascript
// 1. Register (get tokens immediately)
const registerRes = await fetch("/api/auth/register", {
  body: JSON.stringify({ name, phone, email, password }),
});
const data = registerRes.json();
const { accessToken, refreshToken } = data.data;

// 2. No OTP step needed!

// 3. No login step needed - just use the token
headers.Authorization = `Bearer ${accessToken}`;

// 4. Ready to use immediately!
```

---

## Summary of Changes

| Endpoint              | Change                           | Impact                   |
| --------------------- | -------------------------------- | ------------------------ |
| POST /register        | Returns tokens + isVerified=true | Users login immediately  |
| POST /verify-otp      | Only reset_password type         | Registration OTP removed |
| POST /send-otp        | Only reset_password type         | Registration OTP removed |
| POST /forgot-password | No change                        | Works as before          |
| POST /reset-password  | No change                        | Works as before          |
| POST /login           | No change                        | Works as before          |
| POST /refresh-token   | No change                        | Works as before          |
| POST /logout          | No change                        | Works as before          |

---

**Status**: Ready for Client Integration ✅
