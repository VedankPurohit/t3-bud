import { expect, it } from "vitest";
import type { DraftImage } from "../../../shared/types";
import { createImageDraftStore, unsentImages, type ImageDraftStorage } from "./image-drafts";

it("restores image drafts after reopening and removes only images included in a successful send", async () => {
  const disk = new Map<string, readonly DraftImage[]>();
  const storage: ImageDraftStorage = {
    read: async (key) => disk.get(key) ?? [],
    write: async (key, images) => {
      disk.set(key, images);
    },
  };
  const image = {
    id: "first",
    name: "image.png",
    mimeType: "image/png",
    sizeBytes: 3,
    dataUrl: "data:image/png;base64,AQID",
  };
  const before = createImageDraftStore(storage);
  await before.write("thread", [image]);
  const reopened = createImageDraftStore(storage);
  expect(await reopened.read("thread")).toEqual([image]);
  expect(await reopened.read("other-thread")).toEqual([]);
  const addedWhileSending = { ...image, id: "second" };
  await reopened.write("thread", [image, addedWhileSending]);
  await reopened.write("thread", unsentImages(await reopened.read("thread"), [image]));
  expect(await createImageDraftStore(storage).read("thread")).toEqual([addedWhileSending]);
});

it("keeps image drafts in memory when persistence fails", async () => {
  const store = createImageDraftStore({
    read: async () => {
      throw new Error("unavailable");
    },
    write: async () => {
      throw new Error("full");
    },
  });
  const image = {
    id: "image",
    name: "image.png",
    mimeType: "image/png",
    sizeBytes: 3,
    dataUrl: "data:image/png;base64,AQID",
  };
  expect(await store.read("thread")).toEqual([]);
  expect(await store.write("thread", [image])).toBe(false);
  expect(await store.read("thread")).toEqual([image]);
});
