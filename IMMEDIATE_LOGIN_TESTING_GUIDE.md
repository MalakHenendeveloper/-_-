# Testing Guide: Immediate Login After Registration

## Quick Start: Manual Testing

### Test 1: Register and Get Tokens Immediately

**Endpoint:** `POST /api/auth/register`

**Request:**

```json
{
  "name": "Ahmed Ali",
  "phone": "+1234567890",
  "email": "ahmed@example.com",
  "password": "SecurePass123"
}
```

**Expected Response (201 Created):**

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

**Validation Checklist:**

- ✅ Status code is 201
- ✅ `success` is `true`
- ✅ `isVerified` is `true` (NOT false)
- ✅ `accessToken` is returned
- ✅ `refreshToken` is returned
- ✅ No OTP in response
- ✅ User data includes `isVerified: true`

---

### Test 2: Use Token Immediately (Without Login)

**Step 1:** Copy `accessToken` from registration response

**Step 2:** Use token in any authenticated endpoint

**Endpoint:** `GET /api/user/profile` (or any protected route)

**Request Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Ahmed Ali",
      "phone": "+1234567890",
      "email": "ahmed@example.com",
      "role": "client",
      "isVerified": true,
      "isActive": true
    }
  }
}
```

**Validation:**

- ✅ No 401 Unauthorized error
- ✅ User is authenticated
- ✅ No OTP verification required
- ✅ Full access granted immediately

---

### Test 3: Login is Still Available (But Not Required)

**Endpoint:** `POST /api/auth/login`

**Request:**

```json
{
  "phone": "+1234567890",
  "password": "SecurePass123"
}
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Validation:**

- ✅ Login still works
- ✅ Different tokens generated from registration
- ✅ No OTP check
- ✅ Can now have multiple valid token pairs

---

### Test 4: Email is Optional in Registration

**Request (No Email):**

```json
{
  "name": "Test User",
  "phone": "+9876543210",
  "password": "Password123"
}
```

**Expected Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "user": {
      "email": null,
      "isVerified": true,
      ...
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Validation:**

- ✅ No error for missing email
- ✅ User created successfully
- ✅ Tokens generated
- ✅ User immediately verified

---

### Test 5: Verify OTP Endpoint Only Accepts reset_password

**Endpoint:** `POST /api/auth/verify-otp`

**Request (With verify_email - Should Fail):**

```json
{
  "email": "ahmed@example.com",
  "code": "123456",
  "type": "verify_email"
}
```

**Expected Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "\"type\" must be one of [reset_password]"
}
```

**Validation:**

- ✅ verify_email type rejected
- ✅ Only reset_password accepted
- ✅ Registration OTP flow removed

---

### Test 6: Password Reset Flow Still Works

**Step 1: Request Password Reset**

```
POST /api/auth/forgot-password
{
  "phone": "+1234567890"
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "تم إرسال رمز إعادة تعيين كلمة المرور..."
}
```

**Step 2: Verify Reset OTP**

```
POST /api/auth/verify-otp
{
  "phone": "+1234567890",
  "code": "654321",
  "type": "reset_password"
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "verified": true
  }
}
```

**Validation:**

- ✅ SMS OTP sent for password reset
- ✅ verifyOtp accepts reset_password type
- ✅ Password recovery flow unchanged

---

## Complete User Journey Test

### Journey: Register → Access API → Refresh Token

```javascript
// 1. REGISTER (Get tokens immediately)
POST /api/auth/register
Input: { name, phone, email, password }
Output: { accessToken, refreshToken, user with isVerified: true }

// ⏱️ TIME: Immediate (no OTP wait)

// 2. USE TOKEN (Access protected endpoints)
GET /api/orders
Headers: { Authorization: Bearer accessToken }
Output: 200 OK, user data

// ⏱️ TIME: Immediate

// 3. REFRESH TOKEN (When access token expires)
POST /api/auth/refresh-token
Input: { refreshToken }
Output: { accessToken, refreshToken }

// ⏱️ TIME: As needed
```

---

## Unit Test Examples

### Test: Registration Returns Tokens

```javascript
describe("POST /api/auth/register", () => {
  it("should return accessToken and refreshToken", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Test User",
      phone: "+1234567890",
      email: "test@example.com",
      password: "Password123",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
    expect(response.body.data.user.isVerified).toBe(true);
  });

  it("should set isVerified to true immediately", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Test User",
      phone: "+1234567890",
      email: "test@example.com",
      password: "Password123",
    });

    expect(response.body.data.user.isVerified).toBe(true);
  });

  it("should work without email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Test User",
      phone: "+1234567890",
      password: "Password123",
      // email omitted
    });

    expect(response.status).toBe(201);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.user.email).toBeNull();
  });
});
```

### Test: Can Use Token Immediately

```javascript
describe("Token Usage After Registration", () => {
  it("should allow API access with registration token", async () => {
    // Register
    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Test User",
      phone: "+1234567890",
      email: "test@example.com",
      password: "Password123",
    });

    const { accessToken } = registerRes.body.data;

    // Use token immediately (no login needed)
    const profileRes = await request(app)
      .get("/api/user/profile")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.user.phone).toBe("+1234567890");
  });
});
```

### Test: Verify OTP Only Accepts reset_password

```javascript
describe("POST /api/auth/verify-otp", () => {
  it("should reject verify_email type", async () => {
    const response = await request(app).post("/api/auth/verify-otp").send({
      email: "test@example.com",
      code: "123456",
      type: "verify_email",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("reset_password");
  });

  it("should only accept reset_password type", async () => {
    // This should fail without valid OTP, but validate type
    const response = await request(app).post("/api/auth/verify-otp").send({
      phone: "+1234567890",
      code: "999999",
      type: "reset_password",
    });

    // Should fail because OTP doesn't exist, NOT because type is invalid
    expect(response.status).toBe(400);
    expect(response.body.error).toContain("رمز التحقق");
  });
});
```

---

## Postman Collection Updates

### Import into Postman

Replace old endpoints with these:

#### 1. Register (New - Returns Tokens)

```json
{
  "name": "Register",
  "request": {
    "method": "POST",
    "url": "{{BASE_URL}}/api/auth/register",
    "header": [{ "key": "Content-Type", "value": "application/json" }],
    "body": {
      "mode": "raw",
      "raw": "{\n  \"name\": \"Ahmed Ali\",\n  \"phone\": \"+1234567890\",\n  \"email\": \"ahmed@example.com\",\n  \"password\": \"SecurePass123\"\n}"
    }
  },
  "event": [
    {
      "listen": "test",
      "script": {
        "exec": [
          "var jsonData = pm.response.json();",
          "pm.environment.set('accessToken', jsonData.data.accessToken);",
          "pm.environment.set('refreshToken', jsonData.data.refreshToken);"
        ]
      }
    }
  ]
}
```

#### 2. Access API With Token

```json
{
  "name": "Get Profile",
  "request": {
    "method": "GET",
    "url": "{{BASE_URL}}/api/user/profile",
    "header": [
      {
        "key": "Authorization",
        "value": "Bearer {{accessToken}}"
      }
    ]
  }
}
```

#### 3. Forgot Password (Unchanged)

```json
{
  "name": "Forgot Password",
  "request": {
    "method": "POST",
    "url": "{{BASE_URL}}/api/auth/forgot-password",
    "header": [{ "key": "Content-Type", "value": "application/json" }],
    "body": {
      "mode": "raw",
      "raw": "{\"phone\": \"+1234567890\"}"
    }
  }
}
```

#### 4. Verify OTP (Now reset_password only)

```json
{
  "name": "Verify OTP",
  "request": {
    "method": "POST",
    "url": "{{BASE_URL}}/api/auth/verify-otp",
    "header": [{ "key": "Content-Type", "value": "application/json" }],
    "body": {
      "mode": "raw",
      "raw": "{\"phone\": \"+1234567890\",\"code\": \"123456\",\"type\": \"reset_password\"}"
    }
  }
}
```

---

## Success Criteria Checklist

### Registration Tests

- ✅ Returns 201 status
- ✅ Includes accessToken
- ✅ Includes refreshToken
- ✅ Sets isVerified = true
- ✅ No OTP in response
- ✅ Works without email
- ✅ Works with email
- ✅ Unique phone validation works
- ✅ Unique email validation works

### Token Tests

- ✅ AccessToken works immediately
- ✅ RefreshToken works immediately
- ✅ No login needed after registration
- ✅ Token can be used for API calls
- ✅ Unauthorized error if token invalid

### OTP Tests

- ✅ verify_email type rejected
- ✅ verify_phone type rejected
- ✅ reset_password type accepted
- ✅ Password recovery still works
- ✅ SMS OTP sent for password reset

### Backward Compatibility

- ✅ Login endpoint works
- ✅ Forgot password works
- ✅ Reset password works
- ✅ Old users can still login
- ✅ Password recovery for old users works

---

## Common Issues & Solutions

### Issue: Getting 400 "email is required"

**Cause:** Old schema still requiring email
**Solution:** Check line 33 of auth.controller.js shows `.optional()`

### Issue: User created with isVerified: false

**Cause:** Old code still setting `isVerified: false`
**Solution:** Check line 76 of auth.controller.js shows `isVerified: true`

### Issue: No tokens in response

**Cause:** Missing token generation code
**Solution:** Check lines 81-87 of auth.controller.js for token generation

### Issue: OTP verification endpoint broken

**Cause:** Type enum still includes old types
**Solution:** Check line 311 of auth.controller.js shows only `reset_password`

---

## Performance Notes

### Registration Time Reduction

```
Before: Registration → Generate OTP → Send Email → Wait for user → Verify → Login
Time: 5-10+ minutes (user wait time for email)

After: Registration → Generate Tokens → User has full access
Time: <100ms (instant)
```

### Token Generation Overhead

- AccessToken generation: ~5ms
- RefreshToken generation: ~5ms
- Total: ~10ms (negligible)

---

**All tests ready to execute! ✅**
