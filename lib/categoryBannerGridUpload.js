import {
  originalUploadBasename,
  saveOriginalImageUpload,
} from "@/lib/saveOriginalUpload";

export async function saveCategoryBannerGridImage(file) {
  const saved = await saveOriginalImageUpload(
    file,
    "category-banner-grid",
    `${Date.now()}-${originalUploadBasename(file)}`
  );
  return saved.path;
}
