const PAYMENT_REQUIRED_STATUSES = [
  "repairing",
  "repaired",
  "returning",
  "delivered",
];

function requiresPaymentConfirmation(status, order) {
  const totalFee = Number(order?.fees?.total || 0);
  return PAYMENT_REQUIRED_STATUSES.includes(status) && totalFee > 0;
}

function canTransitionToStatus(status, order) {
  if (!requiresPaymentConfirmation(status, order)) {
    return { allowed: true };
  }

  if (order?.paymentStatus === "confirmed") {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "لا يمكن بدء الإصلاح أو التسليم قبل تأكيد الدفع",
  };
}

module.exports = {
  PAYMENT_REQUIRED_STATUSES,
  requiresPaymentConfirmation,
  canTransitionToStatus,
};
