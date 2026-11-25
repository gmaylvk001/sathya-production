import {
  originalUploadBasename,
  saveOriginalImageUpload,
} from "@/lib/saveOriginalUpload";

export async function saveSuperCategoryImage(file) {
  const saved = await saveOriginalImageUpload(
    file,
    "super-categories",
    `${Date.now()}-${originalUploadBasename(file)}`
  );
  return {
    path: saved.path,
    width: undefined,
    height: undefined,
  };
}
