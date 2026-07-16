const { calculateFinancials } = require("../../src/utils/financialCalculator");

describe("financial calculator utility", () => {
  it("calculates percentage commission and fixed delegate fee", async () => {
    const result = await calculateFinancials({
      repairAmount: 1000,
      inspectionFee: 100,
      deliveryFee: 200,
      settings: {
        currency: "IQD",
        commissionType: "percentage",
        commissionValue: 10,
        delegateFeeType: "fixed",
        delegateFeeValue: 50,
      },
    });

    expect(result.repairAmount).toBe(1000);
    expect(result.inspectionFee).toBe(100);
    expect(result.deliveryFee).toBe(200);
    expect(result.clientTotal).toBe(1300);
    expect(result.adminCommission).toBe(130);
    expect(result.delegateFee).toBe(50);
    expect(result.centerAmount).toBe(1120);
    expect(result.currency).toBe("IQD");
  });

  it("supports fixed commission and percentage delegate fee", async () => {
    const result = await calculateFinancials({
      repairAmount: 800,
      inspectionFee: 0,
      deliveryFee: 100,
      settings: {
        currency: "USD",
        commissionType: "fixed",
        commissionValue: 25,
        delegateFeeType: "percentage",
        delegateFeeValue: 10,
      },
    });

    expect(result.clientTotal).toBe(900);
    expect(result.adminCommission).toBe(25);
    expect(result.delegateFee).toBe(10);
    expect(result.centerAmount).toBe(865);
    expect(result.currency).toBe("USD");
  });
});
