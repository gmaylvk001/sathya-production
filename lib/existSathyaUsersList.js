import ExistSathyaUser, { ensureExistSathyaUserIndexes } from "@/models/ExistSathyaUser";
import User from "@/models/User";

export const EMPTY_ROLE = "__empty__";

const CACHE_TTL_MS = 30 * 1000;

// Lives on globalThis so dev hot-reloads share one cache.
const state = globalThis.__existSathyaUsersListState ?? (globalThis.__existSathyaUsersListState = {
  generation: 0,
  entries: new Map(),
  indexesReady: null,
});

function toKey(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function normalizeExistId(value) {
  const text = toKey(value);
  if (!text) return "";
  if (/^\d+(\.0+)?$/.test(text)) {
    return String(Math.trunc(Number(text)));
  }
  return text;
}

export function invalidateExistUsersCache() {
  state.generation += 1;
  state.entries.clear();
}

async function cached(key, loader) {
  const entry = state.entries.get(key);
  if (entry?.hasValue && Date.now() - entry.at < CACHE_TTL_MS) return entry.value;
  if (entry?.promise) return entry.promise;

  const generation = state.generation;
  const promise = loader().then(
    (value) => {
      if (generation === state.generation) {
        state.entries.set(key, { hasValue: true, value, at: Date.now() });
      }
      return value;
    },
    (error) => {
      if (state.entries.get(key)?.promise === promise) state.entries.delete(key);
      throw error;
    }
  );
  state.entries.set(key, { promise });
  return promise;
}

export function ensureExistUsersIndexesOnce() {
  if (!state.indexesReady) {
    state.indexesReady = ensureExistSathyaUserIndexes().catch((error) => {
      console.error("Exist sathya users index sync:", error?.message);
    });
  }
  return state.indexesReady;
}

// Live-user keys. Same "moved" rules as before: every live user counts.
// The live user table is small compared with exist users, so this is cheap.
export function getLiveSets() {
  return cached("liveSets", async () => {
    const existIds = new Set();
    const emails = new Set();
    const mobiles = new Set();
    const liveUsers = await User.find({}, { exist_id: 1, email: 1, mobile: 1 }).lean();
    for (const live of liveUsers) {
      const existId = normalizeExistId(live.exist_id);
      if (existId) existIds.add(existId);
      const email = toKey(live.email).toLowerCase();
      if (email) emails.add(email);
      const mobile = toKey(live.mobile);
      if (mobile) mobiles.add(mobile);
    }
    return { existIds, emails, mobiles };
  });
}

// JS version, used to set is_moved on the rows of a returned page.
export function isRowMoved(row, sets) {
  const existId = normalizeExistId(row.exist_id);
  if (existId) return sets.existIds.has(existId);
  const email = toKey(row.email).toLowerCase();
  if (email && sets.emails.has(email)) return true;
  const phone = toKey(row.phone);
  return Boolean(phone && sets.mobiles.has(phone));
}

// ---------- Database-side "moved" evaluation ----------
// Used for whole-table counts and the move-status filter, so exist rows never
// have to be streamed into Node. Mirrors isRowMoved above.

// Live exist ids may be stored as "123" or "123.0"; match both forms.
function existIdVariants(sets) {
  return [...sets.existIds].flatMap((id) => [id, `${id}.0`]);
}

const KEY_FIELDS_STAGE = {
  $addFields: {
    __ex: { $trim: { input: { $ifNull: [{ $toString: "$exist_id" }, ""] } } },
    __em: { $toLower: { $trim: { input: { $ifNull: ["$email", ""] } } } },
    __ph: { $trim: { input: { $ifNull: ["$phone", ""] } } },
    __role: { $trim: { input: { $ifNull: [{ $toString: "$role_id" }, ""] } } },
  },
};

function movedStage(sets) {
  return {
    $addFields: {
      __moved: {
        $cond: [
          { $ne: ["$__ex", ""] },
          { $in: ["$__ex", existIdVariants(sets)] },
          {
            $or: [
              { $in: ["$__em", [...sets.emails]] },
              { $in: ["$__ph", [...sets.mobiles]] },
            ],
          },
        ],
      },
    },
  };
}

const HELPER_FIELDS = { __ex: 0, __em: 0, __ph: 0, __role: 0, __moved: 0 };

// Whole-table counts, grouped by role. Cached briefly and dropped on writes.
export function getSummary() {
  return cached("summary", async () => {
    const sets = await getLiveSets();
    const groups = await ExistSathyaUser.aggregate([
      KEY_FIELDS_STAGE,
      movedStage(sets),
      {
        $group: {
          _id: "$__role",
          total: { $sum: 1 },
          moved: { $sum: { $cond: ["$__moved", 1, 0] } },
        },
      },
    ]).allowDiskUse(true);

    const roleSet = new Set();
    const notMovedByRole = {};
    let total = 0;
    let moved = 0;

    for (const group of groups) {
      const roleKey = group._id || EMPTY_ROLE;
      total += group.total;
      moved += group.moved;
      if (group._id) roleSet.add(group._id);
      const notMovedInGroup = group.total - group.moved;
      if (notMovedInGroup > 0) {
        notMovedByRole[roleKey] = (notMovedByRole[roleKey] || 0) + notMovedInGroup;
      }
    }

    return {
      total,
      moved,
      notMoved: total - moved,
      roleOptions: [...roleSet].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      notMovedByRole,
    };
  });
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseListParams(searchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
  const moveRaw = searchParams.get("move");
  const move = moveRaw === "moved" || moveRaw === "unmoved" ? moveRaw : "";
  const q = toKey(searchParams.get("q"));
  const role = toKey(searchParams.get("role"));
  const start = parseDate(searchParams.get("start"));
  const end = parseDate(searchParams.get("end"));
  return { page, limit, move, q, role, start, end };
}

// Mongo filter for search / role / date.
export function buildListFilter({ q, role, start, end }) {
  const and = [];

  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    and.push({
      $or: [
        { exist_id: rx },
        { first_name: rx },
        { last_name: rx },
        { email: rx },
        { phone: rx },
      ],
    });
  }

  if (role === EMPTY_ROLE) {
    and.push({
      $or: [
        { role_id: null },
        { role_id: { $exists: false } },
        { role_id: { $regex: /^\s*$/ } },
      ],
    });
  } else if (role) {
    and.push({ role_id: role });
  }

  if (start && end) {
    and.push({ created_at: { $gte: start, $lte: end } });
  }

  return and.length ? { $and: and } : {};
}

export const LIST_SORT = { created_at: -1, _id: -1 };
export const LIST_PROJECTION = "-remember_token -confirmation_code";

// Move-status filter: match, evaluate moved on the server, then sort/skip/limit
// there and return only the requested page plus the total.
export async function findMoveFilteredPage({ filter, move, sets, page, limit }) {
  const wantMoved = move === "moved";
  const [result] = await ExistSathyaUser.aggregate([
    { $match: filter },
    KEY_FIELDS_STAGE,
    movedStage(sets),
    { $match: { __moved: wantMoved } },
    {
      $facet: {
        total: [{ $count: "n" }],
        rows: [
          { $sort: LIST_SORT },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          { $project: { ...HELPER_FIELDS, remember_token: 0, confirmation_code: 0 } },
        ],
      },
    },
  ]).allowDiskUse(true);

  return {
    total: result?.total?.[0]?.n || 0,
    rows: result?.rows || [],
  };
}

// Ids of the not-moved rows inside a page range (same order and filters as the list).
// fromRow is zero-based; rowCount is how many list rows the page range covers.
export async function findRangeMovableIds({ filter, move, sets, fromRow, rowCount }) {
  if (move === "moved") return [];

  if (move === "unmoved") {
    const rows = await ExistSathyaUser.aggregate([
      { $match: filter },
      KEY_FIELDS_STAGE,
      movedStage(sets),
      { $match: { __moved: false } },
      { $sort: LIST_SORT },
      { $skip: fromRow },
      { $limit: rowCount },
      { $project: { _id: 1 } },
    ]).allowDiskUse(true);
    return rows.map((row) => String(row._id));
  }

  const rows = await ExistSathyaUser.find(filter, { exist_id: 1, email: 1, phone: 1 })
    .sort(LIST_SORT)
    .skip(fromRow)
    .limit(rowCount)
    .lean();
  return rows.filter((row) => !isRowMoved(row, sets)).map((row) => String(row._id));
}

export function annotateRow(row, sets) {
  const { password, ...rest } = row;
  return {
    ...rest,
    has_password: Boolean(password && String(password).trim()),
    is_moved: isRowMoved(row, sets),
  };
}
