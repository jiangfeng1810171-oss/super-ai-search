import type { ChannelMeta } from "../types/app.types";

/** 原型用静态渠道列表（与 spec 一致） */
export const CHANNELS: ChannelMeta[] = [
  { id: "doubao", name: "豆包", accent: "#6b8cff", entryLabel: "doubao.com/chat" },
  { id: "gemini", name: "Gemini", accent: "#8ab4f8", entryLabel: "gemini.google.com" },
  { id: "kimi", name: "Kimi", accent: "#5eead4", entryLabel: "kimi.moonshot.cn" },
  { id: "google", name: "Google", accent: "#ea4335", entryLabel: "google.com" },
  { id: "baidu", name: "百度", accent: "#2932e1", entryLabel: "baidu.com" },
  { id: "deepseek", name: "DeepSeek", accent: "#4d6bff", entryLabel: "chat.deepseek.com" },
  { id: "qwen", name: "千问", accent: "#624aff", entryLabel: "tongyi.aliyun.com" },
  { id: "yuanbao", name: "腾讯元宝", accent: "#00c896", entryLabel: "yuanbao.tencent.com" },
];

export function getChannelMeta(id: string): ChannelMeta | undefined {
  return CHANNELS.find((c) => c.id === id);
}
