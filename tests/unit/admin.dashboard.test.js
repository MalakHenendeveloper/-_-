const adminController = require("../../src/controllers/admin.controller");
const Order = require("../../src/models/Order");
const User = require("../../src/models/User");
const RepairCenter = require("../../src/models/RepairCenter");
const Payment = require("../../src/models/Payment");
const ApiResponse = require("../../src/utils/apiResponse");
const {
  calculateRoleFinancialSummary,
} = require("../../src/utils/dashboardFinancials");

jest.mock("../../src/models/Order", () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../../src/models/User", () => ({
  countDocuments: jest.fn(),
}));

jest.mock("../../src/models/RepairCenter", () => ({
  countDocuments: jest.fn(),
}));

jest.mock("../../src/models/Payment", () => ({
  find: jest.fn(),
  aggregate: jest.fn(),
}));

jest.mock("../../src/utils/apiResponse", () => ({
  success: jest.fn(),
}));

jest.mock("../../src/utils/dashboardFinancials", () => ({
  calculateRoleFinancialSummary: jest.fn(),
}));

describe("Admin dashboard financial breakdown", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Order.countDocuments.mockResolvedValue(2);
    User.countDocuments.mockResolvedValue(3);
    RepairCenter.countDocuments.mockResolvedValue(2);
    Payment.find.mockResolvedValue([{ amount: 100 }, { amount: 200 }]);
    Payment.aggregate.mockResolvedValue([{ total: 300 }]);
    calculateRoleFinancialSummary.mockImplementation(({ role }) => {
      if (role === "admin") return { totalAdminCommission: 120 };
      if (role === "center") return { totalRevenue: 500 };
      if (role === "delegate") return { totalEarnings: 600 };
      return {};
    });

    const orderQuery = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          _id: "order-1",
          orderNumber: "A100",
          client: { name: "Client" },
          repairCenter: { name: "Center A" },
          status: "delivered",
          createdAt: new Date(),
        },
      ]),
      lean: jest.fn().mockResolvedValue([
        {
          _id: "order-1",
          orderNumber: "A100",
          repairCenter: { _id: "center-1", name: "Center A" },
          status: "delivered",
          earnings: {
            center: { recorded: true, amount: 300 },
            admin: { recorded: true, amount: 60 },
            pickup: { recorded: true, amount: 100, delegate: "delegate-1" },
            delivery: { recorded: true, amount: 200, delegate: "delegate-2" },
          },
        },
      ]),
    };

    Order.find.mockReturnValue(orderQuery);
    ApiResponse.success.mockImplementation(() => ({}));
  });

  test("returns per-center and per-delegate breakdowns in dashboard response", async () => {
    const res = {};
    const next = jest.fn();

    await adminController.getDashboard({}, res, next);

    expect(ApiResponse.success).toHaveBeenCalledWith(
      res,
      "لوحة إحصائيات الإدارة",
      expect.objectContaining({
        financial: expect.objectContaining({
          centerBreakdown: expect.arrayContaining([
            expect.objectContaining({
              centerId: "center-1",
              revenue: 300,
            }),
          ]),
          delegateBreakdown: expect.arrayContaining([
            expect.objectContaining({
              delegateId: "delegate-1",
              earnings: 100,
            }),
            expect.objectContaining({
              delegateId: "delegate-2",
              earnings: 200,
            }),
          ]),
        }),
      }),
    );
  });
});
