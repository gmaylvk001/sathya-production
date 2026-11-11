/**
 * Standalone Developer Script: Dynamic Slab Auto-Seeder for Onsitego Extended Warranties
 *
 * Automatically maps Onsitego price slabs to Large Appliances (ACs, Refrigerators,
 * Washing Machines, Dishwashers, etc.) and upserts into `ecom_products_extended_warrents`
 * as well as the `products` collection.
 *
 * Usage:
 *   node scripts/seedOnsitegoWarranties.js
 */

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// 1. Resolve MongoDB URI from .env or .env.local
function getMongoUri() {
  const envFiles = [".env", ".env.local"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) continue;
    const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed) continue;
      if (trimmed.startsWith("MONGODB_URI=")) {
        const val = trimmed.replace(/^MONGODB_URI=/, "").trim();
        return val.replace(/^["']|["']$/g, "");
      }
    }
  }
  throw new Error("❌ Active MONGODB_URI not found in .env or .env.local");
}

// 2. Onsitego Slab Calculator
function calculateOnsitegoWarranties(price) {
  const p = Math.round(Number(price) || 0);

  let y1 = 0;
  let y2 = 0;
  let y3 = 0;

  if (p <= 10000) {
    y1 = 999;
    y2 = 1399;
    y3 = 1899;
  } else if (p <= 15000) {
    y1 = 1299;
    y2 = 1799;
    y3 = 2499;
  } else if (p <= 20000) {
    y1 = 1599;
    y2 = 2299;
    y3 = 3099;
  } else if (p <= 25000) {
    y1 = 1999;
    y2 = 2799;
    y3 = 3799;
  } else if (p <= 30000) {
    // 25001–30000
    y1 = 2399;
    y2 = 3299;
    y3 = 4499;
  } else if (p <= 35000) {
    // 30001–35000
    y1 = 2799;
    y2 = 3999;
    y3 = 5299;
  } else if (p <= 40000) {
    // 35001–40000
    y1 = 3199;
    y2 = 4499;
    y3 = 5999;
  } else if (p <= 50000) {
    y1 = 3699;
    y2 = 5199;
    y3 = 6999;
  } else if (p <= 75000) {
    y1 = 4499;
    y2 = 6399;
    y3 = 8599;
  } else if (p <= 100000) {
    y1 = 5499;
    y2 = 7799;
    y3 = 10499;
  } else {
    y1 = 6999;
    y2 = 9999;
    y3 = 13499;
  }

  return [
    { year: 1, amount: y1 },
    { year: 2, amount: y2 },
    { year: 3, amount: y3 },
  ];
}

async function run() {
  const uri = getMongoUri();
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(uri, { family: 4 });
  console.log("✅ MongoDB connected successfully!");

  const db = mongoose.connection.db;

  // 3. Find Large Appliances category tree
  const categories = await db.collection("ecom_category_infos").find({}).toArray();

  const largeApplianceRoot = categories.find(
    (c) =>
      c.category_slug === "large-appliances" ||
      c.category_name.toLowerCase() === "large appliances"
  );
  const rootId = largeApplianceRoot ? largeApplianceRoot._id.toString() : null;

  const targetCategoryIds = new Set();
  if (rootId) targetCategoryIds.add(rootId);

  // Level 1 children
  categories.forEach((c) => {
    if (c.parentid === rootId || c.parentid_new === rootId) {
      targetCategoryIds.add(c._id.toString());
    }
    if (/air conditioner|refrigerator|washing machine|dishwasher/i.test(c.category_name)) {
      targetCategoryIds.add(c._id.toString());
    }
  });

  // Level 2 children
  categories.forEach((c) => {
    if (targetCategoryIds.has(c.parentid) || targetCategoryIds.has(c.parentid_new)) {
      targetCategoryIds.add(c._id.toString());
    }
  });

  const catIdArray = Array.from(targetCategoryIds);

  // 4. Query active Large Appliance products (excluding stands, covers, accessories)
  const productQuery = {
    status: "Active",
    item_code: { $exists: true, $ne: "" },
    $and: [
      {
        $or: [
          { category: { $in: catIdArray } },
          { sub_category: { $in: catIdArray } },
          {
            name: {
              $regex: /(air conditioner|split ac|window ac|inverter ac|refrigerator|fridge|washing machine|dishwasher)/i,
            },
          },
        ],
      },
      // Exclude stands, covers, trolleys, brackets, remotes, stabilizers
      {
        name: {
          $not: {
            $regex: /\b(stand|cover|trolley|bracket|remote|pipe|tray|cable|mat|stabilizer|stabilzier|cleaner|descaler)\b/i,
          },
        },
      },
    ],
  };

  const products = await db.collection("products").find(productQuery).toArray();
  console.log(`🔍 Found ${products.length} active Large Appliance products.`);

  const extWarrantyOps = [];
  const productOps = [];
  let mappedCount = 0;
  let skippedCount = 0;

  for (const product of products) {
    const rawPrice = Number(
      product.special_price > 0 ? product.special_price : product.price
    );

    // Skip accessories or invalid zero-price products
    if (!rawPrice || rawPrice < 5000) {
      skippedCount++;
      continue;
    }

    const extendWarranty = calculateOnsitegoWarranties(rawPrice);

    // 5. Bulk operation for ecom_products_extended_warrents
    extWarrantyOps.push({
      updateOne: {
        filter: { item_code: product.item_code },
        update: {
          $set: {
            item_code: product.item_code,
            extend_warranty: extendWarranty,
            status: "Active",
            modified_date: new Date(),
          },
          $setOnInsert: {
            created_date: new Date(),
          },
        },
        upsert: true,
      },
    });

    // 6. Bulk operation for products collection
    productOps.push({
      updateOne: {
        filter: { _id: product._id },
        update: {
          $set: {
            extend_warranty: extendWarranty,
          },
        },
      },
    });

    mappedCount++;
  }

  // Execute bulk operations in chunks of 500
  const BATCH_SIZE = 500;
  console.log(`🚀 Executing bulk updates for ${mappedCount} products in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < extWarrantyOps.length; i += BATCH_SIZE) {
    const batchExt = extWarrantyOps.slice(i, i + BATCH_SIZE);
    const batchProd = productOps.slice(i, i + BATCH_SIZE);

    await Promise.all([
      db.collection("ecom_products_extended_warrents").bulkWrite(batchExt, { ordered: false }),
      db.collection("products").bulkWrite(batchProd, { ordered: false }),
    ]);

    console.log(`  ⚡ Processed batch ${Math.min(i + BATCH_SIZE, mappedCount)} / ${mappedCount}`);
  }

  console.log("\n========================================================");
  console.log(
    `✅ Successfully mapped Onsitego warranties for ${mappedCount} Large Appliances`
  );
  if (skippedCount > 0) {
    console.log(`ℹ️ Skipped ${skippedCount} products (price < ₹5,000 or accessories)`);
  }
  console.log("========================================================\n");

  await mongoose.disconnect();
  console.log("🔌 Disconnected from MongoDB. Done!");
}

run().catch((err) => {
  console.error("❌ Error in seedOnsitegoWarranties:", err);
  process.exit(1);
});
