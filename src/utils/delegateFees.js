const SystemSetting = require("../models/SystemSetting");

/**
 * A delegate fee is the fixed price for one completed transport trip.
 * It is intentionally independent from repair pricing and quotations.
 */
async function getDelegateTripFee({ settings } = {}) {
  const activeSettings =
    settings || (await SystemSetting.findOne({ key: "default" }));

  return Number(activeSettings?.delegateFeeValue || 0);
}

module.exports = {
  getDelegateTripFee,
};
