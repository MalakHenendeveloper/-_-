const admin = require("firebase-admin");
const PushToken = require("../models/PushToken");
const User = require("../models/User");

const firebaseIsConfigured = () =>
  Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );

const getMessaging = () => {
  if (!firebaseIsConfigured()) {
    return null;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }

  return admin.messaging();
};

const chunk = (items, size) => {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

const notifyDelegatesAboutNewOrder = async (order) => {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      console.warn("Firebase push notification credentials are not configured.");
      return;
    }

    const delegates = await User.find({
      role: "delegate",
      isActive: true,
      isDeleted: { $ne: true },
    }).select("_id");

    const delegateIds = delegates.map((delegate) => delegate._id);
    const registrations = await PushToken.find({
      user: { $in: delegateIds },
    }).select("token");
    const tokens = registrations.map((registration) => registration.token);

    if (!tokens.length) {
      return;
    }

    const invalidTokens = [];
    for (const tokenBatch of chunk(tokens, 500)) {
      const response = await messaging.sendEachForMulticast({
        tokens: tokenBatch,
        notification: {
          title: "طلب جديد",
          body: "يوجد طلب جديد متاح للاستلام",
        },
        data: {
          type: "new_order",
          orderId: String(order._id),
          orderNumber: String(order.orderNumber || ""),
        },
        android: {
          priority: "high",
        },
      });

      response.responses.forEach((result, index) => {
        if (
          !result.success &&
          [
            "messaging/registration-token-not-registered",
            "messaging/invalid-registration-token",
          ].includes(result.error?.code)
        ) {
          invalidTokens.push(tokenBatch[index]);
        }
      });
    }

    if (invalidTokens.length) {
      await PushToken.deleteMany({ token: { $in: invalidTokens } });
    }
  } catch (error) {
    // A notification failure must never roll back an already-created order.
    console.error("Failed to notify delegates about a new order:", error);
  }
};

module.exports = { notifyDelegatesAboutNewOrder };
