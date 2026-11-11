import {
  originalUploadBasename,
  saveOriginalImageUpload,
} from "@/lib/saveOriginalUpload";

export async function saveCategoryBrandCarouselImage(file) {
  const saved = await saveOriginalImageUpload(
    file,
    "category-brand-carousel",
    `${Date.now()}-${originalUploadBasename(file)}`
  );
  return {
    path: saved.path,
    width: undefined,
    height: undefined,
  };
}
