async function calculateFinancials({
  repairAmount = 0,
  inspectionFee = 0,
  deliveryFee = 0,
  settings = null,
} = {}) {
  const normalizedSettings = {
    currency: settings?.currency || "IQD",
    commissionType: settings?.commissionType || "percentage",
    commissionValue: Number(settings?.commissionValue ?? 0),
    delegateFeeType: settings?.delegateFeeType || "fixed",
    delegateFeeValue: Number(settings?.delegateFeeValue ?? 0),
  };

  const repair = Number(Number(repairAmount || 0).toFixed(2));
  const inspection = Number(Number(inspectionFee || 0).toFixed(2));
  const delivery = Number(Number(deliveryFee || 0).toFixed(2));
  const clientTotal = Number((repair + inspection + delivery).toFixed(2));

  let adminCommission = 0;
  if (normalizedSettings.commissionType === "percentage") {
    adminCommission = Number(
      ((clientTotal * normalizedSettings.commissionValue) / 100).toFixed(2),
    );
  } else {
    adminCommission = Number(normalizedSettings.commissionValue.toFixed(2));
  }

  let delegateFee = 0;
  if (normalizedSettings.delegateFeeType === "percentage") {
    delegateFee = Number(
      ((delivery * normalizedSettings.delegateFeeValue) / 100).toFixed(2),
    );
  } else {
    delegateFee = Number(normalizedSettings.delegateFeeValue.toFixed(2));
  }

  const centerAmount = Number(
    (clientTotal - adminCommission - delegateFee).toFixed(2),
  );

  return {
    repairAmount: repair,
    inspectionFee: inspection,
    deliveryFee: delivery,
    clientTotal,
    adminCommission,
    delegateFee,
    centerAmount,
    currency: normalizedSettings.currency,
  };
}

async function buildFinancialViewForRole({
  role,
  order,
  payment,
  settings = null,
  settlements = [],
} = {}) {
  const financials = order?.financialSnapshot ||
    (await calculateFinancials({
      repairAmount: order?.fees?.repair || 0,
      inspectionFee: order?.fees?.inspection || 0,
      deliveryFee: order?.fees?.delivery || 0,
      settings,
    }));

  const paymentDetails = payment
    ? {
        amount: payment.amount,
        status: payment.status,
        senderWalletNumber: payment.senderWalletNumber,
        transferReference: payment.transferReference,
        screenshot: payment.screenshot,
        notes: payment.notes,
      }
    : null;

  const walletInfo = settings
    ? {
        walletOwnerName: settings.walletOwnerName || "",
        walletNumber: settings.walletNumber || "",
        paymentInstructions: settings.paymentInstructions || "",
      }
    : null;

  if (role === "client") {
    return {
      clientTotal: financials.clientTotal,
      paymentStatus: order?.paymentStatus || "unpaid",
      currency: financials.currency,
      walletInfo,
      paymentDetails,
    };
  }

  if (role === "center") {
    return {
      repairIncome: financials.repairAmount,
      paymentStatus: order?.paymentStatus || "unpaid",
      currency: financials.currency,
      paymentDetails,
    };
  }

  if (role === "delegate") {
    return {
      deliveryFee: financials.deliveryFee,
      paymentStatus: order?.paymentStatus || "unpaid",
      currency: financials.currency,
      paymentDetails,
    };
  }

  return {
    repairAmount: financials.repairAmount,
    inspectionFee: financials.inspectionFee,
    deliveryFee: financials.deliveryFee,
    clientTotal: financials.clientTotal,
    adminCommission: financials.adminCommission,
    delegateFee: financials.delegateFee,
    centerAmount: financials.centerAmount,
    currency: financials.currency,
    paymentStatus: order?.paymentStatus || "unpaid",
    paymentDetails,
    settlements,
  };
}

module.exports = {
  calculateFinancials,
  buildFinancialViewForRole,
};
