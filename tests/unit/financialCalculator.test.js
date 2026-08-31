const {
  calculateFinancials,
  buildFinancialSnapshot,
  hasValidFinancialSnapshot,
} = require("../../src/utils/financialCalculator");

describe("financial calculator utility", () => {
  it("calculates the client total from approved order fees", async () => {
    const result = await calculateFinancials({
      totalRepairCost: 1000,
      pickupFee: 500,
      deliveryFee: 500,
      adminCommission: 100,
    });

    expect(result).toEqual({
      totalRepairCost: 1000,
      pickupFeeAmount: 500,
      deliveryFeeAmount: 500,
      adminCommissionAmount: 100,
      subtotal: 2100,
      discountAmount: 0,
      clientTotal: 2100,
      currency: "IQD",
    });
  });

  it("builds a center and admin snapshot from the approved quotation", async () => {
    const order = {
      fees: {
        inspection: 0,
        totalRepairCost: 1000,
        pickupFee: 500,
        deliveryFee: 500,
        adminCommission: 100,
      },
    };

    const snapshot = await buildFinancialSnapshot(order);

    expect(snapshot.centerAmount).toBe(1000);
    expect(snapshot.adminCommission).toBe(100);
    expect(snapshot.clientTotal).toBe(2100);
    expect(hasValidFinancialSnapshot({ ...order, financialSnapshot: snapshot })).toBe(
      true,
    );
  });

  it("rejects the zero-valued default snapshot when order fees are non-zero", () => {
    expect(
      hasValidFinancialSnapshot({
        fees: {
          totalRepairCost: 1000,
          pickupFee: 500,
          deliveryFee: 500,
          adminCommission: 100,
        },
        financialSnapshot: {
          repairAmount: 0,
          centerAmount: 0,
          deliveryFee: 0,
          delegateFee: 0,
          adminCommission: 0,
          clientTotal: 0,
        },
      }),
    ).toBe(false);
  });

  it("applies the order coupon only to the client total", async () => {
    const order = {
      fees: { totalRepairCost: 1000, pickupFee: 500, deliveryFee: 500, adminCommission: 100 },
      coupon: { discountAmount: 300 },
    };
    const snapshot = await buildFinancialSnapshot(order);
    expect(snapshot.subtotal).toBe(2100);
    expect(snapshot.discountAmount).toBe(300);
    expect(snapshot.clientTotal).toBe(1800);
    expect(snapshot.centerAmount).toBe(1000);
    expect(hasValidFinancialSnapshot({ ...order, financialSnapshot: snapshot })).toBe(true);
  });
});
