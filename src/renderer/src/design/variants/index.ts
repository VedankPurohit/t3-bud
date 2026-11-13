import type { DesignVariant } from "../types";
import { variant as commandBar } from "./command-bar";
import { variant as edgeDrawer } from "./edge-drawer";
import { variant as island } from "./island";
import { variant as notificationStack } from "./notification-stack";
import { variant as sidebarTwin } from "./sidebar-twin";
import { variant as splitView } from "./split-view";

export const variants: DesignVariant[] = [
  sidebarTwin,
  splitView,
  edgeDrawer,
  island,
  commandBar,
  notificationStack,
];
