import { unstable_cache } from "next/cache";
import dbConnect from "@/lib/db";
import NavbarSettings from "@/models/NavbarSettings";
import HeaderSettingsVersion from "@/models/HeaderSettingsVersion";
import { cloneDefaults, migrateLegacyNavbarSettings } from "@/lib/headerSettings";

const MAX_VERSIONS = 5;

/**
 * Fetch current header settings, auto-migrating legacy NavbarSettings or seeding defaults.
 */
export async function getOrSeedHeaderSettings() {
  await dbConnect();
  const doc = await NavbarSettings.findOne({ isActive: true }).sort({ updatedAt: -1 }).lean();

  if (!doc) {
    const defaults = cloneDefaults();
    await NavbarSettings.create({
      headerStyle: defaults.design,
      headerConfig: defaults,
      schemaVersion: 2,
      isActive: true,
    });
    return defaults;
  }

  const migrated = migrateLegacyNavbarSettings(doc);
  if (!doc.headerConfig) {
    await NavbarSettings.updateOne(
      { _id: doc._id },
      { $set: { headerConfig: migrated, schemaVersion: 2 } }
    );
  }
  return migrated;
}

/**
 * Cached server-side getter tagged with "header-settings" for SSR in app/layout.js.
 * Revalidated immediately via revalidateTag("header-settings") on Save/Reset/Restore.
 */
export const getCachedHeaderSettings = unstable_cache(
  async () => {
    try {
      return await getOrSeedHeaderSettings();
    } catch (err) {
      console.error("getCachedHeaderSettings fallback to defaults:", err);
      return cloneDefaults();
    }
  },
  ["header-settings-v2"],
  { tags: ["header-settings"], revalidate: 60 }
);

/**
 * Push a snapshot to HeaderSettingsVersion and prune to last MAX_VERSIONS (5).
 */
export async function pushHeaderVersionSnapshot(settings, adminUserId = null, note = "Saved settings") {
  if (!settings) return;
  await HeaderSettingsVersion.create({
    settings,
    savedBy: adminUserId || null,
    note,
  });

  const allVersions = await HeaderSettingsVersion.find({})
    .sort({ createdAt: -1 })
    .select("_id")
    .lean();

  if (allVersions.length > MAX_VERSIONS) {
    const idsToDelete = allVersions.slice(MAX_VERSIONS).map((v) => v._id);
    await HeaderSettingsVersion.deleteMany({ _id: { $in: idsToDelete } });
  }
}

/**
 * Save normalized headerConfig and sync legacy NavbarSettings fields for backward compatibility.
 */
export async function saveHeaderSettingsDoc(config) {
  await dbConnect();
  const syncLegacy = {
    headerStyle: config.design,
    flashSaleBadge: config.topbar.badge_text,
    flashSaleText: config.topbar.message,
    storeCountText: config.topbar.stores_text,
    helplineText: config.topbar.helpline,
    topBarBg: config.main.bg,
    searchBtnBg: config.main.search_btn_color,
    actionIconColor: config.main.icon_color,
    badgeBgColor: config.main.badge_color,
    bgType: config.menu.bg_type === "gradient" ? "gradient" : "solid",
    bgColor: config.menu.bg_single,
    gradientStart: config.menu.gradient.start,
    gradientEnd: config.menu.gradient.end,
    gradientDirection: config.menu.gradient.direction,
    textColor: config.menu.text_color,
    showTopBorder: config.menu.accent_line.enabled,
    topBorderColor: config.menu.accent_line.color,
    headerConfig: config,
    schemaVersion: 2,
    isActive: true,
  };

  await NavbarSettings.findOneAndUpdate(
    { isActive: true },
    { $set: syncLegacy },
    { new: true, upsert: true }
  );
  return config;
}
