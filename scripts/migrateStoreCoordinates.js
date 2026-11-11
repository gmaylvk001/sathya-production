/**
 * ONE-TIME IDEMPOTENT MIGRATION SCRIPT
 * Migrates real store latitude/longitude into MongoDB Store collection (location_map.lat / location_map.lng)
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config({ path: ".env.local" });

/**
 * Robust Google Maps URL & coordinate string parser
 */
function parseStoreCoordinates(store) {
  // 1. If location_map already contains valid non-zero coordinates, preserve them
  if (
    store.location_map &&
    typeof store.location_map.lat === "number" &&
    store.location_map.lat !== 0 &&
    typeof store.location_map.lng === "number" &&
    store.location_map.lng !== 0
  ) {
    return {
      lat: store.location_map.lat,
      lng: store.location_map.lng,
      method: "existing_location_map_preserved",
      confidence: "100%",
    };
  }

  const url = (store.website || "").trim();

  // 2. Google Maps place pin: !8m2!3d{lat}!4d{lng}
  let m = url.match(/!8m2!3d([0-9.-]+)!4d([0-9.-]+)/);
  if (m) {
    return {
      lat: parseFloat(m[1]),
      lng: parseFloat(m[2]),
      method: "google_place_pin_params",
      confidence: "100%",
    };
  }

  // 3. Google Maps destination point: !2m2!1d{lng}!2d{lat}
  m = url.match(/!2m2!1d([0-9.-]+)!2d([0-9.-]+)/);
  if (m) {
    return {
      lat: parseFloat(m[2]),
      lng: parseFloat(m[1]),
      method: "google_dir_destination_params",
      confidence: "100%",
    };
  }

  // 4. Google Maps query parameter: q=lat,lng
  m = url.match(/q=([0-9.-]+),([0-9.-]+)/);
  if (m) {
    return {
      lat: parseFloat(m[1]),
      lng: parseFloat(m[2]),
      method: "google_query_param",
      confidence: "100%",
    };
  }

  // 5. Plain lat,lng,zoom string (e.g. 11.020152,76.960893,855m)
  m = url.match(/^([0-9.]+),([0-9.]+)/);
  if (m) {
    return {
      lat: parseFloat(m[1]),
      lng: parseFloat(m[2]),
      method: "plain_coord_string",
      confidence: "100%",
    };
  }

  // 6. Viewport center fallback in Google Maps URL: @lat,lng
  m = url.match(/@([0-9.-]+),([0-9.-]+)/);
  if (m) {
    return {
      lat: parseFloat(m[1]),
      lng: parseFloat(m[2]),
      method: "google_viewport_center",
      confidence: "95%",
    };
  }

  return null;
}

async function runStoreCoordinateMigration({ dryRun = true } = {}) {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`\n====================================================`);
  console.log(` STORE COORDINATES MIGRATION (${dryRun ? "DRY-RUN MODE" : "WRITE MODE"})`);
  console.log(`====================================================\n`);

  const Stores = mongoose.connection.collection("stores");
  const stores = await Stores.find({ status: "Active" }).toArray();
  console.log(`Total Active Stores in MongoDB: ${stores.length}`);

  const report = [];
  const auditLog = [];
  const ambiguous = [];
  const skippedExisting = [];
  const unmatched = [];

  for (const store of stores) {
    const parsed = parseStoreCoordinates(store);

    if (!parsed) {
      unmatched.push({
        storeId: store._id.toString(),
        name: store.organisation_name,
        zipcode: store.zipcode,
        city: store.city,
        website: store.website || "",
      });
      continue;
    }

    if (parsed.method === "existing_location_map_preserved") {
      skippedExisting.push({
        storeId: store._id.toString(),
        name: store.organisation_name,
        existingLat: store.location_map.lat,
        existingLng: store.location_map.lng,
      });
      continue;
    }

    const itemReport = {
      storeId: store._id.toString(),
      organisation_name: store.organisation_name,
      zipcode: store.zipcode,
      city: store.city,
      lat: parsed.lat,
      lng: parsed.lng,
      method: parsed.method,
      confidence: parsed.confidence,
    };

    report.push(itemReport);

    if (!dryRun) {
      await Stores.updateOne(
        { _id: store._id },
        {
          $set: {
            "location_map.lat": parsed.lat,
            "location_map.lng": parsed.lng,
            "location_map.address": store.address || "",
          },
        }
      );
      auditLog.push({
        storeId: store._id.toString(),
        name: store.organisation_name,
        updatedAt: new Date().toISOString(),
        lat: parsed.lat,
        lng: parsed.lng,
      });
    }
  }

  if (ambiguous.length > 0) {
    console.error(`\n[ABORTED] Detected ${ambiguous.length} ambiguous matches! Migration stopped.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`\nMIGRATION SUMMARY:`);
  console.log(`- Matched & Ready to Update: ${report.length}`);
  console.log(`- Already Had Valid Coordinates: ${skippedExisting.length}`);
  console.log(`- Unmatched Stores (No Coordinates in URL): ${unmatched.length}`);
  console.log(`- Ambiguous Matches: ${ambiguous.length}`);

  console.log(`\nDETAILED DRY-RUN REPORT (${report.length} Stores):`);
  console.log(JSON.stringify(report, null, 2));

  if (unmatched.length > 0) {
    console.log(`\nUNMATCHED STORES (${unmatched.length} Stores):`);
    console.log(JSON.stringify(unmatched, null, 2));
  }

  if (auditLog.length > 0) {
    const auditPath = path.join(process.cwd(), "scratch", "store_coordinate_migration_audit.json");
    fs.writeFileSync(auditPath, JSON.stringify(auditLog, null, 2));
    console.log(`\nAudit log saved to: ${auditPath}`);
  }

  await mongoose.disconnect();
  return { dryRun, report, skippedExisting, unmatched, ambiguous };
}

const isExecute = process.argv.includes("--execute");
runStoreCoordinateMigration({ dryRun: !isExecute })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
