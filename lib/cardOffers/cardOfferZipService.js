import AdmZip from "adm-zip";
import path from "path";
import { writeFile, mkdir, unlink } from "fs/promises";

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  ".webp",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".avif",
]);

/**
 * Validates image buffer magic bytes to prevent masquerading non-image files.
 * @param {Buffer} buffer
 * @param {string} ext
 * @returns {boolean}
 */
export function isValidImageContent(buffer, ext) {
  if (!buffer || buffer.length < 4) return false;

  const lowerExt = ext.toLowerCase();

  // PNG: 89 50 4E 47
  if (lowerExt === ".png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  // JPEG: FF D8 FF
  if (lowerExt === ".jpg" || lowerExt === ".jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // WEBP: "RIFF" .... "WEBP"
  if (lowerExt === ".webp") {
    if (buffer.length < 12) return false;
    const header = buffer.toString("ascii", 0, 4);
    const format = buffer.toString("ascii", 8, 12);
    return header === "RIFF" && format === "WEBP";
  }

  // GIF: GIF87a or GIF89a
  if (lowerExt === ".gif") {
    const header = buffer.toString("ascii", 0, 3);
    return header === "GIF";
  }

  // SVG: contains <svg
  if (lowerExt === ".svg") {
    const snippet = buffer.toString("utf8", 0, Math.min(buffer.length, 500)).toLowerCase();
    return snippet.includes("<svg") || snippet.includes("<?xml");
  }

  // AVIF: ftypavif
  if (lowerExt === ".avif") {
    if (buffer.length < 12) return false;
    const box = buffer.toString("ascii", 4, 12);
    return box.includes("ftyp");
  }

  return true;
}

/**
 * Parses the uploaded ZIP archive and builds a lookup map by canonicalized filename.
 * Protects against path traversal, macOS resource forks, hidden metadata, and corrupt archives.
 * @param {Buffer} zipBuffer
 * @returns {{
 *   totalEntries: number,
 *   entryMap: Map<string, AdmZip.IZipEntry>,
 *   findEntry: (filename: string) => AdmZip.IZipEntry | null
 * }}
 */
export function parseCardOffersZip(zipBuffer) {
  let zip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch (err) {
    throw new Error(`Failed to parse ZIP archive: Invalid or corrupted ZIP file.`);
  }

  let entries;
  try {
    entries = zip.getEntries();
  } catch (err) {
    throw new Error(`Failed to read ZIP entries: Invalid or corrupted archive.`);
  }

  if (!entries || entries.length === 0) {
    throw new Error(`ZIP archive is empty.`);
  }

  const entryMap = new Map();

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const rawName = entry.entryName || "";

    // Security: Skip path traversal attempts
    if (rawName.includes("..") || rawName.startsWith("/") || rawName.startsWith("\\")) {
      continue;
    }

    // Security: Skip macOS metadata folder and files (__MACOSX, .DS_Store, ._*)
    if (rawName.includes("__MACOSX") || rawName.includes(".DS_Store")) {
      continue;
    }

    const basename = path.basename(rawName).trim();

    // Security: Skip hidden files (starting with dot)
    if (basename.startsWith(".")) {
      continue;
    }

    const ext = path.extname(basename).toLowerCase();

    // Security: Only index permitted image extensions
    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      continue;
    }

    const lowerKey = basename.toLowerCase();

    // Prefer shallowest root-level entry if duplicates exist in zip subdirectories
    if (!entryMap.has(lowerKey) || !rawName.includes("/")) {
      entryMap.set(lowerKey, entry);
    }
  }

  return {
    totalEntries: entries.length,
    validImagesCount: entryMap.size,
    entryMap,
    findEntry(filename) {
      if (!filename) return null;
      const trimmed = String(filename).trim();
      // Security: Strictly reject path traversal sequences
      if (trimmed.includes("..") || trimmed.startsWith("/") || trimmed.startsWith("\\")) {
        return null;
      }
      const cleanBase = path.basename(trimmed).toLowerCase();
      return entryMap.get(cleanBase) || null;
    },
  };
}

/**
 * Extracts an image entry to the public cardoffers upload directory.
 * @param {AdmZip.IZipEntry} entry
 * @param {string|number} identifier
 * @returns {Promise<string>} Public URL path to the saved image (e.g. /uploads/cardoffers/...)
 */
export async function extractAndSaveImage(entry, identifier = "") {
  const uploadDir = path.resolve(process.cwd(), "public", "uploads", "cardoffers");
  await mkdir(uploadDir, { recursive: true });

  const rawBase = path.basename(entry.entryName);
  const ext = path.extname(rawBase).toLowerCase() || ".png";
  const nameWithoutExt = path.basename(rawBase, ext).replace(/[^a-zA-Z0-9_-]/g, "_");

  const uniqueSuffix = `${Date.now()}_${identifier}_${Math.floor(Math.random() * 1000)}`;
  const filename = `card-offer-${uniqueSuffix}-${nameWithoutExt}${ext}`;
  const fullPath = path.resolve(uploadDir, filename);

  // Security: Guard against path breakout
  if (!fullPath.startsWith(uploadDir)) {
    throw new Error("Security violation: Invalid target extraction path.");
  }

  const entryData = entry.getData();
  if (!entryData || entryData.length === 0) {
    throw new Error(`Corrupted or empty image entry in ZIP: "${rawBase}"`);
  }

  // Security: Validate image binary magic bytes
  if (!isValidImageContent(entryData, ext)) {
    throw new Error(`File "${rawBase}" does not match a valid ${ext} image binary signature.`);
  }

  await writeFile(fullPath, entryData);

  // Returns ONLY relative web path/URL — never binary, never buffer!
  return `/uploads/cardoffers/${filename}`;
}

/**
 * Safely removes any extracted files from disk if an import session is rolled back or fails.
 * @param {Array<string>} fileUrls Array of public URLs e.g. ["/uploads/cardoffers/..."]
 */
export async function cleanupExtractedFiles(fileUrls) {
  if (!Array.isArray(fileUrls) || fileUrls.length === 0) return;
  for (const url of fileUrls) {
    try {
      if (typeof url === "string" && url.startsWith("/uploads/cardoffers/")) {
        const localPath = path.resolve(process.cwd(), "public", url.replace(/^\//, ""));
        await unlink(localPath).catch(() => {});
      }
    } catch {
      // Ignore cleanup error
    }
  }
}
