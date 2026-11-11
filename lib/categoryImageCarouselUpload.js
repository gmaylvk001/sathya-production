import {
  originalUploadBasename,
  saveOriginalImageUpload,
} from "@/lib/saveOriginalUpload";

export async function saveCategoryImageCarouselImage(file) {
  const saved = await saveOriginalImageUpload(
    file,
    "category-image-carousel",
    `${Date.now()}-${originalUploadBasename(file)}`
  );
  return {
    path: saved.path,
    width: undefined,
    height: undefined,
  };
}
