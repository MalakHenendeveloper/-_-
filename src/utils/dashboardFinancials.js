function calculateRoleFinancialSummary({
  role,
  orders = [],
  subjectId = null,
} = {}) {
  const normalizedOrders = Array.isArray(orders) ? orders : [];

  const getEarning = (order, section) => {
    const earnings = order?.earnings || {};
    const sectionData = earnings?.[section] || {};
    return Number(sectionData?.recorded ? sectionData.amount || 0 : 0);
  };

  const belongsToDelegate = (order, section) => {
    if (!subjectId) return true;
    return (
      String(order?.earnings?.[section]?.delegate || "") === String(subjectId)
    );
  };

  const activeDelegateStatuses = [
    "delegate_assigned",
    "picked_up",
    "at_center",
    "inspecting",
    "awaiting_approval",
    "approved",
    "repairing",
    "repaired",
    "returning",
  ];

  if (role === "delegate") {
    const totalEarnings = normalizedOrders.reduce((sum, order) => {
      const pickup = belongsToDelegate(order, "pickup")
        ? getEarning(order, "pickup")
        : 0;
      const delivery = belongsToDelegate(order, "delivery")
        ? getEarning(order, "delivery")
        : 0;
      return sum + pickup + delivery;
    }, 0);

    return {
      totalEarnings,
      // Preferred name: this counts completed transport tasks, not repaired
      // orders. Keep completedOrdersCount for backward-compatible clients.
      completedTasksCount: normalizedOrders.filter((order) => {
        const pickupRecorded =
          belongsToDelegate(order, "pickup") &&
          Boolean(order?.earnings?.pickup?.recorded);
        const deliveryRecorded =
          belongsToDelegate(order, "delivery") &&
          Boolean(order?.earnings?.delivery?.recorded);
        return pickupRecorded || deliveryRecorded;
      }).length,
      completedOrdersCount: normalizedOrders.filter((order) => {
        const pickupRecorded =
          belongsToDelegate(order, "pickup") &&
          Boolean(order?.earnings?.pickup?.recorded);
        const deliveryRecorded =
          belongsToDelegate(order, "delivery") &&
          Boolean(order?.earnings?.delivery?.recorded);
        return pickupRecorded || deliveryRecorded;
      }).length,
      currentAssignedOrdersCount: normalizedOrders.filter((order) => {
        const pickupRecorded = Boolean(order?.earnings?.pickup?.recorded);
        const deliveryRecorded = Boolean(order?.earnings?.delivery?.recorded);
        return (
          activeDelegateStatuses.includes(order?.status) &&
          !pickupRecorded &&
          !deliveryRecorded
        );
      }).length,
      completedPickupCount: normalizedOrders.filter((order) => {
        return (
          belongsToDelegate(order, "pickup") &&
          Boolean(order?.earnings?.pickup?.recorded)
        );
      }).length,
      completedDeliveryCount: normalizedOrders.filter((order) => {
        return (
          belongsToDelegate(order, "delivery") &&
          Boolean(order?.earnings?.delivery?.recorded)
        );
      }).length,
    };
  }

  if (role === "center") {
    const totalRevenue = normalizedOrders.reduce((sum, order) => {
      return sum + getEarning(order, "center");
    }, 0);

    return {
      totalRevenue,
      completedOrdersCount: normalizedOrders.filter((order) => {
        return Boolean(order?.earnings?.center?.recorded);
      }).length,
      currentCenterOrdersCount: normalizedOrders.filter((order) => {
        return (
          activeDelegateStatuses.includes(order?.status) &&
          !order?.earnings?.center?.recorded
        );
      }).length,
    };
  }

  if (role === "admin") {
    const totalAdminCommission = normalizedOrders.reduce((sum, order) => {
      return sum + getEarning(order, "admin");
    }, 0);

    return {
      totalAdminCommission,
    };
  }

  return {
    totalEarnings: 0,
    completedTasksCount: 0,
    completedOrdersCount: 0,
    currentAssignedOrdersCount: 0,
    currentCenterOrdersCount: 0,
    completedPickupCount: 0,
    completedDeliveryCount: 0,
    totalRevenue: 0,
    totalAdminCommission: 0,
  };
}

module.exports = {
  calculateRoleFinancialSummary,
};
