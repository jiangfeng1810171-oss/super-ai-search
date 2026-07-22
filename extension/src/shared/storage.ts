import type { StoredSettings } from "./types.js";
import { defaultChannelPrefs } from "./channels.js";

const SETTINGS_KEY = "settings";

export async function loadSettings(): Promise<StoredSettings> {
  const data = await chrome.storage.sync.get(SETTINGS_KEY);
  const raw = data[SETTINGS_KEY] as StoredSettings | undefined;
  const defaults = defaultChannelPrefs();
  if (!raw?.channelPrefs) {
    return { channelPrefs: defaults };
  }
  const merged = { ...defaults, ...raw.channelPrefs };
  for (const id of Object.keys(defaults)) {
    if (!merged[id]) merged[id] = defaults[id];
  }
  return { channelPrefs: merged };
}

export async function saveSettings(settings: StoredSettings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

export async function getEnabledChannelIds(): Promise<string[]> {
  const s = await loadSettings();
  return Object.entries(s.channelPrefs)
    .filter(([, v]) => v.enabled)
    .map(([id]) => id);
}
