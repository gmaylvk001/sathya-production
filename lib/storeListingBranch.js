import mongoose from "mongoose";
import StoreListing from "@/models/store_listings";
import { ownerFieldFilter } from "@/lib/storeView";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeOwner(value) {
  return String(value || "sathya").trim().toLowerCase() === "unilet" ? "unilet" : "sathya";
}

// Branch code is unique per store owner (case-insensitive); sathya and unilet may share a code.
export async function findBranchConflict({ branchCode, storeOwner, excludeId }) {
  const code = String(branchCode || "").trim();
  if (!code) return null;
  const filter = {
    branch_code: { $regex: new RegExp(`^${escapeRegex(code)}$`, "i") },
    ...ownerFieldFilter("store_owner", normalizeOwner(storeOwner) === "unilet"),
  };
  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  }
  return StoreListing.findOne(filter).select("_id branch_code title store_owner").lean();
}

export function branchConflictMessage(branchCode, storeOwner) {
  return `Branch code "${String(branchCode).trim()}" already exists for ${normalizeOwner(storeOwner)} stores`;
}
