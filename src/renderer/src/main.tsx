import "@fontsource-variable/inter";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";

// T3 Code's tokens switch on a `dark` class, which follows the system appearance here.
const appearance = window.matchMedia("(prefers-color-scheme: dark)");
const syncAppearance = () => document.documentElement.classList.toggle("dark", appearance.matches);
syncAppearance();
appearance.addEventListener("change", syncAppearance);

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
