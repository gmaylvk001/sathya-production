import {
  originalUploadBasename,
  saveOriginalImageUpload,
} from "@/lib/saveOriginalUpload";

export async function saveCategoryBannerFourProductsImage(file) {
  const saved = await saveOriginalImageUpload(
    file,
    "category-banner-four-products",
    `${Date.now()}-${originalUploadBasename(file)}`
  );
  return saved.path;
}
