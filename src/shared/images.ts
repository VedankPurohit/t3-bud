import type { DraftImage } from "./types";

// T3 Code's chatAttachment contract limits apply before minting an upload URL.
export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function imageLimitError(
  images: readonly Pick<DraftImage, "name" | "mimeType" | "sizeBytes">[],
) {
  if (images.length > 100) return "You can attach up to 100 images per message.";
  for (const image of images) {
    if (!IMAGE_MIME_TYPES.includes(image.mimeType)) return "Attach PNG, JPEG, GIF, or WebP images.";
    if (!Number.isInteger(image.sizeBytes) || image.sizeBytes <= 0)
      return `${image.name} is empty or unreadable.`;
    if (image.sizeBytes > MAX_IMAGE_BYTES) return `${image.name} exceeds the 10 MB image limit.`;
    if (!image.name.trim() || image.name.length > 255)
      return "The image name must contain 1 to 255 characters.";
  }
  if (images.reduce((total, image) => total + image.sizeBytes, 0) > 80 * 1024 * 1024)
    return "Images in one message must total 80 MB or less.";
  return null;
}
