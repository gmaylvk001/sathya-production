import mongoose from "mongoose";
import User from "@/models/User";
import { fetchExistOrdersForLiveUser } from "@/lib/fetchExistOrders";

export const BULK_FETCH_MAX_BATCH = 1000;
const CONCURRENCY = 5;

/**
 * @param {"pending"|"refetch"} mode
 * - pending: exist users not yet marked orders_fetched=1
 * - refetch: already fetched users — check again for new exist orders (existing order numbers skipped)
 */
function userBatchQuery(userType, afterId, mode = "pending") {
  const query = {
    user_type: userType,
    exist_id: { $nin: [null, ""] },
  };
  if (mode === "refetch") {
    query.orders_fetched = 1;
  } else {
    query.orders_fetched = { $ne: 1 };
  }
  if (afterId && mongoose.Types.ObjectId.isValid(afterId)) {
    query._id = { $gt: new mongoose.Types.ObjectId(afterId) };
  }
  return query;
}

/**
 * Fetches exist orders for the next `limit` (max 1000) exist users of `userType`,
 * in _id order. Call again with the returned lastId until done is true.
 *
 * mode "pending": users with orders_fetched != 1 (users with no exist orders stay unfetched).
 * mode "refetch": users already orders_fetched=1 — re-check for new exist orders.
 */
export async function bulkFetchExistOrders({
  userType,
  afterId = null,
  limit = BULK_FETCH_MAX_BATCH,
  mode = "pending",
}) {
  const fetchMode = mode === "refetch" ? "refetch" : "pending";
  const size = Math.min(Math.max(parseInt(limit, 10) || BULK_FETCH_MAX_BATCH, 1), BULK_FETCH_MAX_BATCH);
  const query = userBatchQuery(userType, afterId, fetchMode);

  const users = await User.find(query, { _id: 1 })
    .sort({ _id: 1 })
    .limit(size)
    .lean();

  const totals = {
    processed: 0,
    fetchedUsers: 0,
    noOrders: 0,
    failed: 0,
    inserted: 0,
    skipped: 0,
    paymentsLinked: 0,
    historyLinked: 0,
    cancelLinked: 0,
  };

  let index = 0;
  const worker = async () => {
    while (index < users.length) {
      const user = users[index++];
      try {
        const result = await fetchExistOrdersForLiveUser(user._id);
        totals.processed += 1;
        if (result.error) {
          if (result.status === 404) totals.noOrders += 1;
          else totals.failed += 1;
          continue;
        }
        if (result.fetched) totals.fetchedUsers += 1;
        totals.inserted += result.inserted || 0;
        totals.skipped += result.skipped || 0;
        totals.paymentsLinked += result.paymentsLinked || 0;
        totals.historyLinked += result.historyLinked || 0;
        totals.cancelLinked += result.cancelLinked || 0;
      } catch (error) {
        totals.processed += 1;
        totals.failed += 1;
        console.error(`Bulk exist orders fetch failed for user ${user._id}:`, error.message);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, users.length) }, worker));

  const lastId = users.length ? String(users[users.length - 1]._id) : afterId || null;
  const remaining = await User.countDocuments(userBatchQuery(userType, lastId, fetchMode));

  return {
    success: true,
    mode: fetchMode,
    ...totals,
    lastId,
    remaining,
    done: users.length < size || remaining === 0,
  };
}
