import { saveOriginalImageUpload } from "@/lib/saveOriginalUpload";

export async function saveCategoryTopBannerImage(file) {
  const saved = await saveOriginalImageUpload(
    file,
    "category-topbanner",
    `${Date.now()}-topbanner`
  );
  return saved.path;
}
