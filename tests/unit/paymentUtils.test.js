const {
  requiresPaymentConfirmation,
  canTransitionToStatus,
} = require("../../src/utils/paymentUtils");

describe("payment utility guards", () => {
  it("requires confirmation for repair-related statuses when a fee exists", () => {
    const result = requiresPaymentConfirmation("repairing", {
      fees: { total: 100 },
      paymentStatus: "pending",
    });

    expect(result).toBe(true);
  });

  it("does not require confirmation for zero-fee orders", () => {
    const result = requiresPaymentConfirmation("repairing", {
      fees: { total: 0 },
      paymentStatus: "pending",
    });

    expect(result).toBe(false);
  });

  it("blocks transition when payment is not confirmed", () => {
    const result = canTransitionToStatus("repairing", {
      fees: { total: 100 },
      paymentStatus: "pending",
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("لا يمكن");
  });

  it("allows transition when payment is confirmed", () => {
    const result = canTransitionToStatus("repairing", {
      fees: { total: 100 },
      paymentStatus: "confirmed",
    });

    expect(result.allowed).toBe(true);
  });
});
