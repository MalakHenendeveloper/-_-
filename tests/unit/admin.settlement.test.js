const adminController = require("../../src/controllers/admin.controller");
const Order = require("../../src/models/Order");
const ApiResponse = require("../../src/utils/apiResponse");

jest.mock("../../src/models/Order", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/utils/apiResponse", () => ({
  success: jest.fn(),
}));

describe("Admin settlement toggle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("marks a selected party as settled when admin toggles it on", async () => {
    const order = {
      _id: "order-1",
      earnings: {
        pickup: { recorded: false, amount: 0 },
        center: { recorded: false, amount: 0 },
      },
      save: jest.fn().mockResolvedValue(true),
    };

    Order.findById.mockResolvedValue(order);
    ApiResponse.success.mockImplementation(() => ({}));

    await adminController.updateOrderSettlement(
      {
        params: { orderId: "order-1" },
        body: { party: "pickup", settled: true },
        user: { id: "admin-1" },
      },
      {},
      jest.fn(),
    );

    expect(order.earnings.pickup.recorded).toBe(true);
    expect(order.earnings.pickup.recordedAt).toBeInstanceOf(Date);
    expect(order.earnings.pickup.delegate).toBeUndefined();
    expect(ApiResponse.success).toHaveBeenCalled();
  });
});
