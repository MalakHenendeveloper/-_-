const pushNotificationService = require("../../src/services/pushNotification.service");

describe("push notification service", () => {
  test("exports all order notification functions for delegates, admins, and selected center owner", () => {
    expect(pushNotificationService).toHaveProperty(
      "notifyDelegatesAboutNewOrder",
    );
    expect(pushNotificationService).toHaveProperty("notifyAdminsAboutNewOrder");
    expect(pushNotificationService).toHaveProperty(
      "notifyCenterOwnerAboutNewOrder",
    );
    expect(pushNotificationService).toHaveProperty(
      "notifyDelegatesAboutRepairedOrder",
    );
    expect(pushNotificationService).toHaveProperty(
      "notifyClientAboutRepairedOrder",
    );
  });
});
