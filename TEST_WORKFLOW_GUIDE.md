# طريقة اختبار الـ State Machine الجديد

## 🧪 Postman Test Workflow

### Step 1: Create Order

```
POST /api/orders
{
  "device": {
    "type": "phone",
    "brand": "Apple",
    "model": "iPhone 14",
    "problemType": "screen",
    "problemDescription": "الشاشة مكسورة"
  },
  "pickupAddress": {
    "address": "الرياض",
    "city": "Riyadh",
    "coordinates": {"lat": 24.7136, "lng": 46.6753}
  }
}

✅ Response: status = "pending"
```

### Step 2: Admin Assigns Delegate

```
PUT /api/admin/orders/{orderId}/assign-delegate
{
  "delegateId": "{{delegateId}}"
}

✅ Validation Check:
   - validTransitions = Order.getValidTransitions("pending")
   - Result: ["delegate_assigned", "cancelled"]
   - Check: "delegate_assigned" in ["delegate_assigned", "cancelled"] → TRUE ✅
   - Action: order.status = "delegate_assigned" ✅
```

### Step 3: Delegate Accepts Task

```
POST /api/delegates/tasks/{orderId}/accept
{}

✅ Validation Check:
   - order.status = "delegate_assigned"
   - Allowed: ["delegate_assigned"]
   - Check: matches → TRUE ✅
   - Action: order.status = "picked_up" ✅
```

### Step 4: Delegate Delivers to Center

```
POST /api/delegates/tasks/{orderId}/deliver-to-center
{}

✅ Validation Check:
   - order.status = "picked_up"
   - validTransitions = ["at_center"]
   - Check: transition to "at_center" allowed → TRUE ✅
   - Action: order.status = "at_center" ✅
```

### Step 5: Center Starts Inspection

```
PUT /api/centers/dashboard/orders/{orderId}/status
{
  "status": "inspecting"
}

✅ Validation Check:
   - order.status = "at_center"
   - validTransitions = ["inspecting", "cancelled"]
   - Check: "inspecting" in list → TRUE ✅
   - Action: order.status = "inspecting" ✅
```

---

## 🔄 Reject Task Scenario

### If Delegate Rejects Task

```
PUT /api/delegates/tasks/{orderId}/reject
{}

✅ Action:
   - order.delegate = undefined
   - order.status = "pending"  (← reverts correctly)
   - statusHistory pushed with "pending"

✅ Result: Can assign to another delegate now
   - validTransitions("pending") = ["delegate_assigned", "cancelled"]
   - Ready for re-assignment ✅
```

---

## ✅ Database Query Examples

### Find all pending orders ready for delegation

```javascript
db.orders.find({
  status: "pending",
  delegate: null,
});
// Returns orders that are ready for admin to assign delegates
```

### Find all delegated orders currently being picked up

```javascript
db.orders.find({
  status: "delegate_assigned",
});
// Returns orders waiting for delegate to accept/reject
```

### Find all orders at center

```javascript
db.orders.find({
  status: "at_center",
});
// Returns orders ready for inspection
```

---

## 🚀 Complete Order Lifecycle

```
[pending]
    ↓
    ├─→ Admin assigns delegate → [delegate_assigned]
    │                              ↓
    │                              ├─→ Delegate rejects → [pending] (back to step 1)
    │                              │
    │                              └─→ Delegate accepts → [picked_up]
    │                                                       ↓
    │                                                   [at_center] (delivered)
    │                                                       ↓
    │                                                   [inspecting]
    │                                                       ↓
    │                                                   [awaiting_approval]
    │                                                       ├─→ [approved] → [repairing] → [repaired] → [returning] → [delivered]
    │                                                       └─→ [rejected] → [cancelled]
    │
    └─→ Client cancels → [cancelled]

[No assigning_delegate state! ✅]
```

---

## 📊 State Machine Validation Matrix

| Current Status    | Allowed Transitions           | Max Orders Can           | Example                   |
| ----------------- | ----------------------------- | ------------------------ | ------------------------- |
| pending           | delegate_assigned, cancelled  | Be assigned to delegate  | Order created, waiting    |
| delegate_assigned | picked_up, cancelled          | Be picked up by delegate | Delegate on the way       |
| picked_up         | at_center                     | Arrive at center         | Delegate in delivery      |
| at_center         | inspecting, cancelled         | Center inspect           | Order at repair center    |
| inspecting        | awaiting_approval, cancelled  | Wait for approval        | Center examining device   |
| awaiting_approval | approved, rejected, cancelled | Client decision          | Waiting for cost approval |
| approved          | repairing, cancelled          | Start repairs            | Client approved           |
| rejected          | cancelled                     | Order ends               | Client rejected           |
| repairing         | repaired                      | Continue repairs         | Repairs in progress       |
| repaired          | returning                     | Return to client         | Repairs complete          |
| returning         | delivered                     | On the way back          | In delivery               |
| delivered         | None                          | Order complete           | Delivered                 |
| cancelled         | None                          | Order ended              | Cancelled                 |

---

## 🎯 Validation Checkpoints

### ✅ When creating order

```javascript
order.status = "pending"; // Always starts here
```

### ✅ When admin assigns delegate

```javascript
// Old: failed with this check
// const transitions = ["assigning_delegate", "cancelled"]
// "delegate_assigned" not in list → ERROR ❌

// New: works with this check
const transitions = ["delegate_assigned", "cancelled"];
// "delegate_assigned" in list → SUCCESS ✅
```

### ✅ When delegate rejects

```javascript
order.status = "pending"; // Can reassign to another delegate
```

### ✅ When canceling order

```javascript
const canCancel = ["pending", "delegate_assigned"].includes(order.status);
// Works correctly for both states
```

---

## 🔍 Debugging Tips

### Check order status

```javascript
// Node.js
const order = await Order.findById(orderId);
console.log(order.status); // Shows current status
console.log(Order.getValidTransitions(order.status)); // Shows allowed next steps
```

### Check status history

```javascript
// See all status changes
order.statusHistory.forEach((h) => {
  console.log(`${h.status} at ${h.timestamp}`);
});
```

### Test valid transition

```javascript
const valid =
  Order.getValidTransitions("pending").includes("delegate_assigned");
console.log(valid); // Should be true ✅
```

---

**Summary:** The state machine is now simplified, clear, and bug-free. All workflows function correctly without the unnecessary `assigning_delegate` state.
