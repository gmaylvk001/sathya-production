import {
  originalUploadBasename,
  saveOriginalImageUpload,
} from "@/lib/saveOriginalUpload";

export async function saveCategoryImageColumnsImage(file) {
  const saved = await saveOriginalImageUpload(
    file,
    "category-image-columns",
    `${Date.now()}-${originalUploadBasename(file)}`
  );
  return saved.path;
}
