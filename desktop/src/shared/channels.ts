import type { ChannelDefinition } from "./types.js";

/**
 * fill/submit/reset 选择器来自各站页面结构调研（2026-07），站点改版需维护。
 * 顺序：AI 渠道在前，Google / 百度在最后。
 */
export const CHANNELS: ChannelDefinition[] = [
  {
    id: "doubao",
    name: "豆包",
    accent: "#6b8cff",
    entryLabel: "doubao.com/chat",
    entryUrl: "https://www.doubao.com/chat/",
    matches: ["https://www.doubao.com/*"],
    fill: {
      kind: "textarea",
      selectors: [
        'textarea[placeholder*="发消息"]',
        'textarea[placeholder*="消息"]',
        "textarea",
      ],
      waitMs: 15000,
    },
    submit: {
      kind: "click",
      selectors: [
        'button[data-testid="send-button"]',
        'button[id*="send"]',
        'button[aria-label*="发送"]',
        'button[class*="send"]',
        '[data-testid*="send"]',
        'button[type="submit"]',
      ],
    },
    sessionReset: {
      click: {
        selectors: [
          'button[aria-label*="新对话"]',
          'a[href*="new"]',
          '[data-testid*="new-chat"]',
        ],
        waitMs: 12000,
      },
    },
  },
  {
    id: "gemini",
    name: "Gemini",
    accent: "#8ab4f8",
    entryLabel: "gemini.google.com",
    entryUrl: "https://gemini.google.com/app",
    matches: ["https://gemini.google.com/*"],
    fill: {
      kind: "contenteditable",
      selectors: [
        'div[contenteditable="true"][aria-label*="Enter"]',
        'div[contenteditable="true"][aria-label*="输入"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]',
      ],
      waitMs: 20000,
    },
    submit: {
      kind: "click",
      selectors: [
        'button[aria-label*="Send message"]',
        'button[aria-label*="Send"]',
        'button[aria-label*="发送"]',
        'button[mattooltip*="Send"]',
        "button.send-button",
        'button[data-test-id*="send"]',
      ],
    },
    sessionReset: {
      click: {
        selectors: [
          'a[aria-label*="New chat"]',
          'button[aria-label*="New chat"]',
          'a[aria-label*="新对话"]',
        ],
        waitMs: 15000,
      },
    },
  },
  {
    id: "kimi",
    name: "Kimi",
    accent: "#5eead4",
    entryLabel: "kimi.com",
    entryUrl: "https://www.kimi.com/",
    matches: [
      "https://www.kimi.com/*",
      "https://kimi.com/*",
      "https://kimi.moonshot.cn/*",
      "https://www.kimi.moonshot.cn/*",
    ],
    fill: {
      kind: "contenteditable",
      selectors: [
        "div.chat-input-editor[contenteditable='true']",
        "[data-lexical-editor='true']",
        "div.chat-input-editor",
        "[role='textbox'][contenteditable='true']",
      ],
      waitMs: 20000,
    },
    submit: {
      kind: "click",
      selectors: [
        ".send-button-container",
        ".send-button-container .send-icon",
        "div.send-button-container",
        "[class*='send-button']",
      ],
    },
    sessionReset: {
      navigate: "https://www.kimi.com/",
      click: {
        selectors: [
          'a[href*="new"]',
          'a[aria-label*="新建"]',
          '[class*="new-chat"]',
        ],
        waitMs: 12000,
      },
    },
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    accent: "#4d6bff",
    entryLabel: "chat.deepseek.com",
    entryUrl: "https://chat.deepseek.com/",
    matches: ["https://chat.deepseek.com/*"],
    fill: {
      kind: "textarea",
      selectors: [
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="消息"]',
        'textarea[placeholder*="Send"]',
        'textarea[placeholder*="DeepSeek"]',
        "#chat-input",
        'div[contenteditable="true"]',
        "textarea",
      ],
      waitMs: 15000,
    },
    submit: {
      kind: "click",
      selectors: [
        'button[aria-label*="Send message"]',
        'button[aria-label*="Send"]',
        'button[aria-label*="发送"]',
        'div[role="button"][aria-label*="Send"]',
        'button[data-testid*="send"]',
        'button[class*="send"]',
        'button[type="submit"]',
      ],
    },
    sessionReset: {
      navigate: "https://chat.deepseek.com/",
    },
  },
  {
    id: "qwen",
    name: "千问",
    accent: "#624aff",
    entryLabel: "qianwen.com",
    entryUrl: "https://www.qianwen.com/",
    matches: [
      "https://www.qianwen.com/*",
      "https://qianwen.com/*",
      "https://tongyi.aliyun.com/*",
      "https://www.tongyi.com/*",
    ],
    fill: {
      kind: "contenteditable",
      selectors: [
        '[data-slate-editor="true"]',
        'div[contenteditable="true"][data-slate-node="value"]',
        'div[contenteditable="true"][aria-label*="千问"]',
        'div[contenteditable="true"][aria-label*="提问"]',
        'div[role="textbox"][contenteditable="true"]',
        'div[contenteditable="true"]',
      ],
      waitMs: 20000,
    },
    submit: {
      kind: "click",
      selectors: [
        'button[aria-label="发送消息"]',
        'button[aria-label*="发送消息"]',
        'button[aria-label*="发送"]',
        'button[type="submit"]',
      ],
    },
    sessionReset: {
      navigate: "https://www.qianwen.com/",
      click: {
        selectors: [
          'button[aria-label*="新建对话"]',
          'button[aria-label*="新对话"]',
        ],
        waitMs: 15000,
      },
    },
  },
  {
    id: "yuanbao",
    name: "腾讯元宝",
    accent: "#00c896",
    entryLabel: "yuanbao.tencent.com",
    entryUrl: "https://yuanbao.tencent.com/chat",
    matches: ["https://yuanbao.tencent.com/*"],
    fill: {
      kind: "textarea",
      selectors: [
        'textarea[placeholder*="输入"]',
        'textarea[placeholder*="问"]',
        'div[contenteditable="true"]',
        "textarea",
      ],
      waitMs: 15000,
    },
    submit: {
      kind: "click",
      selectors: [
        'button[aria-label*="发送"]',
        'a[class*="send"]',
        'button[class*="send"]',
        'button[type="submit"]',
      ],
    },
    sessionReset: {
      navigate: "https://yuanbao.tencent.com/chat",
    },
  },
  {
    id: "google",
    name: "Google",
    accent: "#ea4335",
    entryLabel: "google.com",
    entryUrl: "https://www.google.com/",
    matches: ["https://www.google.com/*", "https://www.google.com.hk/*"],
    fill: {
      kind: "textarea",
      selectors: ['textarea[name="q"]', 'input[name="q"]', "#APjFqb"],
      waitMs: 8000,
    },
    submit: {
      kind: "enter",
      selectors: [
        'input[name="btnK"]',
        'button[name="btnK"]',
        'input[aria-label*="Google 搜索"]',
        'input[aria-label*="Google Search"]',
        'button[aria-label*="Google 搜索"]',
        'button[aria-label*="Search"]',
      ],
      formSelectors: ["form[role='search']", "form"],
    },
    sessionReset: { navigate: "https://www.google.com/" },
  },
  {
    id: "baidu",
    name: "百度",
    accent: "#2932e1",
    entryLabel: "baidu.com",
    entryUrl: "https://www.baidu.com/",
    matches: ["https://www.baidu.com/*", "https://baidu.com/*"],
    fill: {
      kind: "textarea",
      selectors: [
        "#chat-textarea",
        "textarea.chat-input-textarea",
        "textarea.chat-input-scroll-style",
        "#kw",
        'input[name="wd"]',
      ],
      waitMs: 12000,
    },
    submit: {
      kind: "click",
      selectors: [
        "#chat-submit-button",
        "button.chat-input-submit",
        'button[type="submit"]',
        "#su",
        "input#su",
      ],
      formSelectors: ["#form", "form"],
    },
    sessionReset: { navigate: "https://www.baidu.com/" },
  },
];

export function getChannelById(id: string): ChannelDefinition | undefined {
  return CHANNELS.find((c) => c.id === id);
}

export function defaultChannelPrefs(): Record<string, { enabled: boolean }> {
  return Object.fromEntries(CHANNELS.map((c) => [c.id, { enabled: true }]));
}

/** 壳 UI 的 enabledMap → 持久化结构 */
export function channelPrefsFromEnabledMap(
  map: Record<string, boolean>,
): Record<string, { enabled: boolean }> {
  return Object.fromEntries(
    CHANNELS.map((c) => [c.id, { enabled: map[c.id] !== false }]),
  );
}

function normalizeChannelPrefValue(
  value: unknown,
  defaultEnabled: boolean,
): { enabled: boolean } {
  if (typeof value === "boolean") return { enabled: value };
  if (value && typeof value === "object" && "enabled" in value) {
    const enabled = (value as { enabled?: boolean }).enabled;
    return { enabled: enabled !== false };
  }
  return { enabled: defaultEnabled };
}

export function normalizeChannelPrefs(
  raw: Record<string, unknown> | undefined,
): Record<string, { enabled: boolean }> {
  const base = defaultChannelPrefs();
  if (!raw) return base;
  const out = { ...base };
  for (const ch of CHANNELS) {
    if (raw[ch.id] !== undefined) {
      out[ch.id] = normalizeChannelPrefValue(raw[ch.id], base[ch.id].enabled);
    }
  }
  return out;
}

export function channelMetaList() {
  return CHANNELS.map(({ id, name, accent, entryLabel }) => ({
    id,
    name,
    accent,
    entryLabel,
  }));
}
