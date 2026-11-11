import mongoose from "mongoose";

async function run() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error("Error: MONGODB_URI or DATABASE_URL not found in environment.");
    process.exit(1);
  }

  const isDryRun = process.argv.includes("--dry-run");

  console.log(`Connecting to MongoDB... (dry-run: ${isDryRun})`);
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  const brandsColl = db.collection("ecom_brand_infos");
  const productsColl = db.collection("products");

  const t0 = Date.now();

  // 1. Group active products by brand
  console.log("Aggregating active products by brand...");
  const productCounts = await productsColl.aggregate([
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
  ]).toArray();

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
  const allBrands = await brandsColl.find({}).sort({ brand_name: 1 }).toArray();
  console.log(`Retrieved ${allBrands.length} brands from ecom_brand_infos.`);

  const bulkOps = [];
  const activated = [];
  const deactivated = [];
  let totalActive = 0;
  let totalInactive = 0;

  const now = new Date();

  for (const b of allBrands) {
    const idKey = String(b._id).toLowerCase();
    const nameKey = String(b.brand_name || "").trim().toLowerCase();

    const countById = countMap.get(idKey) || 0;
    const countByName = nameKey && nameKey !== idKey ? (countMap.get(nameKey) || 0) : 0;
    const totalCount = countById + countByName;

    const currentStatus = String(b.status || "").toLowerCase() === "active" ? "Active" : "Inactive";
    const targetStatus = totalCount > 0 ? "Active" : "Inactive";

    if (targetStatus === "Active") totalActive++;
    else totalInactive++;

    if (currentStatus !== targetStatus) {
      if (targetStatus === "Active") {
        activated.push({ name: b.brand_name, count: totalCount });
      } else {
        deactivated.push({ name: b.brand_name, prevCount: b.product_count || 0 });
      }
    }

    if (!isDryRun) {
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

  if (!isDryRun && bulkOps.length > 0) {
    console.log(`Updating ${bulkOps.length} brands in database...`);
    await brandsColl.bulkWrite(bulkOps);
  }

  const durationMs = Date.now() - t0;

  console.log("\n========================================================");
  console.log("       BRAND PRODUCT COUNT & STATUS SYNC REPORT         ");
  console.log("========================================================");
  console.log(`Total Brands Processed : ${allBrands.length}`);
  console.log(`Active Brands (>0 prod): ${totalActive}`);
  console.log(`Inactive Brands (0 prod): ${totalInactive}`);
  console.log(`Newly Activated Brands : ${activated.length}`);
  console.log(`Newly Deactivated Brands: ${deactivated.length}`);
  console.log(`Execution Time         : ${durationMs}ms`);
  console.log("========================================================");

  if (activated.length > 0) {
    console.log(`\nBrands Activated (${activated.length}):`);
    activated.forEach((b) => console.log(`  + ${b.name} (${b.count} active products)`));
  }

  if (deactivated.length > 0) {
    console.log(`\nBrands Deactivated (${deactivated.length}):`);
    deactivated.forEach((b) => console.log(`  - ${b.name} (0 active products)`));
  }

  console.log("\nSync completed successfully.");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Sync failed with error:", err);
  process.exit(1);
});
