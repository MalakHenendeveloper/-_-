async function calculateFinancials({
  totalRepairCost = 0,
  pickupFee = 0,
  deliveryFee = 0,
  adminCommission = 0,
} = {}) {
  const repair = Number(Number(totalRepairCost || 0).toFixed(2));
  const pickup = Number(Number(pickupFee || 0).toFixed(2));
  const delivery = Number(Number(deliveryFee || 0).toFixed(2));
  const admin = Number(Number(adminCommission || 0).toFixed(2));

  const clientTotal = Number((repair + pickup + delivery + admin).toFixed(2));

  return {
    totalRepairCost: repair,
    pickupFeeAmount: pickup,
    deliveryFeeAmount: delivery,
    adminCommissionAmount: admin,
    clientTotal,
    currency: "IQD",
  };
}

async function buildFinancialSnapshot(order = {}) {
  const financials = await calculateFinancials({
    totalRepairCost:
      order?.fees?.totalRepairCost || order?.fees?.repair || 0,
    pickupFee: order?.fees?.pickupFee || 0,
    deliveryFee: order?.fees?.deliveryFee || order?.fees?.delivery || 0,
    adminCommission: order?.fees?.adminCommission || 0,
  });

  return {
    repairAmount: financials.totalRepairCost,
    inspectionFee: order?.fees?.inspection || 0,
    deliveryFee: financials.deliveryFeeAmount,
    clientTotal: financials.clientTotal,
    adminCommission: financials.adminCommissionAmount,
    delegateFee: financials.pickupFeeAmount,
    centerAmount: financials.totalRepairCost,
    currency: financials.currency,
  };
}

function hasValidFinancialSnapshot(order = {}) {
  const snapshot = order?.financialSnapshot;
  if (!snapshot) return false;

  const repairAmount = Number(
    order?.fees?.totalRepairCost || order?.fees?.repair || 0,
  );
  const pickupFee = Number(order?.fees?.pickupFee || 0);
  const deliveryFee = Number(
    order?.fees?.deliveryFee || order?.fees?.delivery || 0,
  );
  const adminCommission = Number(order?.fees?.adminCommission || 0);
  const clientTotal = repairAmount + pickupFee + deliveryFee + adminCommission;

  return (
    Number(snapshot.repairAmount) === repairAmount &&
    Number(snapshot.centerAmount) === repairAmount &&
    Number(snapshot.deliveryFee) === deliveryFee &&
    Number(snapshot.delegateFee) === pickupFee &&
    Number(snapshot.adminCommission) === adminCommission &&
    Number(snapshot.clientTotal) === clientTotal
  );
}

async function buildFinancialViewForRole({
  role,
  order,
  payment,
  settings = null,
} = {}) {
  // Extract fees from order or Settings
  const totalRepairCost = order?.fees?.totalRepairCost || 0;
  const pickupFee = order?.fees?.pickupFee || settings?.delegateFeeValue || 0;
  const deliveryFee =
    order?.fees?.deliveryFee || settings?.delegateFeeValue || 0;
  const adminCommission = order?.fees?.adminCommission || 0;

  const financials = await calculateFinancials({
    totalRepairCost,
    pickupFee,
    deliveryFee,
    adminCommission,
  });

  const paymentDetails = payment
    ? {
        amount: payment.amount,
        status: payment.status,
        senderWalletNumber: payment.senderWalletNumber,
        screenshot: payment.screenshot,
        notes: payment.notes,
      }
    : null;

  const walletInfo = settings
    ? {
        walletOwnerName: settings.walletOwnerName || "",
        walletNumbers: settings.walletNumbers
          ? Object.fromEntries(settings.walletNumbers)
          : {},
        paymentInstructions: settings.paymentInstructions || "",
      }
    : null;

  if (role === "client") {
    return {
      orderTotal: financials.clientTotal,
      breakdown: {
        repairCost: financials.totalRepairCost,
        pickupFee: financials.pickupFeeAmount,
        deliveryFee: financials.deliveryFeeAmount,
        adminFee: financials.adminCommissionAmount,
      },
      payments: [
        {
          stage: "pickup",
          description: "تكلفة استلام الجهاز",
          amount: financials.pickupFeeAmount,
        },
        {
          stage: "delivery",
          description: "تكلفة توصيل الجهاز",
          amount: financials.deliveryFeeAmount,
        },
      ],
      paymentStatus: order?.paymentStatus || "unpaid",
      currency: financials.currency,
      walletInfo,
      paymentDetails,
    };
  }

  if (role === "center") {
    return {
      repairCost: financials.totalRepairCost,
      paymentStatus: order?.paymentStatus || "unpaid",
      currency: financials.currency,
      paymentDetails,
    };
  }

  if (role === "delegate") {
    return {
      pickupFee: order?.earnings?.pickup?.recorded
        ? order.earnings.pickup.amount || 0
        : 0,
      deliveryFee: order?.earnings?.delivery?.recorded
        ? order.earnings.delivery.amount || 0
        : 0,
      paymentStatus: order?.paymentStatus || "unpaid",
      currency: financials.currency,
      paymentDetails,
    };
  }

  // Admin view - complete details
  return {
    orderTotal: financials.clientTotal,
    centerAmount: financials.totalRepairCost,
    pickupDelegateAmount: financials.pickupFeeAmount,
    deliveryDelegateAmount: financials.deliveryFeeAmount,
    adminCommissionAmount: financials.adminCommissionAmount,
    detailedBreakdown: {
      repairCost: financials.totalRepairCost,
      pickupFee: financials.pickupFeeAmount,
      deliveryFee: financials.deliveryFeeAmount,
      adminFee: financials.adminCommissionAmount,
    },
    paymentStatus: order?.paymentStatus || "unpaid",
    paymentDetails,
    currency: financials.currency,
  };
}

module.exports = {
  calculateFinancials,
  buildFinancialSnapshot,
  hasValidFinancialSnapshot,
  buildFinancialViewForRole,
};
