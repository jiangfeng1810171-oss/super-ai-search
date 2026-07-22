export type LayoutMode = "cards" | "accordion";

export type ChannelStatus =
  | "idle"
  | "loading"
  | "sent"
  | "failed"
  | "resetting";

export interface ChannelMeta {
  id: string;
  name: string;
  accent: string;
  entryLabel: string;
}

export interface ChannelRuntime {
  id: string;
  enabled: boolean;
  status: ChannelStatus;
  error?: string;
  lastPrompt?: string;
  expanded: boolean;
}
