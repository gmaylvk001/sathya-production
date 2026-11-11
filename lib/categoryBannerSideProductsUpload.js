import {
  originalUploadBasename,
  saveOriginalImageUpload,
} from "@/lib/saveOriginalUpload";

export async function saveCategoryBannerSideProductsImage(file) {
  const saved = await saveOriginalImageUpload(
    file,
    "category-banner-side-products",
    `${Date.now()}-${originalUploadBasename(file)}`
  );
  return saved.path;
}
