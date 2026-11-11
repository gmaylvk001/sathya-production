import path from "path";
import { unlink, stat } from "fs/promises";
import OfferTimer from "@/models/Offertimer";

const TOPBANNER_DIR = path.resolve(process.cwd(), "public", "uploads", "topbanner");

const ALLOWED_EXTENSIONS = new Set([
  ".webp",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".avif",
]);

/**
 * Sanitize basename for offer-timer images under public/uploads/topbanner.
 */
export function getTopBannerFilename(imagePath) {
  if (!imagePath || typeof imagePath !== "string") return null;

  let clean = imagePath.trim().split("?")[0].split("#")[0];
  if (!clean) return null;

  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      clean = new URL(clean).pathname;
    } catch {
      // keep as-is
    }
  }

  const filename = path.basename(clean).trim();
  if (!filename || filename === "." || filename === "..") return null;

  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) return null;

  return filename;
}

async function isTopBannerReferencedByOtherTimers(filename, excludeTimerId) {
  if (!filename) return false;

  try {
    const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const others = await OfferTimer.find({
      _id: { $ne: excludeTimerId },
      $or: [
        { topBanner: { $regex: regex } },
        { top_banner_url: { $regex: regex } },
        { dealsPopupImage: { $regex: regex } },
        { popup_image_url: { $regex: regex } },
      ],
    })
      .select("_id")
      .limit(1)
      .lean();

    return Boolean(others?.length);
  } catch (err) {
    console.error("[offerTimerFileService] Error checking topbanner refs:", err);
    return true;
  }
}

/**
 * Safely unlink a file under public/uploads/topbanner only.
 */
export async function deleteTopBannerImage(imagePath, { excludeTimerId = null } = {}) {
  const filename = getTopBannerFilename(imagePath);
  if (!filename) return false;

  if (excludeTimerId) {
    const stillUsed = await isTopBannerReferencedByOtherTimers(filename, excludeTimerId);
    if (stillUsed) {
      console.log(
        `[offerTimerFileService] Preserved topbanner "${filename}" — still referenced by another timer.`
      );
      return false;
    }
  }

  try {
    const targetPath = path.resolve(TOPBANNER_DIR, filename);
    if (
      !targetPath.startsWith(TOPBANNER_DIR + path.sep) ||
      targetPath === TOPBANNER_DIR
    ) {
      console.warn(
        `[offerTimerFileService] Security block: path traversal prevented: "${imagePath}"`
      );
      return false;
    }

    const fileStat = await stat(targetPath).catch(() => null);
    if (!fileStat || !fileStat.isFile()) return false;

    await unlink(targetPath);
    console.log(`[offerTimerFileService] Deleted topbanner file: "${filename}"`);
    return true;
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error(`[offerTimerFileService] Error unlinking "${imagePath}":`, err);
    }
    return false;
  }
}

/**
 * Unlink top banner + deals popup images for a timer being deleted.
 */
export async function deleteOfferTimerBannerImages(timer) {
  if (!timer) return 0;

  const paths = [
    timer.topBanner,
    timer.top_banner_url,
    timer.dealsPopupImage,
    timer.popup_image_url,
  ].filter((p) => p && typeof p === "string" && p.trim() !== "");

  const seen = new Set();
  let deleted = 0;
  for (const imgPath of paths) {
    const fn = getTopBannerFilename(imgPath);
    if (!fn || seen.has(fn)) continue;
    seen.add(fn);
    const ok = await deleteTopBannerImage(imgPath, { excludeTimerId: timer._id });
    if (ok) deleted += 1;
  }
  return deleted;
}
