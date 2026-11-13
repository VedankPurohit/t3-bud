import type { CompanionApi } from "../shared/types";

declare global {
  interface Window {
    readonly companion: CompanionApi;
  }
}

export {};
