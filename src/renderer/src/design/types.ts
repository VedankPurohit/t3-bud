import type { ReactNode } from "react";

export interface DesignScreen {
  /** Stable id used in screenshots: inbox, thread, new-thread, attention, empty, connect. */
  readonly id: string;
  readonly label: string;
  /** Overrides the variant's panel size for this screen, e.g. a taller thread view. */
  readonly size?: { readonly width: number; readonly height: number };
  readonly render: () => ReactNode;
}

/** One design direction for the companion, shown in the gallery at real pixel size. */
export interface DesignVariant {
  readonly id: string;
  readonly name: string;
  /** One sentence: what the direction is and why someone would pick it. */
  readonly pitch: string;
  /** Where it sits on screen and how it grows, e.g. "Blob bottom-right; 392×600 panel above it". */
  readonly layout: string;
  readonly compactSize: { readonly width: number; readonly height: number };
  readonly panelSize: { readonly width: number; readonly height: number };
  /** The always-visible folded state, drawn over a desktop backdrop. */
  readonly renderCompact: () => ReactNode;
  readonly screens: readonly DesignScreen[];
}
