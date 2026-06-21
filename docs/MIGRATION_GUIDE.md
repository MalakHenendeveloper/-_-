# Migration & Upgrade Guide

## Version 1.0.0 → Version 2.0.0 Production Update

This document outlines all changes made to transition the Mobile Maintenance Platform backend to production-ready state.

---

## 🔄 Breaking Changes

### 1. Admin Center Creation Endpoint

**Old Method:**

```
POST /api/admin/centers
{
  "name": "Center Name",
  "ownerId": "existing_user_id",
  "phone": "966501234567",
  "email": "center@example.com",
  "address": "Address",
  ...
}
```

**New Method (Unified Flow):**

```
POST /api/admin/centers
{
  "ownerName": "محمد أحمد",
  "phone": "966501234567",
  "email": "center@example.com",
  "password": "Center@123456",
  "name": "Center Name",
  "address": "Address",
  "city": "Riyadh",
  "coordinates": {...},
  "supportedBrands": [...],
  "supportedDeviceTypes": [...],
  "inspectionFee": 50
}
```

**Rationale:** Simplifies center onboarding by creating both User and RepairCenter in a single transaction.

---

## ✅ Key Improvements

### Phase 1: Structural Hardening

#### 1.1 Error Handler Middleware

- **File:** `src/middleware/errorHandler.js`
- **Changes:**
  - Added `CastError` handler for invalid MongoDB ObjectIds → 400 status
  - Added `TypeError` handler for null/undefined access → 400 status
  - Added `ReferenceError` handler → 500 with dev-mode stack trace
  - Safe property access using optional chaining and nullish coalescing
  - Wrapped entire handler in try-catch to prevent crashes
  - Environment-aware logging (stack traces only in development)

**Impact:** Eliminates 500 errors from validation crashes; ensures all errors return proper JSON responses

#### 1.2 Foreign Key Validation

- **Files Modified:**
  - `src/controllers/order.controller.js` - createOrder()
  - `src/controllers/priceOffer.controller.js` - createPriceOffer()
  - `src/controllers/admin.controller.js` - assignDelegate()

**Changes:**

- RepairCenter validation on order creation with soft delete check
- Order status validation before price offer creation
- Delegate isActive check before assignment
- Order status validation using `Order.getValidTransitions()`

**Impact:** Prevents 404/500 errors from invalid foreign keys; maintains referential integrity

#### 1.3 Security & Ownership Validation

- **Files Reviewed:** order, inspection, repairCenter controllers
- **Status:** Verified - all methods include proper access control
- **Access Patterns:**
  - Clients access only their own orders
  - Delegates access assigned orders only
  - Center owners access only their center's orders
  - Admins access all resources
  - All methods return 403 Forbidden for unauthorized access

**Impact:** Prevents unauthorized data access; maintains role-based security

### Phase 2: Business Logic Enhancement

#### 2.1 Admin Center Creation Refactor

- **File:** `src/controllers/admin.controller.js` - createCenter()
- **Changes:**
  - Removed separate ownerId lookup requirement
  - Accepts ownerName, phone, email, password directly
  - Creates User (role="center") atomically with RepairCenter
  - Validates phone/email uniqueness before transaction
  - Uses MongoDB session for atomic transaction
  - Returns both user and center in response

**Impact:** Simplified operator experience; guaranteed atomic creation; reduced API calls

#### 2.2 Order Status Machine Consolidation

- **File:** `src/models/Order.js`
- **Changes:**
  - Created static method `Order.getValidTransitions(status)`
  - Single source of truth for all status transitions
  - Pre-save hook updated to use static method
  - Updated `repairCenter.controller.js` to use centralized transitions

**Impact:** Eliminated duplicated transition logic; ensures consistency across codebase

### Phase 3: Testing & Documentation

#### 3.1 Enhanced Seed Script

- **File:** `scripts/seed.js`
- **Additions:**
  - 5 Clients (expanded from 2)
  - 3 Delegates (expanded from 2)
  - 3 Repair Centers (expanded from 2)
  - 10 Orders (expanded from 2) covering all statuses
  - 3 Inspections with realistic findings
  - 3 Price Offers across different scenarios
  - All relationships properly linked

**Impact:** Comprehensive test data for full workflow testing

#### 3.2 Updated Postman Collection

- **File:** `postman_collection.json`
- **Sections:**
  - Authentication (register, login, OTP, token refresh)
  - Client Order Lifecycle (complete workflow 1-10)
  - Delegate Tasks (pickup, delivery, return)
  - Repair Center Dashboard (inspection, pricing, status updates)
  - Admin Management (center creation, user management, delegate assignment)
  - Pre-configured variables for easy testing

**Impact:** Complete API documentation and testing workflows

#### 3.3 Swagger/OpenAPI Documentation

- **File:** `docs/swagger.json`
- **Coverage:**
  - All major endpoints with request/response schemas
  - Authentication patterns
  - Role-based access security definitions
  - Error codes and status codes documented
  - Complete data model definitions

**Impact:** Standard API documentation for integration teams

### Phase 4: Code Quality

#### 4.1 Final Cleanup

- Verified no console.log debug statements
- Verified no TODO/FIXME/HACK/BUG comments
- Verified no syntax errors
- All imports properly used
- Code formatting consistent

**Impact:** Production-ready codebase

---

## 📊 Order Status Transitions

The system enforces the following status machine:

```
pending
  ├→ assigning_delegate
  │    └→ delegate_assigned
  │         └→ picked_up
  │              └→ at_center
  │                   └→ inspecting
  │                        └→ awaiting_approval
  │                             ├→ approved → repairing → repaired → returning → delivered
  │                             └→ rejected → cancelled
  ├→ cancelled
  └→ (direct from pending/assigning_delegate/delegate_assigned)
```

---

## 🔐 Security Enhancements

### Soft Delete Implementation

- **Models with soft delete:** User, RepairCenter, Inspection, PriceOffer
- **Model without soft delete:** Order (as per requirements)
- **Query pattern:** All find operations include `isDeleted: { $ne: true }` filter

### Access Control Matrix

| Resource     | Admin | Client | Delegate | Center       |
| ------------ | ----- | ------ | -------- | ------------ |
| Orders       | All   | Own    | Assigned | Own Center's |
| Inspection   | All   | Own    | Assigned | Own Center's |
| Price Offers | All   | Own    | -        | Own Center's |
| Users        | All   | Self   | Self     | Self         |
| Centers      | All   | -      | -        | Own          |

---

## 🚀 Deployment Checklist

- [ ] Database: Ensure soft delete fields exist (isDeleted, deletedAt)
- [ ] Environment: Set NODE_ENV=production
- [ ] Seeds: Run production seed with real center operators if needed
- [ ] Tests: Run full integration test suite
- [ ] Documentation: Share Postman collection and Swagger docs
- [ ] Rollback: Keep previous version accessible for 48 hours
- [ ] Monitoring: Set up error tracking and API monitoring
- [ ] Backups: Full database backup before deployment

---

## 📝 API Changes Summary

### New Endpoints

- POST `/api/admin/centers` - Unified center creation (replaces old flow)

### Modified Endpoints

- POST `/api/orders` - Now validates repairCenter if provided (400 if not found)
- POST `/api/centers/dashboard/orders/{orderId}/price-offer` - Validates order status
- PUT `/api/admin/orders/{orderId}/assign-delegate` - Validates delegate isActive and order status
- PUT `/api/centers/dashboard/orders/{orderId}/status` - Uses centralized transitions

### Unchanged Endpoints

- All client, delegate, and repair center operations remain backward compatible
- Authentication endpoints unchanged
- User profile endpoints unchanged

---

## 🔧 Configuration Requirements

### Environment Variables

```
NODE_ENV=production
MONGODB_URI=mongodb://prod-server:27017/maintenance
JWT_SECRET=your-secret-key
CLOUDINARY_URL=cloudinary://...
```

### Database Indexes

Ensure these indexes exist:

- `User: { phone: 1 }, { email: 1 }`
- `Order: { client: 1, createdAt: -1 }, { status: 1 }, { repairCenter: 1 }`
- `RepairCenter: { owner: 1 }`
- `Inspection: { order: 1 }`
- `PriceOffer: { order: 1 }`

---

## ✨ Testing Recommendations

### 1. Integration Tests

```bash
npm test
```

### 2. API Testing with Seed Data

```bash
node scripts/seed.js
# Then import postman_collection.json into Postman
```

### 3. Load Testing

- Test with 100+ concurrent orders
- Verify transaction rollback on errors
- Test cascade behavior on soft delete

### 4. Security Testing

- Verify role-based access control
- Test forbidden access scenarios
- Verify JWT expiration handling

---

## 📞 Support

For issues or questions regarding this upgrade:

1. Check the Swagger documentation at `/api-docs`
2. Review integration tests in `tests/integration/`
3. Consult the seed script for data structure examples

---

## Version History

### v2.0.0 (Current)

- Error handling hardening
- Foreign key validation
- Admin center creation refactor
- Status machine consolidation
- Enhanced testing data
- Complete API documentation

### v1.0.0

- Initial release
