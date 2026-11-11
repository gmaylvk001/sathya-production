import {
  originalUploadBasename,
  saveOriginalImageUpload,
} from "@/lib/saveOriginalUpload";

export async function saveCategorySplitBannerImage(file) {
  const saved = await saveOriginalImageUpload(
    file,
    "category-split-banner",
    `${Date.now()}-${originalUploadBasename(file)}`
  );
  return saved.path;
}
