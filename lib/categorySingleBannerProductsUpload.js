import {
  originalUploadBasename,
  saveOriginalImageUpload,
} from "@/lib/saveOriginalUpload";

export async function saveCategorySingleBannerProductsImage(file) {
  const saved = await saveOriginalImageUpload(
    file,
    "category-single-banner-products",
    `${Date.now()}-${originalUploadBasename(file)}`
  );
  return saved.path;
}
