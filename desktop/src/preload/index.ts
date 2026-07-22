import { contextBridge, ipcRenderer } from "electron";
import type {
  AppSettings,
  ChannelInitProgressEvent,
  ChannelInitResult,
  ChannelPrefsMap,
  ChannelStateEvent,
  LayoutMode,
  RectBounds,
} from "../shared/types.js";

const api = {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke("settings:get"),
  setLayoutMode: (mode: LayoutMode): Promise<void> =>
    ipcRenderer.invoke("settings:set-layout", mode),
  setChannelPrefs: (prefs: ChannelPrefsMap): Promise<void> =>
    ipcRenderer.invoke("settings:set-channel-prefs", prefs),
  setHasSubmitted: (value: boolean): Promise<void> =>
    ipcRenderer.invoke("settings:set-has-submitted", value),
  setSearchShortcut: (accel: string): Promise<string> =>
    ipcRenderer.invoke("settings:set-search-shortcut", accel),
  setSuppressSearchShortcut: (suppress: boolean): void => {
    ipcRenderer.send("shell:suppress-search-shortcut", suppress);
  },
  setViewBounds: (channelId: string, bounds: RectBounds): void => {
    ipcRenderer.send("view:set-bounds", channelId, bounds);
  },
  hideAllViews: (): void => {
    ipcRenderer.send("view:hide-all");
  },
  hideViewsExcept: (channelId: string | null): void => {
    ipcRenderer.send("view:hide-except", channelId);
  },
  dispatchPrompt: (prompt: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke("prompt:dispatch", prompt),
  retryChannel: (channelId: string, prompt: string): Promise<void> =>
    ipcRenderer.invoke("prompt:retry-channel", channelId, prompt),
  resetAllSessions: (): Promise<ChannelInitResult> =>
    ipcRenderer.invoke("session:reset-all"),
  resetOneSession: (channelId: string): Promise<void> =>
    ipcRenderer.invoke("session:reset-one", channelId),
  reloadChannel: (channelId: string): Promise<void> =>
    ipcRenderer.invoke("channel:reload", channelId),
  getChannelUrl: (channelId: string): Promise<string> =>
    ipcRenderer.invoke("channel:get-url", channelId),
  initializeChannels: (): Promise<ChannelInitResult> =>
    ipcRenderer.invoke("channels:initialize"),
  onChannelInitProgress: (
    handler: (progress: ChannelInitProgressEvent) => void,
  ): (() => void) => {
    const listener = (_: unknown, progress: ChannelInitProgressEvent) =>
      handler(progress);
    ipcRenderer.on("channels:init-progress", listener);
    return () => ipcRenderer.removeListener("channels:init-progress", listener);
  },
  onChannelResetProgress: (
    handler: (progress: ChannelInitProgressEvent) => void,
  ): (() => void) => {
    const listener = (_: unknown, progress: ChannelInitProgressEvent) =>
      handler(progress);
    ipcRenderer.on("channels:reset-progress", listener);
    return () => ipcRenderer.removeListener("channels:reset-progress", listener);
  },
  onChannelStateBatch: (handler: (events: ChannelStateEvent[]) => void): (() => void) => {
    const listener = (_: unknown, events: ChannelStateEvent[]) => handler(events);
    ipcRenderer.on("channel:state-batch", listener);
    return () => ipcRenderer.removeListener("channel:state-batch", listener);
  },
  onOpenSearch: (handler: () => void): (() => void) => {
    const listener = () => handler();
    ipcRenderer.on("shell:open-search", listener);
    return () => ipcRenderer.removeListener("shell:open-search", listener);
  },
  setInteractiveChannel: (channelId: string | null): Promise<string | null> =>
    ipcRenderer.invoke("channel:set-interactive", channelId),
  onInteractiveChanged: (handler: (channelId: string | null) => void): (() => void) => {
    const listener = (_: unknown, channelId: string | null) => handler(channelId);
    ipcRenderer.on("shell:interactive-changed", listener);
    return () => ipcRenderer.removeListener("shell:interactive-changed", listener);
  },
  onPassthroughWheel: (
    handler: (payload: { deltaX: number; deltaY: number; deltaMode: number }) => void,
  ): (() => void) => {
    const listener = (
      _: unknown,
      payload: { deltaX: number; deltaY: number; deltaMode: number },
    ) => handler(payload);
    ipcRenderer.on("shell:passthrough-wheel", listener);
    return () => ipcRenderer.removeListener("shell:passthrough-wheel", listener);
  },
};

contextBridge.exposeInMainWorld("desktopApi", api);

export type DesktopApi = typeof api;
