export type FillKind = "input" | "textarea" | "contenteditable";

export interface ChannelDefinition {
  id: string;
  name: string;
  /** 打开的标签页 URL（新对话 / 首页） */
  entryUrl: string;
  /** manifest content_scripts matches */
  matches: string[];
  fill: {
    kind: FillKind;
    /** 按顺序尝试，直到命中可见可编辑元素 */
    selectors: string[];
    /** 填充后等待 DOM 出现的最大毫秒（SPA 慢加载） */
    waitMs?: number;
  };
}

export interface ChannelPrefs {
  enabled: boolean;
}

export type ChannelPrefsMap = Record<string, ChannelPrefs>;

export interface StoredSettings {
  channelPrefs: ChannelPrefsMap;
}

export const FILL_MESSAGE = "SUPER_AI_SEARCH_FILL" as const;

export interface FillMessagePayload {
  type: typeof FILL_MESSAGE;
  prompt: string;
  channelId: string;
}
