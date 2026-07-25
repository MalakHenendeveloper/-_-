const repairCenterController = require("../../src/controllers/repairCenter.controller");
const Order = require("../../src/models/Order");
const RepairCenter = require("../../src/models/RepairCenter");
const ApiResponse = require("../../src/utils/apiResponse");

jest.mock("../../src/models/Order", () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../../src/models/RepairCenter", () => ({
  findOne: jest.fn(),
}));

jest.mock("../../src/models/SystemSetting", () => ({
  findOne: jest.fn(),
}));

jest.mock("../../src/utils/apiResponse", () => ({
  success: jest.fn(),
}));

jest.mock("../../src/utils/financialCalculator", () => ({
  buildFinancialViewForRole: jest.fn(),
}));

jest.mock("../../src/utils/dashboardFinancials", () => ({
  calculateRoleFinancialSummary: jest.fn(),
}));

describe("Repair center order payload", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    RepairCenter.findOne.mockResolvedValue({
      _id: "center-1",
      owner: "user-1",
    });
    Order.countDocuments.mockResolvedValue(1);

    const orderQuery = {
      populate: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([
        {
          _id: "order-1",
          orderNumber: "ORD-001",
          status: "picked_up",
          createdAt: new Date("2024-01-01T00:00:00.000Z"),
          updatedAt: new Date("2024-01-02T00:00:00.000Z"),
          client: { name: "Ahmed", phone: "123456", email: "ahmed@test.com" },
          delegate: { name: "Delegate One", phone: "111111" },
          pickupDelegate: { name: "Pickup Delegate", phone: "222222" },
          deliveryDelegate: { name: "Delivery Delegate", phone: "333333" },
          repairCenter: { name: "Center A" },
          device: {
            type: "phone",
            brand: "Apple",
            model: "iPhone 14",
            problemType: "screen",
            problemDescription: "Broken screen",
          },
          pickupAddress: { address: "Main Street" },
          paymentStatus: "confirmed",
        },
      ]),
    };

    Order.find.mockReturnValue(orderQuery);
    ApiResponse.success.mockImplementation(() => ({}));
  });

  test("returns enriched order data for the center dashboard", async () => {
    const req = { query: { page: "1", limit: "10" }, user: { id: "user-1" } };
    const res = {};
    const next = jest.fn();

    await repairCenterController.getCenterOrders(req, res, next);

    expect(ApiResponse.success).toHaveBeenCalledWith(
      res,
      "طلبات مركز الصيانة",
      expect.objectContaining({
        orders: expect.arrayContaining([
          expect.objectContaining({
            clientName: "Ahmed",
            pickupDelegateName: "Pickup Delegate",
            deliveryDelegateName: "Delivery Delegate",
            paymentStatus: "confirmed",
          }),
        ]),
      }),
      200,
      expect.any(Object),
    );
  });
});
