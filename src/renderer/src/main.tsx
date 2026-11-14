import "@fontsource-variable/inter";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { MascotWindow } from "./MascotWindow";

// Dark only, like T3 Tots: T3 Code's tokens switch on this class.
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    {new URLSearchParams(window.location.search).get("surface") === "mascot"
      ? <MascotWindow /> : <App />}
  </StrictMode>,
);
