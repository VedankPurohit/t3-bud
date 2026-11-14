import type { ProjectSummary, Provider } from "../../shared/types";
import type { ShellState } from "./shell";

export interface ConfigProvider {
  instanceId: string;
  driver: string;
  displayName?: string;
  iconUrl?: string;
  enabled: boolean;
  installed: boolean;
  status: string;
  availability?: string;
  models: Array<{
    slug: string;
    name?: string;
    capabilities?: {
      optionDescriptors?: Array<{
        id: string;
        options?: Array<{ id: string; isDefault?: boolean }>;
        currentValue?: string | boolean;
      }>;
    };
  }>;
}

export function toProjects(shell: ShellState): ProjectSummary[] {
  const lastActivity = new Map<string, number>();
  for (const thread of shell.threads.values()) {
    lastActivity.set(
      thread.projectId,
      Math.max(lastActivity.get(thread.projectId) ?? 0, Date.parse(thread.updatedAt)),
    );
  }
  return [...shell.projects.values()]
    .map((project) => ({
      id: project.id,
      title: project.title,
      workspaceRoot: project.workspaceRoot,
      archivedAt: project.archivedAt ?? null,
      faviconPath: project.faviconPath ?? null,
      projectIcon: project.projectIcon ?? null,
    }))
    .sort((left, right) => (lastActivity.get(right.id) ?? 0) - (lastActivity.get(left.id) ?? 0));
}

export type ProviderInstances = Readonly<Record<string, { config?: unknown }>>;

function providerIcon(provider: ConfigProvider, instances: ProviderInstances): string | undefined {
  if (provider.driver !== "acpRegistry") return provider.iconUrl;
  const value = instances[provider.instanceId]?.config;
  const config = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  if (config.source === "local") return undefined;
  const icon =
    typeof config.registryIconUrl === "string" ? config.registryIconUrl : provider.iconUrl;
  if (icon) {
    try {
      const url = new URL(icon);
      if (
        url.protocol === "https:" &&
        url.hostname === "cdn.agentclientprotocol.com" &&
        !url.port &&
        !url.username &&
        !url.password
      )
        return url.href;
    } catch {}
  }
  const agentId = config.agentId;
  return typeof agentId === "string" && /^[a-z0-9][a-z0-9._-]*$/.test(agentId)
    ? `https://cdn.agentclientprotocol.com/registry/v1/latest/${agentId}.svg`
    : undefined;
}

export function toProviders(
  providers: ConfigProvider[],
  instances: ProviderInstances = {},
): Provider[] {
  return providers.map((provider) => ({
    providerInstanceId: provider.instanceId,
    driverKind: provider.driver,
    displayName: provider.displayName ?? provider.instanceId,
    available:
      provider.enabled &&
      provider.installed &&
      provider.status === "ready" &&
      provider.availability !== "unavailable" &&
      provider.models.length > 0,
    iconUrl: providerIcon(provider, instances),
    models: provider.models.map((model) => ({
      id: model.slug,
      ...(model.name ? { label: model.name } : {}),
      // Select options only; booleans such as fast mode stay at their defaults.
      options: (model.capabilities?.optionDescriptors ?? [])
        .filter((descriptor) => Array.isArray(descriptor.options))
        .map((descriptor) => {
          const values = (descriptor.options ?? []).map((option) => option.id);
          const fallback = (descriptor.options ?? []).find((option) => option.isDefault)?.id;
          const current =
            typeof descriptor.currentValue === "string" ? descriptor.currentValue : fallback;
          return { id: descriptor.id, values, ...(current ? { default: current } : {}) };
        }),
    })),
  }));
}
