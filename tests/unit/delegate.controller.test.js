const delegateController = require("../../src/controllers/delegate.controller");
const Order = require("../../src/models/Order");
const ApiResponse = require("../../src/utils/apiResponse");
const { getDelegateTripFee } = require("../../src/utils/delegateFees");

jest.mock("../../src/models/Order", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/utils/apiResponse", () => ({
  success: jest.fn(),
}));

jest.mock("../../src/utils/delegateFees", () => ({
  getDelegateTripFee: jest.fn(),
}));

describe("Delegate available orders controller", () => {
  const res = {};
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn().mockReturnThis();
  });

  test("includes the configured delegate fee in available pickup orders response", async () => {
    const orders = [{ _id: "order-1" }];
    const query = {
      populate: jest.fn().mockReturnThis({
        sort: jest.fn().mockResolvedValue(orders),
      }),
    };

    Order.find.mockReturnValue(query);
    getDelegateTripFee.mockResolvedValue(25);
    ApiResponse.success.mockImplementation(() => ({}));

    await delegateController.getAvailablePickupOrders({}, res, next);

    expect(ApiResponse.success).toHaveBeenCalledWith(
      res,
      "الطلبات المتاحة للاستلام",
      expect.objectContaining({
        orders,
        delegateFeeValue: 25,
      }),
    );
  });

  test("includes the configured delegate fee in available delivery orders response", async () => {
    const orders = [{ _id: "order-2" }];
    const query = {
      populate: jest.fn().mockReturnThis({
        sort: jest.fn().mockResolvedValue(orders),
      }),
    };

    Order.find.mockReturnValue(query);
    getDelegateTripFee.mockResolvedValue(35);
    ApiResponse.success.mockImplementation(() => ({}));

    await delegateController.getAvailableDeliveryOrders({}, res, next);

    expect(ApiResponse.success).toHaveBeenCalledWith(
      res,
      "الطلبات الجاهزة للتوصيل",
      expect.objectContaining({
        orders,
        delegateFeeValue: 35,
      }),
    );
  });
});
