import {
  originalUploadBasename,
  saveOriginalImageUpload,
} from "@/lib/saveOriginalUpload";

export async function saveWhyBuyIconImage(file) {
  const saved = await saveOriginalImageUpload(
    file,
    "why-buy-reasons",
    `${Date.now()}-${originalUploadBasename(file)}`
  );
  return {
    path: saved.path,
    width: undefined,
    height: undefined,
  };
}
