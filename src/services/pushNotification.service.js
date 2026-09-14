const admin = require("firebase-admin");
const PushToken = require("../models/PushToken");
const User = require("../models/User");
const RepairCenter = require("../models/RepairCenter");

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

const getTokensForUsers = async (userIds) => {
  if (!userIds.length) {
    return [];
  }

  const registrations = await PushToken.find({
    user: { $in: userIds },
  }).select("token");

  return registrations
    .map((registration) => registration.token)
    .filter(Boolean);
};

const sendMulticast = async (messaging, tokens, title, body, data) => {
  if (!tokens.length) {
    return [];
  }

  const invalidTokens = [];
  for (const tokenBatch of chunk(tokens, 500)) {
    try {
      const response = await messaging.sendEachForMulticast({
        tokens: tokenBatch,
        notification: {
          title,
          body,
        },
        data,
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
    } catch (error) {
      console.error("Failed to send multicast push notification batch:", error);
    }
  }

  if (invalidTokens.length) {
    await PushToken.deleteMany({ token: { $in: invalidTokens } });
  }
};

const notifyDelegatesAboutNewOrder = async (order) => {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      console.warn(
        "Firebase push notification credentials are not configured.",
      );
      return;
    }

    const delegates = await User.find({
      role: "delegate",
      isActive: true,
      isDeleted: { $ne: true },
    }).select("_id");

    const delegateIds = delegates.map((delegate) => delegate._id);
    const tokens = await getTokensForUsers(delegateIds);

    if (!tokens.length) {
      return;
    }

    await sendMulticast(
      messaging,
      tokens,
      "طلب جديد",
      "يوجد طلب جديد يحتاج إلى استلامه.",
      {
        type: "new_order",
        orderId: String(order._id),
        orderNumber: String(order.orderNumber || ""),
      },
    );
  } catch (error) {
    console.error("Failed to notify delegates about a new order:", error);
  }
};

const notifyAdminsAboutNewOrder = async (order) => {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      console.warn(
        "Firebase push notification credentials are not configured.",
      );
      return;
    }

    const admins = await User.find({
      role: "admin",
      isActive: true,
      isDeleted: { $ne: true },
    }).select("_id");

    const adminIds = admins.map((adminUser) => adminUser._id);
    const tokens = await getTokensForUsers(adminIds);

    if (!tokens.length) {
      return;
    }

    await sendMulticast(
      messaging,
      tokens,
      "طلب جديد",
      `تم إنشاء طلب جديد رقم ${order.orderNumber || order._id}`,
      {
        type: "new_order_admin",
        orderId: String(order._id),
        orderNumber: String(order.orderNumber || ""),
      },
    );
  } catch (error) {
    console.error("Failed to notify admins about a new order:", error);
  }
};

const notifyCenterOwnerAboutNewOrder = async (order) => {
  try {
    if (!order?.repairCenter) {
      return;
    }

    const messaging = getMessaging();
    if (!messaging) {
      console.warn(
        "Firebase push notification credentials are not configured.",
      );
      return;
    }

    const center = await RepairCenter.findOne({
      _id: order.repairCenter,
      isDeleted: { $ne: true },
    }).select("owner");

    if (!center?.owner) {
      return;
    }

    const tokens = await getTokensForUsers([center.owner]);

    if (!tokens.length) {
      return;
    }

    await sendMulticast(
      messaging,
      tokens,
      "طلب جديد",
      "تم إنشاء طلب جديد داخل مركزك.",
      {
        type: "new_order_center",
        orderId: String(order._id),
        orderNumber: String(order.orderNumber || ""),
      },
    );
  } catch (error) {
    console.error("Failed to notify center owner about a new order:", error);
  }
};

module.exports = {
  notifyDelegatesAboutNewOrder,
  notifyAdminsAboutNewOrder,
  notifyCenterOwnerAboutNewOrder,
};
