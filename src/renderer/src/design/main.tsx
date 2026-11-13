import "@fontsource-variable/inter";
import "../styles.css";

import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

import type { DesignVariant } from "./types";
import { variants } from "./variants";

/**
 * Gallery of companion design directions at real pixel size. URL params narrow it for screenshots:
 * `?variant=<id>`, `?theme=light|dark`, `?screen=<id>|compact`.
 */
const params = new URLSearchParams(location.search);
const onlyVariant = params.get("variant");
const onlyScreen = params.get("screen");

function setTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
}
setTheme(
  (params.get("theme") as "light" | "dark" | null) ??
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
);

/** A stand-in desktop so floating pieces read as floating. */
const backdrop =
  "linear-gradient(135deg, oklch(0.55 0.08 250) 0%, oklch(0.42 0.1 290) 45%, oklch(0.32 0.06 320) 100%)";

function Frame(props: {
  label: string;
  width: number;
  height: number;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-xs font-medium text-white/80">
        {props.label}{" "}
        <span className="font-normal text-white/50">
          {props.width}×{props.height}
        </span>
      </figcaption>
      <div
        data-shot={props.testId}
        className="relative overflow-hidden rounded-md ring-1 ring-white/10"
        style={{ width: props.width, height: props.height, background: "transparent" }}
      >
        {props.children}
      </div>
    </figure>
  );
}

function VariantSection(props: { variant: DesignVariant }) {
  const { variant } = props;
  const showCompact = !onlyScreen || onlyScreen === "compact";
  const screens = variant.screens.filter((screen) => !onlyScreen || screen.id === onlyScreen);
  return (
    <section id={variant.id} className="flex flex-col gap-4 border-t border-white/10 py-8">
      <header className="max-w-3xl">
        <h2 className="text-xl font-semibold text-white">{variant.name}</h2>
        <p className="mt-1 text-sm text-white/80">{variant.pitch}</p>
        <p className="mt-1 text-xs text-white/55">{variant.layout}</p>
      </header>
      <div className="flex flex-wrap items-start gap-8">
        {showCompact ? (
          <Frame
            label="Folded"
            width={Math.max(variant.compactSize.width + 80, 220)}
            height={Math.max(variant.compactSize.height + 80, 160)}
            testId={`${variant.id}--compact`}
          >
            <div className="absolute right-4 bottom-4" style={variant.compactSize}>
              {variant.renderCompact()}
            </div>
          </Frame>
        ) : null}
        {screens.map((screen) => {
          const size = screen.size ?? variant.panelSize;
          return (
            <Frame
              key={screen.id}
              label={screen.label}
              width={size.width}
              height={size.height}
              testId={`${variant.id}--${screen.id}`}
            >
              {screen.render()}
            </Frame>
          );
        })}
      </div>
    </section>
  );
}

function Gallery() {
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const shown = variants.filter((variant) => !onlyVariant || variant.id === onlyVariant);
  return (
    <main className="min-h-screen px-10 py-8" style={{ background: backdrop }}>
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold text-white">T3 Companion · design directions</h1>
        <button
          type="button"
          onClick={() => {
            setTheme(dark ? "light" : "dark");
            setDark(!dark);
          }}
          className="rounded-md bg-white/15 px-3 py-1 text-xs font-medium text-white hover:bg-white/25"
        >
          {dark ? "Dark" : "Light"} theme
        </button>
        <nav className="flex flex-wrap gap-3 text-xs text-white/70">
          {shown.map((variant) => (
            <a key={variant.id} href={`#${variant.id}`} className="hover:text-white">
              {variant.name}
            </a>
          ))}
        </nav>
      </div>
      {shown.map((variant) => (
        <VariantSection key={variant.id} variant={variant} />
      ))}
    </main>
  );
}

// The gallery page paints its own backdrop; the companion's transparent rule targets the app.
document.documentElement.style.setProperty("background", "#1d1b2e", "important");

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
);
