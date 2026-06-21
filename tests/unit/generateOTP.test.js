const generateOTP = require("../../src/utils/generateOTP");

describe("OTP Generation", () => {
  test("should generate 6-digit OTP", () => {
    const otp = generateOTP();

    expect(otp).toBeDefined();
    expect(typeof otp).toBe("string");
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  test("should generate different OTPs on multiple calls", () => {
    const otp1 = generateOTP();
    const otp2 = generateOTP();
    const otp3 = generateOTP();

    expect(otp1).not.toBe(otp2);
    expect(otp2).not.toBe(otp3);
  });

  test("OTP should contain only numeric characters", () => {
    for (let i = 0; i < 10; i++) {
      const otp = generateOTP();
      expect(/^\d+$/.test(otp)).toBe(true);
    }
  });
});
