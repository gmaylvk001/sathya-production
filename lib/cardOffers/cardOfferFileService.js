import path from "path";
import { unlink, stat } from "fs/promises";
import OfferTimer from "../../models/Offertimer.js";

const CARDOFFERS_DIR = path.resolve(process.cwd(), "public", "uploads", "cardoffers");

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
 * Extracts and sanitizes the basename of a card offer image path.
 * Strips URL protocol, query strings, hashes, and ensures no directory traversal.
 * @param {string} imagePath
 * @returns {string|null}
 */
export function getCardOfferFilename(imagePath) {
  if (!imagePath || typeof imagePath !== "string") return null;

  let clean = imagePath.trim().split("?")[0].split("#")[0];
  if (!clean) return null;

  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      clean = new URL(clean).pathname;
    } catch {
      // Keep clean as-is
    }
  }

  const filename = path.basename(clean).trim();
  if (!filename || filename === "." || filename === "..") {
    return null;
  }

  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return null;
  }

  return filename;
}

/**
 * Checks whether an image filename is still referenced by any remaining card offer in the database.
 * If another card offer (not being deleted) still uses this image, returns true.
 * @param {string} filename - Clean filename (e.g. card-offer-123.webp)
 * @param {string|number|null} targetTimerId - Timer ID currently being operated on
 * @param {Array<string|number>} deletingOfferIds - Offer IDs currently being deleted
 * @returns {Promise<boolean>}
 */
export async function isImageReferencedByOtherOffers(
  filename,
  targetTimerId = null,
  deletingOfferIds = []
) {
  if (!filename) return false;

  try {
    const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const timers = await OfferTimer.find({
      "card_offers.image": { $regex: regex },
    })
      .select("_id timerId custom_id card_offers")
      .lean();

    if (!timers || timers.length === 0) {
      return false;
    }

    const excludedOfferIdSet = new Set(deletingOfferIds.map(String));
    const targetTimerIdStr = targetTimerId ? String(targetTimerId) : null;

    for (const t of timers) {
      const isTargetTimer =
        targetTimerIdStr &&
        (String(t._id) === targetTimerIdStr ||
          String(t.timerId) === targetTimerIdStr ||
          String(t.custom_id) === targetTimerIdStr);

      if (Array.isArray(t.card_offers)) {
        for (const offer of t.card_offers) {
          if (!offer.image || typeof offer.image !== "string") continue;
          if (!offer.image.toLowerCase().includes(filename.toLowerCase())) continue;

          const currentOfferId = String(offer.id ?? offer.Id ?? "");
          if (isTargetTimer && excludedOfferIdSet.has(currentOfferId)) {
            // This is one of the offers being deleted
            continue;
          }

          // Found another active card offer referencing this image!
          return true;
        }
      }
    }

    return false;
  } catch (err) {
    console.error("[cardOfferFileService] Error checking DB image references:", err);
    // Erring on caution: if DB check fails, prevent deletion to avoid breaking active offers
    return true;
  }
}

/**
 * Safely and permanently deletes a single card offer image file from public/uploads/cardoffers.
 * Strictly isolated:
 * 1. Only operates strictly within process.cwd()/public/uploads/cardoffers.
 * 2. Blocks any directory traversal or paths outside the designated folder.
 * 3. Never deletes directories.
 * 4. Silently handles already-deleted or non-existent files without throwing.
 *
 * @param {string} imagePath - The image path stored in the DB or URL
 * @returns {Promise<boolean>} - True if file was successfully unlinked, false otherwise
 */
export async function deleteCardOfferImage(imagePath) {
  const filename = getCardOfferFilename(imagePath);
  if (!filename) return false;

  try {
    const targetPath = path.resolve(CARDOFFERS_DIR, filename);

    // Strict boundary verification
    if (
      !targetPath.startsWith(CARDOFFERS_DIR + path.sep) ||
      targetPath === CARDOFFERS_DIR
    ) {
      console.warn(
        `[cardOfferFileService] Security block: Path traversal attempt prevented: "${imagePath}"`
      );
      return false;
    }

    // Verify target exists and is a regular file
    const fileStat = await stat(targetPath).catch(() => null);
    if (!fileStat) {
      // File does not exist on disk
      return false;
    }

    if (!fileStat.isFile()) {
      console.warn(
        `[cardOfferFileService] Safety block: Target is not a regular file: "${targetPath}"`
      );
      return false;
    }

    await unlink(targetPath);
    console.log(
      `[cardOfferFileService] Successfully deleted card offer image from disk: "${filename}"`
    );
    return true;
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error(
        `[cardOfferFileService] Error unlinking image "${imagePath}":`,
        err
      );
    }
    return false;
  }
}

/**
 * Safely deletes multiple card offer image files with strict isolation and reference check.
 * @param {Array<string>} imagePaths - Array of image paths/URLs
 * @param {object} options
 * @param {string|number|null} options.targetTimerId - Timer ID being modified
 * @param {Array<string|number>} options.deletingOfferIds - Offer IDs being deleted
 * @returns {Promise<number>} - Count of files unlinked
 */
export async function deleteCardOfferImages(
  imagePaths,
  { targetTimerId = null, deletingOfferIds = [] } = {}
) {
  if (!Array.isArray(imagePaths) || imagePaths.length === 0) return 0;

  // Deduplicate filenames
  const uniqueFilenames = new Map();
  for (const imgPath of imagePaths) {
    const fn = getCardOfferFilename(imgPath);
    if (fn && !uniqueFilenames.has(fn)) {
      uniqueFilenames.set(fn, imgPath);
    }
  }

  let deletedCount = 0;
  for (const [filename, originalPath] of uniqueFilenames.entries()) {
    // Check if this image is still referenced by another card offer not being deleted
    const isReferenced = await isImageReferencedByOtherOffers(
      filename,
      targetTimerId,
      deletingOfferIds
    );

    if (!isReferenced) {
      const removed = await deleteCardOfferImage(originalPath);
      if (removed) {
        deletedCount++;
      }
    } else {
      console.log(
        `[cardOfferFileService] Preserved image "${filename}" as it is still referenced by another offer.`
      );
    }
  }

  return deletedCount;
}
