import type { DesktopApi } from "../../preload/index.js";
import type { ChannelStatus, LayoutMode } from "@shared/types.js";

declare global {
  interface Window {
    desktopApi: DesktopApi;
  }
}

export type { ChannelStatus, LayoutMode };
