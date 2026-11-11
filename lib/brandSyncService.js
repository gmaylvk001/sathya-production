import dbConnect from "./db.js";
import Brand from "../models/ecom_brand_info.js";
import Product from "../models/product.js";
import CronRunLog from "../models/cron_run_log.js";

const JOB_NAME = "brand_status_sync";

/**
 * Synchronizes active product counts for all brands and updates their status.
 * - Brands with active products > 0 are marked "Active".
 * - Brands with 0 active products are marked "Inactive".
 *
 * @param {Object} options
 * @param {boolean} [options.dryRun=false] - If true, computes changes without saving to DB.
 * @param {string} [options.triggeredBy="manual"] - Identifier for audit logging.
 * @param {string} [options.runKey=null] - Slot/run key for CronRunLog (optional).
 */
export async function syncBrandProductCounts({
  dryRun = false,
  triggeredBy = "manual",
  runKey = null,
} = {}) {
  const startedAt = new Date();
  const t0 = Date.now();

  await dbConnect();

  // 1. Group active products by brand
  // Products may store brand as ObjectId string, brand name, or ObjectId
  const productCounts = await Product.aggregate([
    {
      $match: {
        $or: [
          { status: { $regex: /^active$/i } },
          { status: { $exists: false } },
        ],
      },
    },
    {
      $group: {
        _id: "$brand",
        count: { $sum: 1 },
      },
    },
  ]);

  // Build lookup map by lowercase string (handles both ID strings and names)
  const countMap = new Map();
  for (const item of productCounts) {
    if (item._id != null) {
      const key = String(item._id).trim().toLowerCase();
      if (key) {
        countMap.set(key, (countMap.get(key) || 0) + item.count);
      }
    }
  }

  // 2. Fetch all brands
  const brands = await Brand.find({}).lean();

  const bulkOps = [];
  const changedBrands = [];
  let totalActive = 0;
  let totalInactive = 0;
  let activatedCount = 0;
  let deactivatedCount = 0;
  let unchangedCount = 0;

  const now = new Date();

  for (const b of brands) {
    const idKey = String(b._id).toLowerCase();
    const nameKey = String(b.brand_name || "").trim().toLowerCase();

    // Check count matching by ID or by brand name
    const countById = countMap.get(idKey) || 0;
    const countByName = nameKey && nameKey !== idKey ? (countMap.get(nameKey) || 0) : 0;
    const totalCount = countById + countByName;

    const currentStatus = String(b.status || "").toLowerCase() === "active" ? "Active" : "Inactive";
    const targetStatus = totalCount > 0 ? "Active" : "Inactive";

    if (targetStatus === "Active") {
      totalActive++;
    } else {
      totalInactive++;
    }

    const statusChanged = currentStatus !== targetStatus;
    const countChanged = (b.product_count ?? 0) !== totalCount;

    if (statusChanged) {
      if (targetStatus === "Active") {
        activatedCount++;
        changedBrands.push({
          id: b._id,
          name: b.brand_name,
          slug: b.brand_slug,
          action: "ACTIVATED",
          products: totalCount,
        });
      } else {
        deactivatedCount++;
        changedBrands.push({
          id: b._id,
          name: b.brand_name,
          slug: b.brand_slug,
          action: "DEACTIVATED",
          products: 0,
        });
      }
    } else {
      unchangedCount++;
    }

    if (!dryRun && (statusChanged || countChanged || !b.last_product_sync_at)) {
      bulkOps.push({
        updateOne: {
          filter: { _id: b._id },
          update: {
            $set: {
              status: targetStatus,
              product_count: totalCount,
              last_product_sync_at: now,
            },
          },
        },
      });
    }
  }

  // 3. Execute bulk write if not dry run
  let bulkWriteResult = null;
  if (!dryRun && bulkOps.length > 0) {
    bulkWriteResult = await Brand.bulkWrite(bulkOps);
  }

  const durationMs = Date.now() - t0;
  const finishedAt = new Date();

  const summary = {
    success: true,
    dryRun,
    triggeredBy,
    totalBrands: brands.length,
    activeBrands: totalActive,
    inactiveBrands: totalInactive,
    activatedCount,
    deactivatedCount,
    unchangedCount,
    updatedDocuments: bulkOps.length,
    changedBrands,
    durationMs,
    startedAt,
    finishedAt,
  };

  // 4. Log to CronRunLog if runKey is provided or running via cron
  if (runKey) {
    try {
      await CronRunLog.updateOne(
        { job: JOB_NAME, run_key: runKey },
        {
          $set: {
            status: "success",
            result: summary,
            finished_at: finishedAt,
          },
        }
      );
    } catch (logErr) {
      console.warn(`[brandSyncService] Failed to update CronRunLog for ${runKey}:`, logErr?.message);
    }
  }

  return summary;
}
