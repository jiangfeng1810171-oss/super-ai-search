import { CHANNELS, getChannelById } from "../shared/channels.js";
import { getEnabledChannelIds } from "../shared/storage.js";
import { FILL_MESSAGE } from "../shared/types.js";

const FILL_RETRY_MS = 500;
const FILL_MAX_ATTEMPTS = 24;

function waitTabComplete(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("tab load timeout"));
    }, 60000);

    function listener(
      updatedTabId: number,
      info: chrome.tabs.TabChangeInfo,
    ): void {
      if (updatedTabId !== tabId || info.status !== "complete") return;
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        clearTimeout(timeout);
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (tab.status === "complete") {
        clearTimeout(timeout);
        resolve();
        return;
      }
      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendFill(
  tabId: number,
  channelId: string,
  prompt: string,
): Promise<void> {
  let lastError = "";
  for (let i = 0; i < FILL_MAX_ATTEMPTS; i++) {
    try {
      const res = await chrome.tabs.sendMessage(tabId, {
        type: FILL_MESSAGE,
        channelId,
        prompt,
      });
      if (res?.ok) return;
      lastError = res?.error ?? "fill failed";
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    await sleep(FILL_RETRY_MS);
  }
  throw new Error(lastError || "fill failed");
}

async function dispatchPromptToChannels(prompt: string): Promise<{
  ok: string[];
  failed: { id: string; error: string }[];
}> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error("empty prompt");
  }

  const enabledIds = await getEnabledChannelIds();
  const results = await Promise.all(
    enabledIds.map(async (id) => {
      const channel = getChannelById(id);
      if (!channel) {
        return { id, ok: false as const, error: "unknown channel" };
      }
      try {
        const tab = await chrome.tabs.create({
          url: channel.entryUrl,
          active: false,
        });
        if (!tab.id) throw new Error("no tab id");
        await waitTabComplete(tab.id);
        await sleep(300);
        await sendFill(tab.id, id, trimmed);
        return { id, ok: true as const };
      } catch (e) {
        return {
          id,
          ok: false as const,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }),
  );

  const ok = results.filter((r) => r.ok).map((r) => r.id);
  const failed = results
    .filter((r): r is { id: string; ok: false; error: string } => !r.ok)
    .map(({ id, error }) => ({ id, error }));
  return { ok, failed };
}

chrome.runtime.onInstalled.addListener(() => {
  console.info("[super-ai-search] channels:", CHANNELS.map((c) => c.id).join(", "));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "DISPATCH_PROMPT") return;
  dispatchPromptToChannels(message.prompt as string)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
  return true;
});

export {};
