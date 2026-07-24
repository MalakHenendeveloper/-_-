const {
  calculateRoleFinancialSummary,
} = require("../../src/utils/dashboardFinancials");

describe("dashboard financial summary utility", () => {
  it("calculates delegate earnings from recorded pickup and delivery earnings", () => {
    const orders = [
      {
        earnings: {
          pickup: { recorded: true, amount: 500 },
          delivery: { recorded: false, amount: 0 },
        },
      },
      {
        earnings: {
          pickup: { recorded: true, amount: 500 },
          delivery: { recorded: true, amount: 500 },
        },
      },
    ];

    const result = calculateRoleFinancialSummary({ role: "delegate", orders });

    expect(result.totalEarnings).toBe(1500);
    expect(result.completedPickupCount).toBe(2);
    expect(result.completedDeliveryCount).toBe(1);
    expect(result.completedOrdersCount).toBe(2);
    expect(result.completedTasksCount).toBe(2);
    expect(result.totalTripsCount).toBe(3);
  });

  it("credits both trips to one delegate when the same delegate completes them", () => {
    const delegateId = "delegate-a";
    const result = calculateRoleFinancialSummary({
      role: "delegate",
      subjectId: delegateId,
      orders: [
        {
          earnings: {
            pickup: { recorded: true, amount: 500, delegate: delegateId },
            delivery: { recorded: true, amount: 500, delegate: delegateId },
          },
        },
      ],
    });

    expect(result.totalEarnings).toBe(1000);
    expect(result.completedPickupCount).toBe(1);
    expect(result.completedDeliveryCount).toBe(1);
    expect(result.totalTripsCount).toBe(2);
  });

  it("credits each trip only to the delegate who completed it", () => {
    const order = {
      earnings: {
        pickup: { recorded: true, amount: 500, delegate: "delegate-a" },
        delivery: { recorded: true, amount: 500, delegate: "delegate-b" },
      },
    };

    const pickupDelegate = calculateRoleFinancialSummary({
      role: "delegate",
      subjectId: "delegate-a",
      orders: [order],
    });
    const deliveryDelegate = calculateRoleFinancialSummary({
      role: "delegate",
      subjectId: "delegate-b",
      orders: [order],
    });

    expect(pickupDelegate.totalEarnings).toBe(500);
    expect(pickupDelegate.completedPickupCount).toBe(1);
    expect(pickupDelegate.completedDeliveryCount).toBe(0);
    expect(pickupDelegate.totalTripsCount).toBe(1);
    expect(deliveryDelegate.totalEarnings).toBe(500);
    expect(deliveryDelegate.completedPickupCount).toBe(0);
    expect(deliveryDelegate.completedDeliveryCount).toBe(1);
    expect(deliveryDelegate.totalTripsCount).toBe(1);
  });

  it("calculates center revenue from recorded center earnings", () => {
    const orders = [
      { earnings: { center: { recorded: true, amount: 1500 } } },
      { earnings: { center: { recorded: true, amount: 2000 } } },
    ];

    const result = calculateRoleFinancialSummary({ role: "center", orders });

    expect(result.totalRevenue).toBe(3500);
    expect(result.completedOrdersCount).toBe(2);
  });

  it("calculates admin commission from recorded admin earnings", () => {
    const orders = [
      { earnings: { admin: { recorded: true, amount: 150 } } },
      { earnings: { admin: { recorded: true, amount: 250 } } },
    ];

    const result = calculateRoleFinancialSummary({ role: "admin", orders });

    expect(result.totalAdminCommission).toBe(400);
  });
});
