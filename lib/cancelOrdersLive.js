import CancelOrders from "@/models/cancel_orders";
import CancelOrdersLive from "@/models/cancel_orders_live";

let movePromise = null;

// Cancel requests saved by the app before cancel_orders_live existed (no exist_id)
// are moved into cancel_orders_live with the same _id, so cancel_orders keeps only
// imported exist rows. Safe to run repeatedly; runs once per server process.
async function moveAppCancelsToLive() {
  const appRows = await CancelOrders.find({ exist_id: { $not: { $type: "string" } } }).lean();
  if (!appRows.length) return 0;

  const docs = appRows.map(({ exist_id, __v, ...row }) => row);
  try {
    await CancelOrdersLive.collection.insertMany(docs, { ordered: false });
  } catch (error) {
    const writeErrors = error?.writeErrors || error?.result?.result?.writeErrors || [];
    const onlyDuplicates = writeErrors.length > 0 && writeErrors.every((e) => (e.code ?? e.err?.code) === 11000);
    if (!onlyDuplicates && error?.code !== 11000) throw error;
  }

  const ids = appRows.map((row) => row._id);
  const moved = await CancelOrdersLive.find({ _id: { $in: ids } }, { _id: 1 }).lean();
  const movedIds = moved.map((row) => row._id);
  if (movedIds.length) {
    await CancelOrders.deleteMany({ _id: { $in: movedIds }, exist_id: { $not: { $type: "string" } } });
  }
  return movedIds.length;
}

export function ensureAppCancelsMoved() {
  if (!movePromise) {
    movePromise = moveAppCancelsToLive().catch((error) => {
      movePromise = null;
      console.error("Moving app cancel requests to cancel_orders_live failed:", error.message);
      return 0;
    });
  }
  return movePromise;
}
