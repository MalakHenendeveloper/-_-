# Push Notification Contract

This document describes the push token registration endpoints and the expected order notification flow for delegates, admins, and selected repair center owners.

## 1. Token registration endpoints

### 1.1 Delegate

#### Register token

- Method: `POST`
- URL: `/api/delegate/push-tokens`
- Auth: `Bearer <delegate_access_token>`
- Body:

```json
{
  "token": "FCM_DEVICE_TOKEN_HERE"
}
```

- Success response:

```json
{
  "success": true,
  "message": "تم تسجيل جهاز الإشعارات بنجاح",
  "data": {}
}
```

### 1.2 Center

#### Register token

- Method: `POST`
- URL: `/api/centers/push-tokens`
- Auth: `Bearer <center_access_token>`
- Body:

```json
{
  "token": "FCM_DEVICE_TOKEN_HERE"
}
```

- Success response:

```json
{
  "success": true,
  "message": "تم تسجيل جهاز الإشعارات بنجاح",
  "data": {}
}
```

### 1.3 Admin

#### Register token

- Method: `POST`
- URL: `/api/admin/push-tokens`
- Auth: `Bearer <admin_access_token>`
- Body:

```json
{
  "token": "FCM_DEVICE_TOKEN_HERE"
}
```

- Success response:

```json
{
  "success": true,
  "message": "تم تسجيل جهاز الإشعارات بنجاح",
  "data": {}
}
```

## 2. Order notification flow

When a client creates an order through the order creation endpoint, the backend saves the order and triggers notification fan-out through the shared service.

### Notification targets

1. Delegates
   - Function: `notifyDelegatesAboutNewOrder(order)`
   - Title: `طلب جديد`
   - Body: `يوجد طلب جديد يحتاج إلى استلامه.`
   - Data payload:

```json
{
  "type": "new_order",
  "orderId": "<order_id>",
  "orderNumber": "<order_number>"
}
```

2. Admins
   - Function: `notifyAdminsAboutNewOrder(order)`
   - Title: `طلب جديد`
   - Body: `تم إنشاء طلب جديد رقم <orderNumber>`
   - Data payload:

```json
{
  "type": "new_order_admin",
  "orderId": "<order_id>",
  "orderNumber": "<order_number>"
}
```

3. Selected center owner
   - Function: `notifyCenterOwnerAboutNewOrder(order)`
   - Runs only when the order contains `repairCenter`
   - Title: `طلب جديد`
   - Body: `تم إنشاء طلب جديد داخل مركزك.`
   - Data payload:

```json
{
  "type": "new_order_center",
  "orderId": "<order_id>",
  "orderNumber": "<order_number>"
}
```

## 3. Backend implementation notes

- Push tokens are stored in `PushToken` collection using the `user`, `token`, and `platform` fields.
- All role token endpoints reuse the existing delegate controller token registration/removal logic.
- The service uses Firebase Admin `sendEachForMulticast` and removes invalid tokens from the token store.
- If Firebase credentials are missing in environment variables, the service logs a warning and safely returns without sending notifications.
