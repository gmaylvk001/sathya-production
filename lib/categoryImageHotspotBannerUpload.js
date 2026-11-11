import {
  originalUploadBasename,
  saveOriginalImageUpload,
} from "@/lib/saveOriginalUpload";

export async function saveCategoryImageHotspotBannerImage(file) {
  const saved = await saveOriginalImageUpload(
    file,
    "category-image-hotspot-banner",
    `${Date.now()}-${originalUploadBasename(file)}`
  );
  return saved.path;
}
