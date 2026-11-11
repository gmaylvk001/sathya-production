import {
  originalUploadBasename,
  saveOriginalImageUpload,
} from "@/lib/saveOriginalUpload";

export async function saveCircleImageCarouselImage(file) {
  const saved = await saveOriginalImageUpload(
    file,
    "circle-image-carousel",
    `${Date.now()}-${originalUploadBasename(file)}`
  );
  return {
    path: saved.path,
    width: undefined,
    height: undefined,
  };
}
