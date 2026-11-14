import type { DraftImage, ImageAttachment } from "../../shared/types";
import { imageLimitError } from "../../shared/images";
import type { RpcSocket } from "./rpc";

export async function uploadImages(
  socket: Pick<RpcSocket, "call">,
  httpBaseUrl: string,
  images: readonly DraftImage[],
) {
  const error = imageLimitError(images);
  if (error) throw new Error(error);
  const uploaded: ImageAttachment[] = [];
  try {
    for (const image of images) {
      const prefix = `data:${image.mimeType};base64,`;
      if (!image.dataUrl.startsWith(prefix))
        throw new Error(`${image.name} has invalid image data.`);
      const bytes = Buffer.from(image.dataUrl.slice(prefix.length), "base64");
      if (bytes.length !== image.sizeBytes)
        throw new Error(`${image.name} has incomplete image data.`);
      const { attachmentId, relativeUrl } = await socket.call<{
        attachmentId: string;
        relativeUrl: string;
      }>("attachments.createUploadUrl", {
        name: image.name,
        mimeType: image.mimeType,
        sizeBytes: bytes.length,
      });
      uploaded.push({
        type: "image",
        id: attachmentId,
        name: image.name,
        mimeType: image.mimeType,
        sizeBytes: bytes.length,
      });
      const url = new URL(relativeUrl, httpBaseUrl);
      if (url.origin !== new URL(httpBaseUrl).origin)
        throw new Error("T3 Code returned an invalid upload address.");
      const response = await fetch(url.href, {
        method: "POST",
        headers: { "content-type": image.mimeType },
        body: new Uint8Array(bytes),
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok)
        throw new Error(`Uploading ${image.name} failed (${response.status}). Try sending again.`);
    }
    return uploaded;
  } catch (error) {
    await releaseImages(socket, uploaded);
    throw error;
  }
}

export async function releaseImages(
  socket: Pick<RpcSocket, "call">,
  images: readonly ImageAttachment[],
) {
  await Promise.allSettled(
    images.map((image) => socket.call("attachments.delete", { attachmentId: image.id })),
  );
}
