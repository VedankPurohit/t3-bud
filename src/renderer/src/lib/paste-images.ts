import type { DraftImage } from "@shared/types";
import { imageLimitError } from "@shared/images";

export function clipboardImages(clipboard: Pick<DataTransfer, "files" | "items">): File[] {
  const files = Array.from(clipboard.files);
  const candidates = files.length
    ? files
    : Array.from(clipboard.items).flatMap((item) => {
        const file = item.kind === "file" ? item.getAsFile() : null;
        return file ? [file] : [];
      });
  return candidates.filter((file) => file.type.startsWith("image/"));
}

export async function prepareImages(
  files: readonly File[],
  existing: readonly DraftImage[],
): Promise<DraftImage[]> {
  const metadata = files.map((file) => ({
    name: file.name || "clipboard.png",
    mimeType: file.type,
    sizeBytes: file.size,
  }));
  const error = imageLimitError([...existing, ...metadata]);
  if (error) throw new Error(error);
  return Promise.all(
    files.map(
      (file, index) =>
        new Promise<DraftImage>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              ...metadata[index]!,
              id: crypto.randomUUID(),
              dataUrl: String(reader.result),
            });
          reader.onerror = () =>
            reject(new Error(`Could not read ${file.name}. Try pasting again.`));
          reader.readAsDataURL(file);
        }),
    ),
  );
}
