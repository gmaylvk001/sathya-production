import ExistSathyaUserDetail from "@/models/ExistSathyaUserDetail";

export function userIdMatchValues(value) {
  const text = String(value ?? "").trim();
  if (!text) return [];
  const values = new Set([text]);
  if (/^\d+(\.0+)?$/.test(text)) {
    const n = Math.trunc(Number(text));
    values.add(String(n));
    values.add(`${n}.0`);
    values.add(n);
  }
  return [...values];
}

export async function mapUserDetailsToLiveUser(existId, liveUserId) {
  const matchValues = userIdMatchValues(existId);
  if (!matchValues.length) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  const result = await ExistSathyaUserDetail.updateMany(
    { user_id: { $in: matchValues } },
    { $set: { live_user_id: String(liveUserId) } }
  );

  return {
    matchedCount: result.matchedCount || 0,
    modifiedCount: result.modifiedCount || 0,
  };
}

export async function mapUserDetailsForLiveUsers(liveUsers) {
  const pairs = (liveUsers || []).filter((user) => user?._id && String(user.exist_id || "").trim());
  if (!pairs.length) return 0;

  const existIdToLiveId = new Map();
  const matchValues = [];

  for (const user of pairs) {
    const keys = userIdMatchValues(user.exist_id);
    const liveId = String(user._id);
    keys.forEach((key) => {
      existIdToLiveId.set(String(key), liveId);
      matchValues.push(key);
    });
  }

  if (!matchValues.length) return 0;

  const details = await ExistSathyaUserDetail.find(
    { user_id: { $in: matchValues } },
    { _id: 1, user_id: 1 }
  ).lean();

  const ops = [];
  for (const detail of details) {
    const liveId = existIdToLiveId.get(String(detail.user_id))
      || existIdToLiveId.get(String(Math.trunc(Number(detail.user_id)) || ""));
    if (!liveId) continue;
    ops.push({
      updateOne: {
        filter: { _id: detail._id },
        update: { $set: { live_user_id: liveId } },
      },
    });
  }

  if (!ops.length) return 0;
  await ExistSathyaUserDetail.bulkWrite(ops, { ordered: false });
  return ops.length;
}

export async function getMappedLiveUserIdSet(liveUserIds) {
  const ids = [...new Set((liveUserIds || []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (!ids.length) return new Set();

  const mapped = await ExistSathyaUserDetail.distinct("live_user_id", {
    live_user_id: { $in: ids },
  });

  return new Set(mapped.map((id) => String(id)));
}
