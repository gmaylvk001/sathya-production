import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User, { ensureUserIndexes } from "@/models/User";
import { mapUserDetailsForLiveUsers } from "@/lib/existUserDetailsMap";

export function toOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  return text === "" ? null : text;
}

function toOptionalContact(value) {
  const text = toOptionalString(value);
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower === "null" || lower === "undefined" || lower === "n/a" || lower === "-") {
    return null;
  }
  return text;
}

export function normalizeExistId(value) {
  const text = toOptionalString(value);
  if (!text) return "";
  if (/^\d+(\.0+)?$/.test(text)) {
    return String(Math.trunc(Number(text)));
  }
  return text;
}

export function normalizeMobile(phone) {
  const text = toOptionalString(phone);
  return text || "";
}

export function toValidDate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 20000 && value < 80000) {
    const excelDate = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(excelDate.getTime()) ? null : excelDate;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function buildName(existUser) {
  const first = String(existUser.first_name || "").trim();
  if (first) return first;
  const last = String(existUser.last_name || "").trim();
  if (last) return last;
  return null;
}

export function liveUserType(roleId) {
  return String(roleId ?? "").trim() === "1" ? "admin" : "user";
}

export function buildRoleQuery(roleId) {
  if (roleId === undefined || roleId === null || roleId === "") {
    return {};
  }
  if (roleId === "__empty__") {
    return {
      $or: [
        { role_id: null },
        { role_id: "" },
        { role_id: { $exists: false } },
      ],
    };
  }
  const text = String(roleId).trim();
  const values = [text];
  if (/^\d+$/.test(text)) {
    values.push(Number(text));
  }
  return { role_id: { $in: values } };
}

function isBcryptHash(password) {
  return /^\$2[aby]\$/.test(String(password || ""));
}

async function hashInChunks(items, size = 10) {
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    await Promise.all(chunk.map(async (item) => {
      if (item.needsHash && item.plainPassword) {
        item.doc.password = await bcrypt.hash(item.plainPassword, 10);
      }
    }));
  }
}

async function loadLiveSets(existUsers) {
  const existIds = [];
  const emails = [];
  const mobiles = [];

  for (const existUser of existUsers) {
    const existId = normalizeExistId(existUser.exist_id);
    if (existId) existIds.push(existId);
    const email = toOptionalContact(existUser.email);
    if (email) emails.push(email.toLowerCase());
    const mobile = toOptionalContact(existUser.phone);
    if (mobile) mobiles.push(mobile);
  }

  const or = [];
  if (existIds.length) or.push({ exist_id: { $in: existIds } });
  if (emails.length) or.push({ email: { $in: emails } });
  if (mobiles.length) or.push({ mobile: { $in: mobiles } });

  const liveUsers = or.length
    ? await User.find({ $or: or }, { exist_id: 1, email: 1, mobile: 1 }).lean()
    : [];

  const existIdSet = new Set();
  const emailSet = new Set();
  const mobileSet = new Set();

  for (const live of liveUsers) {
    const existId = normalizeExistId(live.exist_id);
    if (existId) existIdSet.add(existId);
    const email = toOptionalContact(live.email);
    if (email) emailSet.add(email.toLowerCase());
    const mobile = toOptionalContact(live.mobile);
    if (mobile) mobileSet.add(mobile);
  }

  return { existIdSet, emailSet, mobileSet };
}

function skipReason(existUser, liveSets, batchSets) {
  const existId = normalizeExistId(existUser.exist_id);
  const emailRaw = toOptionalContact(existUser.email);
  const email = emailRaw ? emailRaw.toLowerCase() : null;
  const mobile = toOptionalContact(existUser.phone);

  if (existId && liveSets.existIdSet.has(existId)) {
    return "already_moved";
  }
  if (!existId && ((email && liveSets.emailSet.has(email)) || (mobile && liveSets.mobileSet.has(mobile)))) {
    return "already_moved";
  }
  if (!email && !mobile) {
    return "missing_contact";
  }
  if (mobile && (liveSets.mobileSet.has(mobile) || batchSets.mobiles.has(mobile))) {
    return "duplicate_mobile";
  }
  if (email && (liveSets.emailSet.has(email) || batchSets.emails.has(email))) {
    return "duplicate_email";
  }
  return null;
}

function buildLiveDoc(existUser) {
  const now = new Date();
  const emailRaw = toOptionalContact(existUser.email);
  const email = emailRaw ? emailRaw.toLowerCase() : null;
  const mobile = toOptionalContact(existUser.phone);
  const name = buildName(existUser);
  const lastName = toOptionalString(existUser.last_name);
  const existingPassword = toOptionalContact(existUser.password);
  const extraFields = {
    exist_id: toOptionalString(existUser.exist_id),
    store_id: toOptionalString(existUser.store_id),
    last_name: lastName,
    confirmed: existUser.confirmed === undefined || existUser.confirmed === null || existUser.confirmed === ""
      ? null
      : Number(existUser.confirmed),
    confirmation_code: toOptionalString(existUser.confirmation_code),
    provider: toOptionalString(existUser.provider),
    provider_id: toOptionalString(existUser.provider_id),
    notify_pincode: toOptionalString(existUser.notify_pincode),
    notify_status: existUser.notify_status === undefined || existUser.notify_status === null || existUser.notify_status === ""
      ? null
      : Number(existUser.notify_status),
    logged_in: existUser.logged_in || null,
    zone_id: toOptionalString(existUser.zone_id),
    remember_token: toOptionalString(existUser.remember_token),
    avatar: toOptionalString(existUser.avatar),
    avatar_original: toOptionalString(existUser.avatar_original),
  };

  const passwordValue = existingPassword && isBcryptHash(existingPassword)
    ? existingPassword
    : existingPassword || null;

  const doc = {
    _id: new mongoose.Types.ObjectId(),
    name,
    password: passwordValue,
    user_type: liveUserType(existUser.role_id),
    status: "Active",
    role: null,
    createdAt: toValidDate(existUser.created_at) || now,
    updatedAt: toValidDate(existUser.updated_at) || now,
    ...extraFields,
  };

  if (email) {
    doc.email = email;
  }
  if (mobile) {
    doc.mobile = mobile;
  }

  const needsHash = Boolean(passwordValue) && !isBcryptHash(passwordValue);

  return {
    doc,
    generatedPassword: null,
    needsHash,
    plainPassword: needsHash ? existingPassword : null,
  };
}

export async function processExistUserMoves(existUsers) {
  const skipped = [];
  const prepared = [];

  if (!existUsers.length) {
    return { moved: 0, skipped, failed: 0, mappedDetailsCount: 0, created: [] };
  }

  await ensureUserIndexes();

  const liveSets = await loadLiveSets(existUsers);
  const batchSets = { emails: new Set(), mobiles: new Set(), existIds: new Set() };

  for (const existUser of existUsers) {
    const reason = skipReason(existUser, liveSets, batchSets);
    if (reason) {
      skipped.push({
        exist_id: existUser.exist_id || null,
        email: existUser.email || null,
        reason,
      });
      continue;
    }

    const item = buildLiveDoc(existUser);
    prepared.push(item);
    if (item.doc.email) batchSets.emails.add(item.doc.email);
    if (item.doc.mobile) batchSets.mobiles.add(item.doc.mobile);
    const existId = normalizeExistId(item.doc.exist_id);
    if (existId) batchSets.existIds.add(existId);
  }

  await hashInChunks(prepared);

  if (!prepared.length) {
    return { moved: 0, skipped, failed: 0, mappedDetailsCount: 0, created: [] };
  }

  const docs = prepared.map((item) => item.doc);
  let moved = 0;
  let failed = 0;
  const inserted = [];

  try {
    await User.collection.insertMany(docs, { ordered: false });
    inserted.push(...docs);
    moved = docs.length;
  } catch (error) {
    const insertedIds = error.result?.insertedIds || error.insertedIds || {};
    const insertedIdSet = new Set(Object.values(insertedIds).map((id) => String(id)));
    docs.forEach((doc) => {
      if (insertedIdSet.has(String(doc._id))) {
        inserted.push(doc);
      }
    });
    moved = inserted.length;
    const writeErrors = error.writeErrors || error.result?.getWriteErrors?.() || [];
    failed += writeErrors.length || Math.max(0, docs.length - moved);
    writeErrors.slice(0, 20).forEach((writeError) => {
      skipped.push({
        exist_id: docs[writeError.index]?.exist_id || null,
        email: docs[writeError.index]?.email || null,
        reason: "insert_failed",
      });
    });
  }

  const mappedDetailsCount = await mapUserDetailsForLiveUsers(inserted);

  return {
    moved,
    skipped,
    failed,
    mappedDetailsCount,
    created: inserted,
    generatedPassword: prepared.length === 1 ? prepared[0].generatedPassword : null,
  };
}
