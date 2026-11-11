import path from "path";
import dbConnect from "../db.js";
import OfferTimer from "../../models/Offertimer.js";
import { parseCardOffersExcel } from "./cardOfferExcelService.js";
import { parseCardOffersZip, extractAndSaveImage, cleanupExtractedFiles } from "./cardOfferZipService.js";
import { getCardOfferCategoryHref } from "./cardOfferNavigationHelper.js";

/**
 * Finds an OfferTimer document by ObjectId, numeric timerId, or custom_id.
 * @param {string|number} timerId
 * @returns {Promise<any>}
 */
export async function findTimer(timerId) {
  if (!timerId) return null;
  let timer = null;

  try {
    timer = await OfferTimer.findById(timerId);
  } catch {
    // Not an ObjectId
  }

  if (!timer) {
    const num = Number(timerId);
    if (!Number.isNaN(num)) {
      timer = await OfferTimer.findOne({
        $or: [{ timerId: num }, { custom_id: num }],
      });
    }
  }

  return timer;
}

/**
 * Determines the next unique sequential ID for card offers across all OfferTimers.
 * @returns {Promise<number>}
 */
export async function getNextCardOfferId() {
  const allTimers = await OfferTimer.find().select("card_offers").lean();
  let maxId = 1129;

  for (const t of allTimers) {
    if (Array.isArray(t.card_offers)) {
      for (const item of t.card_offers) {
        const itemId = Number(item.id || item.Id);
        if (!Number.isNaN(itemId) && itemId > maxId) {
          maxId = itemId;
        }
      }
    }
  }

  return maxId + 1;
}

/**
 * Helper to match an Excel row against an existing card offer in the timer's card_offers array.
 * Enables idempotent repeat imports without creating duplicate records.
 * @param {Array<any>} existingOffers
 * @param {object} row
 * @returns {number} Index in existingOffers or -1
 */
function findExistingOfferIndex(existingOffers, row) {
  if (!Array.isArray(existingOffers) || existingOffers.length === 0) return -1;

  const rowImageBase = path.basename(row.imagePath || "").trim().toLowerCase();
  if (!rowImageBase) return -1;

  return existingOffers.findIndex((o) => {
    // Check against originalImageName if available
    const orig = path.basename(o.originalImageName || "").trim().toLowerCase();
    if (orig && orig === rowImageBase) return true;

    // Check if the saved image URL ends with the same filename
    if (o.image && typeof o.image === "string") {
      const existingBase = path.basename(o.image).toLowerCase();
      // e.g. card-offer-1789128...-1.webp vs 1.webp
      if (existingBase.endsWith(`-${rowImageBase}`) || existingBase === rowImageBase) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Imports Card Offers from Excel buffer and Images ZIP buffer into a specific Offer Timer.
 * Fully idempotent, safe against duplicates, validates row-by-row, and guarantees clean file/DB state.
 * @param {object} params
 * @param {Buffer} params.excelBuffer
 * @param {Buffer} params.zipBuffer
 * @param {string|number} params.timerId
 * @param {string} [params.excelFileName]
 * @param {string} [params.excelMimeType]
 * @returns {Promise<{
 *   success: boolean,
 *   totalRows: number,
 *   validRows: number,
 *   invalidRows: number,
 *   zipImages: number,
 *   matchedImages: number,
 *   unmatchedImages: number,
 *   createdCount: number,
 *   updatedCount: number,
 *   failedCount: number,
 *   errors: Array<{ row: number, title?: string, message: string }>,
 *   data: Array<any>,
 *   timer: object
 * }>}
 */
export async function importCardOffers({
  excelBuffer,
  zipBuffer,
  timerId,
  excelFileName = "",
  excelMimeType = "",
}) {
  await dbConnect();

  if (!timerId) {
    throw new Error("Offer Timer ID is required.");
  }

  const timer = await findTimer(timerId);
  if (!timer) {
    throw new Error(`Offer Timer with ID "${timerId}" not found.`);
  }

  // 1. Parse Excel / CSV
  const parsedExcel = parseCardOffersExcel(excelBuffer, {
    fileName: excelFileName,
    mimeType: excelMimeType,
  });

  // 2. Parse ZIP
  const zipHelper = parseCardOffersZip(zipBuffer);

  // 3. Initialize tracking collections
  let nextId = await getNextCardOfferId();
  if (!Array.isArray(timer.card_offers)) {
    timer.card_offers = [];
  }

  const newlyExtractedFileUrls = [];
  const processedOffers = [];
  const errors = [];
  const matchedImageKeys = new Set();

  let createdCount = 0;
  let updatedCount = 0;

  try {
    // 4. Validate & process row by row with controlled execution
    for (const row of parsedExcel.rows) {
      const rowNum = row.rowNumber;
      const rowTitle = row.title;

      // Validation: Title required
      if (!rowTitle) {
        errors.push({
          row: rowNum,
          title: "(Empty Title)",
          message: "Title is required",
        });
        continue;
      }

      // Validation: Image specified
      if (!row.imagePath) {
        errors.push({
          row: rowNum,
          title: rowTitle,
          message: "Image file reference missing in Excel",
        });
        continue;
      }

      // Validation: Image exists inside ZIP
      const zipEntry = zipHelper.findEntry(row.imagePath);
      if (!zipEntry) {
        errors.push({
          row: rowNum,
          title: rowTitle,
          message: `Image file missing (${row.imagePath} not found in ZIP)`,
        });
        continue;
      }

      // Mark matched image
      matchedImageKeys.add(zipEntry.entryName.toLowerCase());

      // Validation: Dates
      if (row.rawStartDate && !row.startDate) {
        errors.push({
          row: rowNum,
          title: rowTitle,
          message: `Invalid start date: "${row.rawStartDate}"`,
        });
        continue;
      }

      if (row.rawEndDate && !row.endDate) {
        errors.push({
          row: rowNum,
          title: rowTitle,
          message: `Invalid end date: "${row.rawEndDate}"`,
        });
        continue;
      }

      // 5. Check if record already exists in timer.card_offers (Idempotency)
      const existingIdx = findExistingOfferIndex(timer.card_offers, row);

      let targetId;
      let isUpdate = false;
      let existingRecord = null;

      if (existingIdx !== -1) {
        isUpdate = true;
        existingRecord = timer.card_offers[existingIdx];
        targetId = existingRecord.id ?? existingRecord.Id ?? nextId;
      } else {
        targetId = nextId;
      }

      // 6. Extract and persist image safely to disk
      const savedImagePath = await extractAndSaveImage(zipEntry, targetId);
      newlyExtractedFileUrls.push(savedImagePath);

      const defaultStart = timer.startDate || timer.offer_start || new Date();
      const defaultEnd =
        timer.endDate || timer.offer_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const resolvedTimerNumericId = timer.timerId ?? timer.custom_id ?? Number(timerId) ?? 1;

      const rawRedirect = String(row.redirectUrl || "").trim();
      const resolvedRedirect =
        rawRedirect ||
        getCardOfferCategoryHref({
          title: rowTitle,
          description: row.description,
          offerName: row.offerName,
          originalImageName: row.imagePath,
        });

      const cardOfferDoc = {
        id: targetId,
        Id: targetId,
        title: rowTitle,
        category: row.category || existingRecord?.category || "",
        description: row.description || "",
        image: savedImagePath, // Strictly path/URL string, NEVER binary or buffer!
        originalImageName: row.imagePath,
        redirectUrl: resolvedRedirect,
        redirect_url: resolvedRedirect,
        offerTimerId: resolvedTimerNumericId,
        OfferTimerID: resolvedTimerNumericId,
        startDate: row.startDate || defaultStart,
        endDate: row.endDate || defaultEnd,
        state: row.state || timer.state || "all",
        orderBy: row.orderBy,
        offerName: row.offerName || "",
        status: "active",
        createdAt: isUpdate && existingRecord?.createdAt ? existingRecord.createdAt : new Date(),
        updatedAt: new Date(),
      };

      if (isUpdate) {
        // Update in-place
        timer.card_offers[existingIdx] = cardOfferDoc;
        updatedCount++;
      } else {
        // Create new
        timer.card_offers.push(cardOfferDoc);
        createdCount++;
        nextId++;
      }

      processedOffers.push(cardOfferDoc);
    }

    // 7. Persist to MongoDB
    if (processedOffers.length > 0) {
      timer.markModified("card_offers");
      await timer.save();
    }
  } catch (err) {
    // Failure rollback: Clean up newly created disk images
    console.error("Import session failed, cleaning up extracted files:", err);
    await cleanupExtractedFiles(newlyExtractedFileUrls);
    throw err;
  }

  const validRowsCount = processedOffers.length;
  const invalidRowsCount = errors.length;
  const totalZipImages = zipHelper.entryMap.size;
  const matchedImagesCount = matchedImageKeys.size;
  const unmatchedImagesCount = Math.max(0, totalZipImages - matchedImagesCount);

  return {
    success: true,
    totalRows: parsedExcel.totalRows,
    validRows: validRowsCount,
    invalidRows: invalidRowsCount,
    zipImages: totalZipImages,
    matchedImages: matchedImagesCount,
    unmatchedImages: unmatchedImagesCount,
    createdCount,
    updatedCount,
    failedCount: invalidRowsCount,
    importedCount: validRowsCount,
    errors,
    data: processedOffers,
    timer: {
      _id: String(timer._id),
      timerId: timer.timerId ?? timer.custom_id,
      offerTitle: timer.offerTitle || timer.offer_title,
      totalCards: timer.card_offers.length,
    },
  };
}
