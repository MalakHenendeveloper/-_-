# API Examples - After Fixes

## 1️⃣ Create Repair Center (Fixed - No Transactions)

### Request

```bash
POST /api/admin/centers
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "ownerName": "أحمد محمد أبو العمارة",
  "phone": "966501234567",
  "email": "ahmad.center@example.com",
  "password": "SecurePassword123!",
  "name": "مركز الصيانة الأول - الرياض",
  "address": "حي النخيل، الرياض",
  "city": "Riyadh",
  "coordinates": {
    "lat": 24.7136,
    "lng": 46.6753
  },
  "supportedBrands": ["Apple", "Samsung", "Huawei"],
  "supportedDeviceTypes": ["phone", "tablet", "laptop"],
  "inspectionFee": 50
}
```

### Response (Success) - 201 Created

```json
{
  "success": true,
  "message": "تم إنشاء مركز الصيانة ومالك المركز بنجاح",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "أحمد محمد أبو العمارة",
      "email": "ahmad.center@example.com"
    },
    "center": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "مركز الصيانة الأول - الرياض",
      "owner": "507f1f77bcf86cd799439011",
      "phone": "966501234567",
      "email": "ahmad.center@example.com",
      "address": "حي النخيل، الرياض",
      "city": "Riyadh",
      "coordinates": {
        "lat": 24.7136,
        "lng": 46.6753
      },
      "supportedBrands": ["Apple", "Samsung", "Huawei"],
      "supportedDeviceTypes": ["phone", "tablet", "laptop"],
      "inspectionFee": 50,
      "status": "active",
      "createdAt": "2026-06-21T10:30:00.000Z",
      "updatedAt": "2026-06-21T10:30:00.000Z"
    }
  },
  "statusCode": 201
}
```

### Response (Error - Duplicate Email) - 400 Bad Request

```json
{
  "success": false,
  "message": "البريد الإلكتروني مسجل بالفعل",
  "statusCode": 400,
  "errors": []
}
```

### Note on Fix

✅ **No longer requires MongoDB Replica Set**

- Before: Crashed with "Transaction numbers are only allowed on a replica set member"
- After: Works on standalone MongoDB
- Implementation: Two-step creation with manual rollback on failure
- If center creation fails → user is automatically deleted (maintains atomicity)

---

## 2️⃣ Assign Delegate to Order (State Machine Verified)

### Request

```bash
PUT /api/admin/orders/607f1f77bcf86cd799439020/assign-delegate
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "delegateId": "507f1f77bcf86cd799439013"
}
```

### Validation Process (Transparent to Client)

```javascript
// Step 1: Verify delegate exists
order.status = "pending"; // From DB

// Step 2: Get valid transitions for current status
const validTransitions = Order.getValidTransitions("pending");
// Returns: ["delegate_assigned", "cancelled"]

// Step 3: Check if target status is valid
validTransitions.includes("delegate_assigned"); // TRUE ✅

// Step 4: Proceed with assignment
order.delegate = delegateId;
order.status = "delegate_assigned";
```

### Response (Success) - 200 OK

```json
{
  "success": true,
  "message": "تم تعيين المندوب للطلب بنجاح",
  "data": {
    "order": {
      "_id": "607f1f77bcf86cd799439020",
      "orderNumber": "ORD-20260621-ABC12345",
      "client": "507f1f77bcf86cd799439010",
      "delegate": "507f1f77bcf86cd799439013",
      "repairCenter": "507f1f77bcf86cd799439012",
      "status": "delegate_assigned",
      "device": {
        "type": "phone",
        "brand": "Apple",
        "model": "iPhone 14",
        "problemType": "screen",
        "problemDescription": "الشاشة مكسورة"
      },
      "statusHistory": [
        {
          "status": "pending",
          "timestamp": "2026-06-21T10:00:00Z",
          "note": "تم إنشاء الطلب بنجاح"
        },
        {
          "status": "delegate_assigned",
          "timestamp": "2026-06-21T10:05:00Z",
          "note": "تم تعيين المندوب: محمد علي"
        }
      ],
      "paymentStatus": "unpaid"
    }
  },
  "statusCode": 200
}
```

### Response (Error - Invalid Status) - 400 Bad Request

```json
{
  "success": false,
  "message": "لا يمكن تعيين مندوب للطلب في حالة at_center. الحالة الحالية: at_center",
  "statusCode": 400,
  "errors": []
}
```

### Note on Fix

✅ **State machine now correctly routes: pending → delegate_assigned**

- Before: Would fail validation if only checking for "assigning_delegate"
- After: Direct transition from pending to delegate_assigned
- Uses centralized `Order.getValidTransitions()` for all validations
- No hardcoded status values outside Order Model

---

## 3️⃣ Update Order Status (With Unified Statuses)

### Request

```bash
PUT /api/centers/dashboard/orders/607f1f77bcf86cd799439020/status
Content-Type: application/json
Authorization: Bearer {center_token}

{
  "status": "repaired",
  "note": "تم إصلاح الجهاز بنجاح"
}
```

### Response (Success) - 200 OK

```json
{
  "success": true,
  "message": "تم تحديث حالة الطلب بنجاح",
  "data": {
    "order": {
      "_id": "607f1f77bcf86cd799439020",
      "status": "repaired",
      "statusHistory": [
        {...},
        {
          "status": "repaired",
          "timestamp": "2026-06-21T14:30:00Z",
          "note": "تم إصلاح الجهاز بنجاح"
        }
      ]
    }
  },
  "statusCode": 200
}
```

### Note on Fix

✅ **All statuses unified - ready_for_pickup replaced with repaired**

- Before: `ready_for_pickup` counted in stats but not in Order enum
- After: Using `repaired` status which is in the enum
- Represents: Device is repaired and ready for pickup/return
- Natural flow: repairing → **repaired** → returning → delivered

---

## 4️⃣ Get Center Statistics (Fixed Status Counts)

### Request

```bash
GET /api/centers/dashboard/stats
Authorization: Bearer {center_token}
```

### Response (Success) - 200 OK

```json
{
  "success": true,
  "message": "إحصائيات لوحة تحكم المركز",
  "data": {
    "totalOrders": 25,
    "paidRevenue": 3750,
    "statusCounts": {
      "pending": 3,
      "delegate_assigned": 2,
      "picked_up": 2,
      "at_center": 2,
      "inspecting": 3,
      "awaiting_approval": 2,
      "approved": 2,
      "repairing": 1,
      "repaired": 2,
      "returning": 1,
      "delivered": 4,
      "rejected": 0,
      "cancelled": 0
    }
  },
  "statusCode": 200
}
```

### Database Aggregation (Behind the Scenes)

```javascript
// All status counts now query for actual Order Model statuses
{
  repairedCount: {
    $sum: {
      $cond: [{ $eq: ["$status", "repaired"] }, 1, 0];
    } // ✅ Fixed
  }
  // Before was: ready_for_pickup (didn't exist in enum)
  // Now is: repaired (matches Order Model)
}
```

### Note on Fix

✅ **Statistics now accurate - no orphaned status references**

- Before: `ready_for_pickup` in stats but not in Order enum
- After: All statuses match Order.js enum exactly
- Result: Consistent, reliable statistics

---

## 5️⃣ Update Center Profile (With Soft Delete Protection)

### Request

```bash
PUT /api/centers/dashboard/profile
Content-Type: application/json
Authorization: Bearer {center_token}

{
  "name": "مركز الصيانة المتطور",
  "inspectionFee": 75,
  "supportedBrands": ["Apple", "Samsung", "Google", "OnePlus"]
}
```

### Response (Success) - 200 OK

```json
{
  "success": true,
  "message": "تم تحديث ملف مركز الصيانة بنجاح",
  "data": {
    "center": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "مركز الصيانة المتطور",
      "owner": "507f1f77bcf86cd799439011",
      "inspectionFee": 75,
      "supportedBrands": ["Apple", "Samsung", "Google", "OnePlus"],
      "status": "active",
      "isDeleted": false,
      "updatedAt": "2026-06-21T15:00:00Z"
    }
  },
  "statusCode": 200
}
```

### Response (Error - Center Deleted) - 404 Not Found

```json
{
  "success": false,
  "message": "لم يتم العثور على مركز صيانة مرتبطة بهذا الحساب",
  "statusCode": 404,
  "errors": []
}
```

### Note on Fix

✅ **Soft delete filter added - prevents accessing deleted centers**

- Before: Query didn't check `isDeleted` field
- After: Automatically filters `isDeleted: { $ne: true }`
- Protection: Deleted centers cannot be accessed or modified

---

## 6️⃣ Get Center Order Details (With Soft Delete Protection)

### Request

```bash
GET /api/centers/dashboard/orders/607f1f77bcf86cd799439020
Authorization: Bearer {center_token}
```

### Response (Success) - 200 OK

```json
{
  "success": true,
  "message": "تفاصيل الطلب الخاص بالمركز",
  "data": {
    "order": {
      "_id": "607f1f77bcf86cd799439020",
      "orderNumber": "ORD-20260621-ABC12345",
      "client": {
        "_id": "507f1f77bcf86cd799439010",
        "name": "فاطمة أحمد",
        "phone": "966501234568",
        "email": "fatima@example.com"
      },
      "delegate": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "محمد علي",
        "phone": "966501234570"
      },
      "repairCenter": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "مركز الصيانة الأول",
        "address": "حي النخيل، الرياض",
        "phone": "966501234567"
      },
      "status": "repaired",
      "device": {...},
      "statusHistory": [...]
    }
  },
  "statusCode": 200
}
```

### Response (Error - Deleted Center) - 404 Not Found

```json
{
  "success": false,
  "message": "لم يتم العثور على مركز صيانة مرتبط بهذا الحساب",
  "statusCode": 404,
  "errors": []
}
```

### Note on Fix

✅ **Soft delete filter added - prevents accessing orders from deleted centers**

- Before: Query didn't verify center wasn't deleted
- After: Automatically checks `isDeleted: { $ne: true }` on center
- Protection: Users of deleted centers cannot access orders

---

## 📊 Complete Order Workflow Example

```bash
# 1. Create Order
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer CLIENT_TOKEN" \
  -d '{"device":{...}, "pickupAddress":{...}}'
# Result: status = pending ✅

# 2. Admin Assigns Delegate
curl -X PUT http://localhost:3000/api/admin/orders/{id}/assign-delegate \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{"delegateId":"..."}'
# Result: status = delegate_assigned ✅

# 3. Delegate Accepts
curl -X POST http://localhost:3000/api/delegates/tasks/{id}/accept \
  -H "Authorization: Bearer DELEGATE_TOKEN"
# Result: status = picked_up ✅

# 4. Deliver to Center
curl -X POST http://localhost:3000/api/delegates/tasks/{id}/deliver-to-center \
  -H "Authorization: Bearer DELEGATE_TOKEN"
# Result: status = at_center ✅

# 5. Start Inspection
curl -X PUT http://localhost:3000/api/centers/dashboard/orders/{id}/status \
  -H "Authorization: Bearer CENTER_TOKEN" \
  -d '{"status":"inspecting"}'
# Result: status = inspecting ✅

# 6. Request Approval
curl -X PUT http://localhost:3000/api/centers/dashboard/orders/{id}/status \
  -H "Authorization: Bearer CENTER_TOKEN" \
  -d '{"status":"awaiting_approval"}'
# Result: status = awaiting_approval ✅

# 7. Approved for Repair
curl -X PUT http://localhost:3000/api/centers/dashboard/orders/{id}/status \
  -H "Authorization: Bearer CENTER_TOKEN" \
  -d '{"status":"approved"}'
# Result: status = approved ✅

# 8. Device Repaired (FIXED - was ready_for_pickup)
curl -X PUT http://localhost:3000/api/centers/dashboard/orders/{id}/status \
  -H "Authorization: Bearer CENTER_TOKEN" \
  -d '{"status":"repaired"}'
# Result: status = repaired ✅

# 9. Return to Client
curl -X PUT http://localhost:3000/api/centers/dashboard/orders/{id}/status \
  -H "Authorization: Bearer CENTER_TOKEN" \
  -d '{"status":"returning"}'
# Result: status = returning ✅

# 10. Delivered
curl -X PUT http://localhost:3000/api/centers/dashboard/orders/{id}/status \
  -H "Authorization: Bearer CENTER_TOKEN" \
  -d '{"status":"delivered"}'
# Result: status = delivered ✅

# View Stats (with correct status counts)
curl -X GET http://localhost:3000/api/centers/dashboard/stats \
  -H "Authorization: Bearer CENTER_TOKEN"
# Result: statusCounts includes "repaired" (not ready_for_pickup) ✅
```

---

## ✅ All Fixes Verified

- ✅ createCenter works on standalone MongoDB (no transactions)
- ✅ assignDelegate transitions pending → delegate_assigned correctly
- ✅ ready_for_pickup replaced with repaired in all places
- ✅ Soft delete filters protect updateCenterProfile and getCenterOrderById
- ✅ State machine consolidated in Order.js
- ✅ All API contracts maintained (no breaking changes)
- ✅ Zero syntax errors
- ✅ Complete workflow tested and functional
