import { app, BrowserWindow, ipcMain, type WebContents } from "electron";
import { join } from "path";
import { channelViews } from "./channelViews.js";
import {
  getEnabledChannelIds,
  getSettings,
  setChannelPrefs,
  setHasSubmitted,
  setLayoutMode,
  setSearchShortcut,
} from "./settingsStore.js";
import { matchAcceleratorInput, DEFAULT_SEARCH_SHORTCUT } from "../shared/shortcut.js";
import type { ChannelPrefsMap, LayoutMode, RectBounds } from "../shared/types.js";

let mainWindow: BrowserWindow | null = null;
let searchShortcut = DEFAULT_SEARCH_SHORTCUT;
let suppressSearchShortcut = false;
const shortcutBound = new WeakSet<WebContents>();

function openSearchFromShortcut(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!mainWindow.isFocused()) return;
  mainWindow.webContents.send("shell:open-search");
}

function bindShortcutListener(wc: WebContents): void {
  if (shortcutBound.has(wc)) return;
  shortcutBound.add(wc);
  wc.on("before-input-event", (event, input) => {
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isFocused()) return;
    if (suppressSearchShortcut) return;
    if (!matchAcceleratorInput(searchShortcut, input)) return;
    event.preventDefault();
    openSearchFromShortcut();
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 720,
    minHeight: 600,
    title: "超级 AI 搜索",
    backgroundColor: "#0c0e12",
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  channelViews.attachWindow(mainWindow);
  channelViews.setWebContentsHook(bindShortcutListener);
  bindShortcutListener(mainWindow.webContents);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.on("did-fail-load", (_code, desc) => {
    console.error("[shell] did-fail-load:", desc);
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function sendChannelStates(
  updates: { channelId: string; status: string; error?: string; lastPrompt?: string }[],
): void {
  mainWindow?.webContents.send("channel:state-batch", updates);
}

ipcMain.handle("settings:get", () => getSettings());

ipcMain.handle("settings:set-layout", (_e, mode: LayoutMode) => {
  setLayoutMode(mode);
});

ipcMain.handle("settings:set-channel-prefs", (_e, prefs: ChannelPrefsMap) => {
  setChannelPrefs(prefs);
  channelViews.releaseChannelsNotIn(getEnabledChannelIds());
});

function sendInitProgress(progress: {
  phase: "loading" | "done";
  ready: number;
  total: number;
  failedIds: string[];
}): void {
  mainWindow?.webContents.send("channels:init-progress", progress);
}

ipcMain.handle("channels:initialize", async () => {
  const ids = getEnabledChannelIds();
  const result = await channelViews.preloadChannelsAsync(ids, sendInitProgress);
  return {
    phase: "done" as const,
    ready: result.total,
    total: result.total,
    failedIds: result.failedIds,
  };
});

ipcMain.handle("settings:set-has-submitted", (_e, value: boolean) => {
  setHasSubmitted(value);
});

ipcMain.handle("settings:set-search-shortcut", (_e, accel: string) => {
  setSearchShortcut(accel);
  searchShortcut = getSettings().searchShortcut;
  return searchShortcut;
});

ipcMain.on("shell:suppress-search-shortcut", (_e, suppress: boolean) => {
  suppressSearchShortcut = Boolean(suppress);
});

ipcMain.handle("channel:get-interactive", (_e, channelId: string) => {
  return channelViews.isChannelInteractive(channelId);
});

ipcMain.handle("channel:set-interactive", (_e, channelId: string | null) => {
  channelViews.setInteractiveChannel(channelId);
  mainWindow?.webContents.send("shell:interactive-changed", channelId);
  return channelId;
});

ipcMain.on("channel:request-activate", (_e, channelId: string) => {
  if (!channelId) return;
  channelViews.setInteractiveChannel(channelId);
  mainWindow?.webContents.send("shell:interactive-changed", channelId);
});

ipcMain.on(
  "channel:passthrough-wheel",
  (
    _e,
    payload: {
      channelId: string;
      deltaX: number;
      deltaY: number;
      deltaMode: number;
    },
  ) => {
    mainWindow?.webContents.send("shell:passthrough-wheel", {
      deltaX: payload.deltaX,
      deltaY: payload.deltaY,
      deltaMode: payload.deltaMode,
    });
  },
);

ipcMain.on("view:set-bounds", (_e, channelId: string, bounds: RectBounds) => {
  channelViews.setBounds(channelId, bounds);
});

ipcMain.on("view:hide-all", () => {
  channelViews.hideAll();
});

ipcMain.on("view:hide-except", (_e, channelId: string | null) => {
  channelViews.hideExcept(channelId);
});

ipcMain.handle("channel:reload", async (_e, channelId: string) => {
  await channelViews.reloadChannel(channelId);
});

ipcMain.handle("channel:get-url", (_e, channelId: string) => {
  return channelViews.getChannelUrl(channelId);
});

ipcMain.handle("prompt:retry-channel", async (_e, channelId: string, prompt: string) => {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("empty prompt");
  sendChannelStates([{ channelId, status: "loading", lastPrompt: trimmed }]);
  try {
    await channelViews.runFillAndSubmit(channelId, trimmed);
    sendChannelStates([{ channelId, status: "sent", lastPrompt: trimmed }]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendChannelStates([
      { channelId, status: "failed", error: message, lastPrompt: trimmed },
    ]);
    throw err;
  }
});

ipcMain.handle("prompt:dispatch", async (_e, prompt: string) => {
  const trimmed = prompt.trim();
  if (!trimmed) throw new Error("empty prompt");

  const ids = getEnabledChannelIds();
  if (ids.length === 0) throw new Error("no enabled channels");

  setHasSubmitted(true);

  const updates = ids.map((channelId) => ({
    channelId,
    status: "loading",
    lastPrompt: trimmed,
  }));
  sendChannelStates(updates);

  await Promise.allSettled(
    ids.map(async (channelId) => {
      try {
        await channelViews.runFillAndSubmit(channelId, trimmed);
        sendChannelStates([{ channelId, status: "sent", lastPrompt: trimmed }]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        sendChannelStates([
          { channelId, status: "failed", error: message, lastPrompt: trimmed },
        ]);
      }
    }),
  );

  return { ok: true };
});

ipcMain.handle("session:reset-all", async () => {
  const ids = getEnabledChannelIds();
  const total = ids.length;
  const failedIds: string[] = [];
  let ready = 0;

  const report = (phase: "loading" | "done") => {
    mainWindow?.webContents.send("channels:reset-progress", {
      phase,
      ready,
      total,
      failedIds: [...failedIds],
    });
  };

  report("loading");
  sendChannelStates(ids.map((channelId) => ({ channelId, status: "resetting" })));

  await Promise.allSettled(
    ids.map(async (channelId) => {
      try {
        await channelViews.resetSession(channelId);
        sendChannelStates([{ channelId, status: "idle" }]);
      } catch (err) {
        failedIds.push(channelId);
        const message = err instanceof Error ? err.message : String(err);
        sendChannelStates([{ channelId, status: "failed", error: message }]);
      } finally {
        ready += 1;
        report("loading");
      }
    }),
  );

  report("done");
  return { phase: "done" as const, ready: total, total, failedIds };
});

ipcMain.handle("session:reset-one", async (_e, channelId: string) => {
  sendChannelStates([{ channelId, status: "resetting" }]);
  try {
    await channelViews.resetSession(channelId);
    sendChannelStates([{ channelId, status: "idle" }]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendChannelStates([{ channelId, status: "failed", error: message }]);
    throw err;
  }
});

app.whenReady().then(() => {
  searchShortcut = getSettings().searchShortcut;
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
