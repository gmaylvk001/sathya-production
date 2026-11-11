/**
 * Standalone Developer Script: admin permissions + role seeder
 *
 * Reads every admin module from lib/adminModules.js (must match AdminSider / Exist modules)
 * and creates a permission for each in `ecom_permissions_infos` (Permissions page).
 * Then seeds roles in `ecom_roles_infos` (Roles page),
 * leaving out PERMISSION_ONLY_GROUPS (Product, Category) from every role:
 *   - Admin: every seeded permission. Adds missing ones; removes orphan / deleted-module perms.
 *   - Unilet Admin: only the modules in its `groups` (exact list).
 *   - deals-role: exact module keys (Dashboard + Offer Module + Offer Timer).
 *
 * Also:
 *   - Marks permissions for removed admin modules as Inactive
 *   - Strips missing / orphan permission IDs from ALL roles
 *
 * Safe to run again.
 *
 * Usage:
 *   node scripts/seedUniletPermissions.js
 *   npm run seed:allPermission
 */

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { ObjectId } = mongoose.Types;

// Top-level menu labels in lib/adminModules.js whose permissions are seeded but never given to any role.
const PERMISSION_ONLY_GROUPS = ["Product", "Category"];

// groups: top-level menu labels whose modules the role gets (null = every seeded module).
// modules: optional exact permission module keys (overrides groups when set).
// exact: true → role permissions = exactly this set (drops everything else).
// exact: false → add missing seeded; still remove orphan / deleted-module / missing-doc IDs.
const ROLES = [
  {
    name: "Admin",
    slug: "admin",
    description: "All admin modules except Product and Category",
    groups: null,
    exact: false,
  },
  {
    name: "Unilet Admin",
    slug: "unilet-admin",
    description:
      "Unilet store admin: Unilet Dashboard, Sales, Unilet Products, New Unilet Product and Stores",
    groups: [
      "Unilet Dashboard",
      "Sales",
      "Unilet Products",
      "New Unilet Product",
      "Stores",
    ],
    exact: true,
  },
  {
    name: "deals-role",
    slug: "deals-role",
    description:
      "Deals / offers admin: Dashboard, Offer Module (all), Design Offer Timer",
    // Exact permission module keys (match lib/adminModules.js permission fields)
    modules: [
      "dashboard",
      "offers",
      "payment-offers",
      "exchange-offers-condition",
      "offer-product",
      "highlighted-products",
      "offer-timer",
    ],
    exact: true,
  },
];

const PERMISSIONS_COLLECTION = "ecom_permissions_infos";
const ROLES_COLLECTION = "ecom_roles_infos";

function normalizeModuleKey(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw.trim().replace(/^\/+/, "");
}

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof ObjectId) return id;
  if (ObjectId.isValid(String(id))) return new ObjectId(String(id));
  return null;
}

async function loadAdminMenuItems() {
  const source = fs.readFileSync(path.resolve(__dirname, "..", "lib", "adminModules.js"), "utf8");
  const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  return mod.adminMenuItems;
}

async function getSeedPermissions() {
  const items = await loadAdminMenuItems();
  const list = [];
  const seenModules = new Set();

  for (const item of items) {
    if (item.link) {
      const moduleKey = normalizeModuleKey(item.permission || item.link);
      if (moduleKey && !seenModules.has(moduleKey)) {
        seenModules.add(moduleKey);
        list.push({
          name: item.label,
          module: moduleKey,
          group: item.label,
        });
      }
    }
    for (const sub of item.submenu || []) {
      const moduleKey = normalizeModuleKey(sub.permission || sub.link);
      if (!moduleKey || seenModules.has(moduleKey)) continue;
      seenModules.add(moduleKey);
      list.push({
        name: `${item.label} / ${sub.label}`,
        module: moduleKey,
        group: item.label,
      });
    }
  }

  return list;
}

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

function createSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function seedPermissions(db, seedList) {
  const permissions = db.collection(PERMISSIONS_COLLECTION);
  const seeded = [];

  for (const item of seedList) {
    const slug = createSlug(item.name);
    const existing = await permissions.findOne({
      $or: [{ module: item.module }, { slug }, { name: item.name }],
    });

    if (existing) {
      const updates = {};
      if (normalizeModuleKey(existing.module) !== item.module) {
        updates.module = item.module;
      }
      if (existing.name !== item.name) {
        updates.name = item.name;
      }
      if (existing.slug !== slug) {
        updates.slug = slug;
      }
      // Reactivate if it was marked Inactive earlier as an orphan but is back in modules
      if (String(existing.status || "").toLowerCase() !== "active") {
        updates.status = "Active";
      }
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        await permissions.updateOne({ _id: existing._id }, { $set: updates });
        console.log(`🔧 Permission corrected: ${item.name} → module "${item.module}"`);
      } else {
        console.log(`⏭️  Permission exists: ${existing.name}`);
      }
      seeded.push({ id: existing._id, group: item.group, module: item.module });
      continue;
    }

    const now = new Date();
    const { insertedId } = await permissions.insertOne({
      name: item.name,
      slug,
      module: item.module,
      description: "",
      status: "Active",
      createdAt: now,
      updatedAt: now,
      __v: 0,
    });
    console.log(`✅ Permission created: ${item.name} → module "${item.module}"`);
    seeded.push({ id: insertedId, group: item.group, module: item.module });
  }

  return seeded;
}

/**
 * Permissions whose module is no longer in adminModules (deleted admin pages / files).
 * Mark Inactive — do not hard-delete (keeps history; roles are cleaned separately).
 */
async function deactivateOrphanPermissions(db, validModules) {
  const permissions = db.collection(PERMISSIONS_COLLECTION);
  const all = await permissions.find({}).toArray();
  const orphans = all.filter((doc) => {
    const key = normalizeModuleKey(doc.module);
    return !key || !validModules.has(key);
  });

  if (orphans.length === 0) {
    console.log("⏭️  No orphan permissions (deleted modules) found");
    return new Set();
  }

  const orphanIds = new Set(orphans.map((o) => String(o._id)));
  const now = new Date();
  for (const orphan of orphans) {
    if (String(orphan.status || "").toLowerCase() === "inactive") {
      console.log(`⏭️  Orphan already inactive: ${orphan.name || orphan.module}`);
      continue;
    }
    await permissions.updateOne(
      { _id: orphan._id },
      { $set: { status: "Inactive", updatedAt: now } }
    );
    console.log(
      `🗑️  Orphan permission inactivated (module removed): ${orphan.name || "?"} → "${orphan.module || ""}"`
    );
  }

  return orphanIds;
}

/**
 * Strip from EVERY role:
 * - permission IDs that no longer exist in DB
 * - permission IDs for orphan / Inactive modules (deleted admin pages/files)
 * - permission IDs not in the current adminModules seed set
 */
async function cleanAllRolesOfInvalidPermissions(db, orphanIds, validPermissionIds) {
  const roles = db.collection(ROLES_COLLECTION);
  const permissions = db.collection(PERMISSIONS_COLLECTION);
  const allRoles = await roles.find({}).toArray();
  const orphanSet = orphanIds instanceof Set ? orphanIds : new Set(orphanIds || []);
  const validSet =
    validPermissionIds instanceof Set
      ? validPermissionIds
      : new Set(validPermissionIds || []);

  for (const role of allRoles) {
    const current = Array.isArray(role.permissions) ? role.permissions : [];
    if (current.length === 0) continue;

    const kept = [];
    let removed = 0;

    for (const rawId of current) {
      const key = String(rawId);

      // Orphan module (deleted admin file / removed from adminModules)
      if (orphanSet.has(key)) {
        removed += 1;
        continue;
      }

      // Still a current seeded module permission
      if (validSet.has(key)) {
        kept.push(rawId);
        continue;
      }

      // Missing document or inactive → remove from role
      const oid = toObjectId(rawId);
      if (!oid) {
        removed += 1;
        continue;
      }
      const doc = await permissions.findOne({ _id: oid });
      if (!doc || String(doc.status || "").toLowerCase() === "inactive") {
        removed += 1;
        continue;
      }

      // Active but not in current modules → treat as deleted module, remove from role
      removed += 1;
    }

    if (removed === 0) continue;

    await roles.updateOne(
      { _id: role._id },
      { $set: { permissions: kept, updatedAt: new Date() } }
    );
    console.log(
      `🧹 Role cleaned: ${role.name} removed ${removed} invalid/orphan permission(s) → ${kept.length} left`
    );
  }
}

function uniqueIds(ids) {
  const seen = new Set();
  return ids.filter((id) => {
    const key = String(id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function seedRole(db, role, seeded, orphanIds) {
  const roles = db.collection(ROLES_COLLECTION);

  let selected = seeded.filter((p) => !PERMISSION_ONLY_GROUPS.includes(p.group));
  if (Array.isArray(role.modules) && role.modules.length > 0) {
    const wantedModules = new Set(role.modules.map((m) => normalizeModuleKey(m)));
    selected = selected.filter((p) => wantedModules.has(normalizeModuleKey(p.module)));
  } else if (role.groups) {
    selected = selected.filter((p) => role.groups.includes(p.group));
  }

  const permissionIds = uniqueIds(selected.map((p) => p.id));
  if (Array.isArray(role.modules) && role.modules.length > 0) {
    const found = new Set(selected.map((p) => normalizeModuleKey(p.module)));
    for (const mod of role.modules) {
      const key = normalizeModuleKey(mod);
      if (!found.has(key)) {
        console.warn(`⚠️  ${role.name}: permission module "${key}" not found in seed list`);
      }
    }
  }
  const wanted = new Set(permissionIds.map((id) => String(id)));
  const orphanSet = orphanIds instanceof Set ? orphanIds : new Set();
  const existing = await roles.findOne({ $or: [{ slug: role.slug }, { name: role.name }] });

  if (!existing) {
    const now = new Date();
    await roles.insertOne({
      name: role.name,
      slug: role.slug,
      description: role.description,
      permissions: permissionIds,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    });
    console.log(`✅ Role created: ${role.name} with ${permissionIds.length} permissions`);
    return;
  }

  const current = Array.isArray(existing.permissions) ? existing.permissions : [];
  const currentKeys = current.map((id) => String(id));

  let nextIds;
  if (role.exact) {
    nextIds = permissionIds;
  } else {
    // Add missing seeded; drop orphans / missing docs / inactive / not-in-wanted deleted modules
    const kept = [];
    for (const rawId of current) {
      const key = String(rawId);
      if (orphanSet.has(key)) continue;
      if (wanted.has(key)) {
        kept.push(rawId);
        continue;
      }
      // Not in wanted seed set — remove (deleted module / old permission)
      // (Admin should not keep Product/Category or removed pages)
    }
    const missing = permissionIds.filter((id) => !kept.some((k) => String(k) === String(id)));
    nextIds = uniqueIds([...kept, ...missing]);
  }

  const nextKeys = nextIds.map((id) => String(id));
  const added = nextKeys.filter((id) => !currentKeys.includes(id)).length;
  const removed = currentKeys.filter((id) => !nextKeys.includes(id)).length;

  if (added === 0 && removed === 0) {
    console.log(
      `⏭️  Role exists: ${existing.name} already has ${nextIds.length} permissions (clean)`
    );
    return;
  }

  await roles.updateOne(
    { _id: existing._id },
    {
      $set: {
        permissions: nextIds,
        description: role.description,
        updatedAt: new Date(),
      },
    }
  );
  console.log(
    `✅ Role updated: ${existing.name} → ${nextIds.length} permissions (+${added}, -${removed})`
  );
}

async function main() {
  const uri = getMongoUri();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000, family: 4 });
  console.log(`🔌 Connected: ${mongoose.connection.name}`);

  const seedList = await getSeedPermissions();
  const validModules = new Set(seedList.map((i) => i.module));

  console.log(
    `📋 ${seedList.length} modules to seed (permission only, no role: ${PERMISSION_ONLY_GROUPS.join(", ")})`
  );
  console.log("—— Modules ——");
  for (const item of seedList) {
    console.log(`   • [${item.group}] ${item.name} → ${item.module}`);
  }

  const db = mongoose.connection.db;
  const seeded = await seedPermissions(db, seedList);
  const validPermissionIds = new Set(seeded.map((p) => String(p.id)));

  console.log("—— Orphan / deleted-module permissions ——");
  const orphanIds = await deactivateOrphanPermissions(db, validModules);

  console.log("—— Clean all roles (missing + orphan perms) ——");
  await cleanAllRolesOfInvalidPermissions(db, orphanIds, validPermissionIds);

  console.log("—— Seed roles ——");
  for (const role of ROLES) {
    await seedRole(db, role, seeded, orphanIds);
  }

  console.log("🎉 Permission + role seeding finished");
}

main()
  .catch((err) => {
    console.error("❌ Seeder failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
