import type { ChannelDefinition } from "./types.js";

/** 站点 DOM 易变：可按渠道远程/本地更新 selectors */
export const CHANNELS: ChannelDefinition[] = [
  {
    id: "doubao",
    name: "豆包",
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
  },
  {
    id: "gemini",
    name: "Gemini",
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
  },
  {
    id: "kimi",
    name: "Kimi",
    entryUrl: "https://kimi.moonshot.cn/",
    matches: ["https://kimi.moonshot.cn/*", "https://www.kimi.com/*"],
    fill: {
      kind: "textarea",
      selectors: [
        'textarea[placeholder*="尽管问"]',
        'textarea[placeholder*="问"]',
        "textarea",
      ],
      waitMs: 15000,
    },
  },
  {
    id: "google",
    name: "Google",
    entryUrl: "https://www.google.com/",
    matches: ["https://www.google.com/*", "https://www.google.com.hk/*"],
    fill: {
      kind: "textarea",
      selectors: ['textarea[name="q"]', 'input[name="q"]', "#APjFqb"],
      waitMs: 8000,
    },
  },
  {
    id: "baidu",
    name: "百度",
    entryUrl: "https://www.baidu.com/",
    matches: ["https://www.baidu.com/*"],
    fill: {
      kind: "input",
      selectors: ["#kw", 'input[name="wd"]'],
      waitMs: 8000,
    },
  },
];

export function getChannelById(id: string): ChannelDefinition | undefined {
  return CHANNELS.find((c) => c.id === id);
}

export function defaultChannelPrefs(): Record<string, { enabled: boolean }> {
  return Object.fromEntries(CHANNELS.map((c) => [c.id, { enabled: true }]));
}
