import type { ChannelDefinition, FillKind } from "../shared/types.js";
import { FILL_MESSAGE } from "../shared/types.js";
import { getChannelById } from "../shared/channels.js";

function isVisible(el: Element): boolean {
  const html = el as HTMLElement;
  if (!html.offsetParent && html.tagName !== "BODY") {
    const rect = html.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
  }
  const style = window.getComputedStyle(html);
  return style.visibility !== "hidden" && style.display !== "none";
}

function findTarget(def: ChannelDefinition): HTMLElement | null {
  for (const sel of def.fill.selectors) {
    const nodes = document.querySelectorAll(sel);
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;
      if (!isVisible(node)) continue;
      if (node.hasAttribute("disabled") || node.getAttribute("aria-disabled") === "true") {
        continue;
      }
      return node;
    }
  }
  return null;
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) {
    setter.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function fillElement(el: HTMLElement, kind: FillKind, text: string): void {
  el.focus();
  if (kind === "contenteditable") {
    el.textContent = text;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
    return;
  }
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    setNativeValue(el, text);
    return;
  }
  throw new Error(`unsupported element for kind ${kind}`);
}

function waitForTarget(def: ChannelDefinition): Promise<HTMLElement> {
  const max = def.fill.waitMs ?? 12000;
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tryOnce = (): void => {
      const t = findTarget(def);
      if (t) {
        observer.disconnect();
        resolve(t);
        return;
      }
      if (Date.now() - start >= max) {
        observer.disconnect();
        reject(new Error("timeout waiting for input"));
      }
    };

    const observer = new MutationObserver(tryOnce);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    tryOnce();
  });
}

async function runFill(channelId: string, prompt: string): Promise<void> {
  const def = getChannelById(channelId);
  if (!def) {
    throw new Error(`unknown channel ${channelId}`);
  }

  const hostOk = def.matches.some((pattern) => {
    const re = matchPatternToRegExp(pattern);
    return re.test(location.href);
  });
  if (!hostOk) {
    throw new Error("channel does not match this page");
  }

  const target = await waitForTarget(def);
  fillElement(target, def.fill.kind, prompt);
}

/** 将 manifest match 模式转为 RegExp（仅支持 extension 常用子集） */
function matchPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== FILL_MESSAGE) return;
  const payload = message as { prompt: string; channelId: string };
  runFill(payload.channelId, payload.prompt)
    .then(() => sendResponse({ ok: true }))
    .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
  return true;
});

/** 供调试：在控制台可手动触发 */
declare global {
  interface Window {
    __superAiSearchFill?: (channelId: string, prompt: string) => Promise<void>;
  }
}
window.__superAiSearchFill = runFill;

export {};
