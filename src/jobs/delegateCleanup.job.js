const cron = require("node-cron");
const DelegateApplication = require("../models/DelegateApplication");
// Every day at 12:00 AM
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("Running Delegate Cleanup Job...");

    const sevenDaysAgo = new Date();

    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await DelegateApplication.deleteMany({
      status: "rejected",
      rejectedAt: {
        $lte: sevenDaysAgo,
      },
    });

    console.log(
      `Deleted ${result.deletedCount} rejected delegate applications.`,
    );
  } catch (err) {
    console.error("Delegate Cleanup Job Error:", err);
  }
});
