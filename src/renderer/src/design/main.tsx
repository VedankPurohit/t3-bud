import "@fontsource-variable/inter";
import "./gallery.css";

import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import type { DesignVariant } from "./types";
import { variants } from "./variants";

/**
 * Gallery of companion design directions at real pixel size. State lives in the URL so reloads
 * and screenshots land on the same view: `?theme=light|dark`, `?variant=<id>`, `?screen=<id>`,
 * and `?all=1` to render every direction at once (used by scripts/shoot-design.mjs).
 */

type Theme = "light" | "dark";
type Mode = { readonly kind: "direction"; readonly variantId: string } | { readonly kind: "compare"; readonly screenId: string };

const SCREENS = [
  { id: "compact", label: "Folded" },
  { id: "inbox", label: "Inbox" },
  { id: "thread", label: "Thread" },
  { id: "attention", label: "Needs approval" },
  { id: "new-thread", label: "New thread" },
  { id: "model-picker", label: "Model picker" },
  { id: "empty", label: "Empty" },
] as const;

const WALLPAPER =
  "linear-gradient(135deg, oklch(0.62 0.09 240) 0%, oklch(0.47 0.12 285) 48%, oklch(0.36 0.08 320) 100%)";

function readUrl(): { theme: Theme; mode: Mode; all: boolean } {
  const params = new URLSearchParams(location.search);
  const theme: Theme =
    params.get("theme") === "light" || params.get("theme") === "dark"
      ? (params.get("theme") as Theme)
      : matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  const screen = params.get("screen");
  const variant = params.get("variant");
  const mode: Mode =
    screen && !variant
      ? { kind: "compare", screenId: screen }
      : { kind: "direction", variantId: variants.some((v) => v.id === variant) ? variant! : variants[0]!.id };
  return { theme, mode, all: params.get("all") === "1" };
}

function writeUrl(theme: Theme, mode: Mode) {
  const params = new URLSearchParams({ theme });
  if (mode.kind === "direction") params.set("variant", mode.variantId);
  else params.set("screen", mode.screenId);
  history.replaceState(null, "", `?${params}`);
}

/** One frame at real size on a desktop wallpaper, so floating pieces read as floating. */
function Frame(props: { label: string; width: number; height: number; shotId: string; children: React.ReactNode }) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline gap-2 text-xs font-medium text-white/85">
        {props.label}
        <span className="font-normal tabular-nums text-white/45">
          {props.width}×{props.height}
        </span>
      </figcaption>
      <div className="rounded-xl p-5 ring-1 ring-white/10" style={{ background: WALLPAPER }}>
        <div data-shot={props.shotId} className="relative" style={{ width: props.width, height: props.height }}>
          {props.children}
        </div>
      </div>
    </figure>
  );
}

function compactFrame(variant: DesignVariant) {
  const width = Math.max(variant.compactSize.width + 64, 200);
  const height = Math.max(variant.compactSize.height + 64, 150);
  return (
    <Frame key={`${variant.id}-compact`} label="Folded" width={width} height={height} shotId={`${variant.id}--compact`}>
      <div className="absolute right-3 bottom-3" style={variant.compactSize}>
        {variant.renderCompact()}
      </div>
    </Frame>
  );
}

/** Split view shows the open thread on its inbox screen, so a thread comparison falls back to it. */
const SCREEN_FALLBACKS: Record<string, string> = { thread: "inbox" };

function screenFrame(variant: DesignVariant, screenId: string, label?: string) {
  const screen =
    variant.screens.find((candidate) => candidate.id === screenId) ??
    variant.screens.find((candidate) => candidate.id === SCREEN_FALLBACKS[screenId]);
  if (!screen) return null;
  const size = screen.size ?? variant.panelSize;
  return (
    <Frame
      key={`${variant.id}-${screen.id}`}
      label={label ?? screen.label}
      width={size.width}
      height={size.height}
      shotId={`${variant.id}--${screen.id}`}
    >
      {screen.render()}
    </Frame>
  );
}

function Direction(props: { variant: DesignVariant }) {
  const { variant } = props;
  return (
    <section className="flex flex-col gap-6">
      <header className="max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight text-white">{variant.name}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-white/80">{variant.pitch}</p>
        <p className="mt-2 text-sm leading-relaxed text-white/55">{variant.layout}</p>
      </header>
      <div className="flex flex-wrap items-start gap-8">
        {compactFrame(variant)}
        {variant.screens.map((screen) => screenFrame(variant, screen.id))}
      </div>
    </section>
  );
}

function Compare(props: { screenId: string }) {
  return (
    <div className="flex flex-wrap items-start gap-8">
      {variants.map((variant) => {
        const frame = props.screenId === "compact" ? compactFrame(variant) : screenFrame(variant, props.screenId, variant.name);
        return frame ? (
          <div key={variant.id} className="flex flex-col gap-1">
            {props.screenId === "compact" ? <span className="text-sm font-medium text-white">{variant.name}</span> : null}
            {frame}
          </div>
        ) : null;
      })}
    </div>
  );
}

function Segmented<T extends string>(props: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={props.label} className="flex rounded-lg bg-white/10 p-0.5">
      {props.options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={props.value === option.value}
          onClick={() => props.onChange(option.value)}
          className={
            props.value === option.value
              ? "rounded-md bg-white px-3 py-1 text-xs font-medium text-neutral-900 shadow-sm"
              : "rounded-md px-3 py-1 text-xs font-medium text-white/75 hover:text-white"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Gallery() {
  const initial = readUrl();
  const [theme, setTheme] = useState<Theme>(initial.theme);
  const [mode, setMode] = useState<Mode>(initial.mode);

  // Keeps the page's theme class and URL in step with the controls.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (!initial.all) writeUrl(theme, mode);
  }, [theme, mode, initial.all]);

  if (initial.all) {
    return (
      <main className="flex flex-col gap-16 px-10 py-10">
        {variants.map((variant) => (
          <Direction key={variant.id} variant={variant} />
        ))}
      </main>
    );
  }

  const selected = mode.kind === "direction" ? variants.find((v) => v.id === mode.variantId) : null;
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#16151f]/90 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-10 py-4">
          <h1 className="text-base font-semibold text-white">T3 Companion · design directions</h1>
          <Segmented
            label="View"
            value={mode.kind}
            onChange={(kind) =>
              setMode(kind === "direction" ? { kind, variantId: variants[0]!.id } : { kind, screenId: "inbox" })
            }
            options={[
              { value: "direction", label: "One direction" },
              { value: "compare", label: "Compare a screen" },
            ]}
          />
          <div className="ml-auto">
            <Segmented
              label="Theme"
              value={theme}
              onChange={setTheme}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </div>
        </div>
        <nav className="flex flex-wrap gap-1.5 px-10 pb-3">
          {mode.kind === "direction"
            ? variants.map((variant) => (
                <TabButton
                  key={variant.id}
                  active={variant.id === mode.variantId}
                  onClick={() => {
                    setMode({ kind: "direction", variantId: variant.id });
                    scrollTo({ top: 0 });
                  }}
                >
                  {variant.name}
                </TabButton>
              ))
            : SCREENS.map((screen) => (
                <TabButton
                  key={screen.id}
                  active={screen.id === mode.screenId}
                  onClick={() => setMode({ kind: "compare", screenId: screen.id })}
                >
                  {screen.label}
                </TabButton>
              ))}
        </nav>
      </header>
      <main className="px-10 py-8">
        {selected ? <Direction variant={selected} /> : mode.kind === "compare" ? <Compare screenId={mode.screenId} /> : null}
      </main>
    </>
  );
}

function TabButton(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={
        props.active
          ? "rounded-full bg-white/90 px-3.5 py-1.5 text-xs font-medium text-neutral-900"
          : "rounded-full bg-white/8 px-3.5 py-1.5 text-xs font-medium text-white/75 ring-1 ring-white/10 hover:bg-white/15 hover:text-white"
      }
    >
      {props.children}
    </button>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
);
