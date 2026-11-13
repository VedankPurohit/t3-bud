import type { CompanionState, ProjectSummary, Provider } from "@shared/types";
import { createContext, use } from "react";

/** Lookups every island piece needs, derived once from the live state. */
export interface IslandLookups {
  readonly state: CompanionState;
  readonly projectById: ReadonlyMap<string, ProjectSummary>;
  readonly providerById: ReadonlyMap<string, Provider>;
}

export const IslandContext = createContext<IslandLookups | null>(null);

export function useIsland(): IslandLookups {
  const value = use(IslandContext);
  if (!value) throw new Error("useIsland needs an IslandContext provider.");
  return value;
}

export function makeLookups(state: CompanionState): IslandLookups {
  return {
    state,
    projectById: new Map(state.projects.map((project) => [project.id, project])),
    providerById: new Map(state.providers.map((provider) => [provider.providerInstanceId, provider])),
  };
}

/** A provider instance's driver, which picks its mark; ids like "codex" double as drivers. */
export function driverOf(lookups: IslandLookups, instanceId: string | null): string | null {
  if (!instanceId) return null;
  return lookups.providerById.get(instanceId)?.driverKind ?? instanceId;
}
