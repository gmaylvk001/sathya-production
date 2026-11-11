import mongoose from "mongoose";
import LaunchProduct from "../../models/LaunchProduct";
import LaunchProductRevision from "../../models/LaunchProductRevision";
import AuditLog from "../../models/AuditLog";
import { launchProductSchema } from "../validations/launchProduct.schema";

const logAudit = async (action, entity, entity_id, diff, actorId, req) => {
  try {
    let ip = "";
    let user_agent = "";
    if (req) {
      ip = req.headers?.get("x-forwarded-for") || req.ip || "";
      user_agent = req.headers?.get("user-agent") || "";
    }
    await AuditLog.create({
      actor: actorId,
      action,
      entity,
      entity_id,
      diff,
      ip,
      user_agent,
    });
  } catch (error) {
    console.error("Failed to write audit log", error);
  }
};

export const getLaunchProducts = async ({ page = 1, limit = 10, search = "", status, design, stock_status }) => {
  const query = { deleted_at: null };
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
    ];
  }
  if (status) query.status = status;
  if (design) query.design_type = design;
  if (stock_status) query.stock_status = stock_status;

  const skip = (page - 1) * limit;
  
  const [data, total] = await Promise.all([
    LaunchProduct.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    LaunchProduct.countDocuments(query)
  ]);
  
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getLaunchProductById = async (id) => {
  const product = await LaunchProduct.findById(id).lean();
  if (!product || product.deleted_at) {
    throw new Error("Launch product not found");
  }
  return product;
};

export const getLaunchProductBySlug = async (slug) => {
  const product = await LaunchProduct.findOne({ slug, deleted_at: null }).lean();
  if (!product) {
    throw new Error("Launch product not found");
  }
  return product;
};

export const createLaunchProduct = async (data, actorId, req) => {
  const validated = await launchProductSchema.validate(data, { stripUnknown: true });
  validated.created_by = actorId;
  
  const product = new LaunchProduct(validated);
  const saved = await product.save();
  
  await logAudit("CREATE", "LaunchProduct", saved._id, saved.toObject(), actorId, req);
  
  return saved;
};

export const updateLaunchProduct = async (id, data, actorId, req) => {
  const validated = await launchProductSchema.validate(data, { stripUnknown: true });
  
  const product = await LaunchProduct.findById(id);
  if (!product || product.deleted_at) {
    throw new Error("Launch product not found");
  }

  // Optimistic Locking Check
  if (validated.version !== undefined && product.__v !== validated.version) {
    throw new Error("Conflict: This product has been updated by another user. Please refresh and try again.");
  }

  // Save Revision
  await LaunchProductRevision.create({
    launch_product_id: product._id,
    snapshot: product.toObject(),
    created_by: actorId
  });

  // Update fields
  Object.assign(product, validated);
  product.updated_by = actorId;
  
  const updated = await product.save();
  
  await logAudit("UPDATE", "LaunchProduct", updated._id, { updatedFields: validated }, actorId, req);
  
  return updated;
};

export const deleteLaunchProduct = async (id, actorId, req) => {
  const product = await LaunchProduct.findById(id);
  if (!product || product.deleted_at) {
    throw new Error("Launch product not found");
  }
  
  product.deleted_at = new Date();
  product.updated_by = actorId;
  await product.save();
  
  await logAudit("DELETE", "LaunchProduct", product._id, { deleted_at: product.deleted_at }, actorId, req);
  
  return true;
};
