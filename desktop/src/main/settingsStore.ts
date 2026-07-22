import Store from "electron-store";
import {
  CHANNELS,
  defaultChannelPrefs,
  normalizeChannelPrefs,
} from "../shared/channels.js";
import { DEFAULT_SEARCH_SHORTCUT } from "../shared/shortcut.js";
import type { AppSettings, ChannelPrefsMap, LayoutMode } from "../shared/types.js";

const defaults: AppSettings = {
  channelPrefs: defaultChannelPrefs(),
  layoutMode: "cards",
  hasSubmitted: false,
  searchShortcut: DEFAULT_SEARCH_SHORTCUT,
};

const store = new Store<AppSettings>({
  name: "settings",
  defaults,
});

export function getSettings(): AppSettings {
  const raw = store.store;
  const prefs = normalizeChannelPrefs(
    raw.channelPrefs as Record<string, unknown> | undefined,
  );
  return {
    channelPrefs: prefs,
    layoutMode: raw.layoutMode ?? "cards",
    hasSubmitted: raw.hasSubmitted ?? false,
    searchShortcut: raw.searchShortcut?.trim() || DEFAULT_SEARCH_SHORTCUT,
  };
}

export function setLayoutMode(mode: LayoutMode): void {
  store.set("layoutMode", mode);
}

export function setChannelPrefs(prefs: ChannelPrefsMap): void {
  store.set("channelPrefs", normalizeChannelPrefs(prefs as Record<string, unknown>));
}

export function setHasSubmitted(value: boolean): void {
  store.set("hasSubmitted", value);
}

export function setSearchShortcut(accel: string): void {
  const next = accel.trim() || DEFAULT_SEARCH_SHORTCUT;
  store.set("searchShortcut", next);
}

export function getEnabledChannelIds(): string[] {
  const prefs = getSettings().channelPrefs;
  return CHANNELS.filter((c) => prefs[c.id]?.enabled !== false).map((c) => c.id);
}
