import { describe, expect, it } from "vitest";

import { toProjects, toProviders } from "./catalog";
import { emptyShell } from "./shell";

describe("companion catalog", () => {
  it("retains saved project identities, including archived projects referenced by threads", () => {
    const project = {
      id: "hermes",
      title: "Hermes",
      workspaceRoot: "/work/hermes",
      faviconPath: "brand.svg",
      projectIcon: { kind: "monogram", text: "HE", color: "violet" },
      archivedAt: "2026-11-01T00:00:00Z",
    } as const;
    expect(toProjects({ ...emptyShell, projects: new Map([[project.id, project]]) })).toEqual([
      expect.objectContaining({
        projectIcon: project.projectIcon,
        faviconPath: "brand.svg",
        archivedAt: project.archivedAt,
      }),
    ]);
  });

  it("retains provider identity when an instance is unavailable and updates its selectable state", () => {
    const provider = {
      instanceId: "claudeAgent_hermes",
      driver: "claudeAgent",
      displayName: "Hermes",
      iconUrl: "https://example.test/icon.svg",
      enabled: false,
      installed: true,
      status: "error",
      models: [{ slug: "claude-sonnet-4-5" }],
    };
    expect(toProviders([provider])).toEqual([
      expect.objectContaining({
        providerInstanceId: provider.instanceId,
        driverKind: "claudeAgent",
        iconUrl: provider.iconUrl,
        available: false,
      }),
    ]);
    expect(toProviders([{ ...provider, enabled: true, status: "ready" }])[0]).toMatchObject({
      available: true,
    });
    const registry = { ...provider, driver: "acpRegistry", iconUrl: undefined };
    expect(
      toProviders([registry], { [provider.instanceId]: { config: { agentId: "hermes" } } })[0],
    ).toMatchObject({
      iconUrl: "https://cdn.agentclientprotocol.com/registry/v1/latest/hermes.svg",
    });
    expect(
      toProviders([registry], {
        [provider.instanceId]: { config: { source: "local", agentId: "hermes" } },
      })[0]?.iconUrl,
    ).toBeUndefined();
  });
});
