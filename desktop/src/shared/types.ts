export type FillKind = "input" | "textarea" | "contenteditable";

export type SubmitKind = "click" | "enter" | "form";

export interface ChannelDefinition {
  id: string;
  name: string;
  accent: string;
  entryLabel: string;
  entryUrl: string;
  matches: string[];
  fill: {
    kind: FillKind;
    selectors: string[];
    waitMs?: number;
  };
  submit: {
    kind: SubmitKind;
    selectors?: string[];
    formSelectors?: string[];
  };
  sessionReset: {
    navigate?: string;
    click?: {
      selectors: string[];
      waitMs?: number;
    };
  };
}

export type LayoutMode = "cards" | "accordion";

export type ChannelStatus =
  | "idle"
  | "loading"
  | "sent"
  | "failed"
  | "resetting";

export interface ChannelPrefs {
  enabled: boolean;
}

export type ChannelPrefsMap = Record<string, ChannelPrefs>;

export interface AppSettings {
  channelPrefs: ChannelPrefsMap;
  layoutMode: LayoutMode;
  hasSubmitted: boolean;
  /** Electron accelerator，默认 CommandOrControl+Shift+S */
  searchShortcut: string;
}

export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AutomationAction = "fillAndSubmit" | "resetSession";

export interface ChannelStateEvent {
  channelId: string;
  status: ChannelStatus;
  error?: string;
  lastPrompt?: string;
}

export type ChannelInitPhase = "idle" | "loading" | "done";

export interface ChannelInitProgress {
  phase: ChannelInitPhase;
  ready: number;
  total: number;
  failedIds: string[];
}

/** IPC 进度事件（loading → done） */
export type ChannelInitProgressEvent = Omit<ChannelInitProgress, "phase"> & {
  phase: "loading" | "done";
};

export interface ChannelInitResult {
  phase: "done";
  ready: number;
  total: number;
  failedIds: string[];
}
