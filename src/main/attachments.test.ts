import { describe, expect, it, vi } from "vitest";
import { CompanionStore } from "./store";

vi.mock("./config", () => ({ config: {} }));

describe("composer attachment delivery", () => {
  it.each(["Describe this", ""])("delivers clipboard images with initial text %j", async (message) => {
    const commands: Array<{ tag: string; input: Record<string, unknown> }> = [];
    const store = new CompanionStore(
      () => {},
      () => {},
    );
    Object.assign(store, {
      pairing: { httpBaseUrl: "https://environment.test", environmentId: "env" },
      socket: {
        call: async (tag: string, input: Record<string, unknown>) => {
          commands.push({ tag, input });
          if (tag === "attachments.createUploadUrl")
            return { attachmentId: "pending-image", relativeUrl: "/upload", expiresAt: 1 };
          if (tag === "orchestration.launchThread") {
            // T3 Code's ThreadMessageIntake requires an ID to claim pending uploads.
            if (input.threadId === undefined)
              throw new Error("Uploaded attachments need a thread id at launch.");
            return { threadId: input.threadId };
          }
          return {};
        },
      },
    });
    using upload = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    const images = [
      {
        id: "draft-image",
        name: "clipboard.png",
        mimeType: "image/png",
        sizeBytes: 3,
        dataUrl: "data:image/png;base64,AQID",
      },
    ];
    const reference = {
      type: "image",
      id: "pending-image",
      name: "clipboard.png",
      mimeType: "image/png",
      sizeBytes: 3,
    };
    expect((await store.send("thread", "", null, images)).ok).toBe(true);
    expect(
      commands.find((command) => command.tag === "orchestration.dispatchCommand")?.input
        .attachments,
    ).toEqual([reference]);
    expect(upload.mock.calls[0]?.[0]).toBe("https://environment.test/upload");
    expect(Array.from(upload.mock.calls[0]?.[1]?.body as Uint8Array)).toEqual([1, 2, 3]);
    expect(
      await store.launch({
        projectId: "p",
        message,
        modelSelection: { instanceId: "codex", model: "test" },
        images,
      }),
    ).toEqual({ ok: true, value: { threadId: expect.any(String) } });
    expect(
      commands.find((command) => command.tag === "orchestration.launchThread")?.input
        .initialMessage,
    ).toMatchObject({ attachments: [reference] });
  });

  it("keeps a failed upload from dispatching a message and rejects invalid image bytes before upload", async () => {
    const calls: string[] = [];
    const store = new CompanionStore(
      () => {},
      () => {},
    );
    Object.assign(store, {
      pairing: { httpBaseUrl: "https://environment.test", environmentId: "env" },
      socket: {
        call: async (tag: string) => {
          calls.push(tag);
          return { attachmentId: "pending-image", relativeUrl: "/upload" };
        },
      },
    });
    using upload = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 413 }));
    const image = {
      id: "image",
      name: "clipboard.png",
      mimeType: "image/png",
      sizeBytes: 3,
      dataUrl: "data:image/png;base64,AQID",
    };
    expect(await store.send("thread", "Describe this", null, [image])).toEqual({
      ok: false,
      error: "Uploading clipboard.png failed (413). Try sending again.",
    });
    expect(calls).toEqual(["attachments.createUploadUrl", "attachments.delete"]);
    calls.length = 0;
    expect((await store.send("thread", "", null, [{ ...image, sizeBytes: 4 }])).ok).toBe(false);
    expect(
      (await store.send("thread", "", null, [{ ...image, sizeBytes: 11 * 1024 * 1024 }])).ok,
    ).toBe(false);
    expect(calls).toEqual([]);
    expect(upload).toHaveBeenCalledTimes(1);
  });
});
