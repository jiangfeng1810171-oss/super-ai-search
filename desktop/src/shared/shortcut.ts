/** Electron accelerator，如 CommandOrControl+Shift+S */

export const DEFAULT_SEARCH_SHORTCUT = "CommandOrControl+Shift+S";

export interface ParsedShortcut {
  key: string;
  meta: boolean;
  control: boolean;
  alt: boolean;
  shift: boolean;
  commandOrControl: boolean;
}

export function parseAccelerator(accel: string): ParsedShortcut | null {
  const parts = accel
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  const keyRaw = parts[parts.length - 1];
  if (!keyRaw) return null;

  const mods = parts.slice(0, -1).map((m) => m.toLowerCase());
  const key = normalizeKey(keyRaw);
  if (!key) return null;

  return {
    key,
    meta: mods.includes("command") || mods.includes("cmd") || mods.includes("super"),
    control: mods.includes("control") || mods.includes("ctrl"),
    alt: mods.includes("alt") || mods.includes("option"),
    shift: mods.includes("shift"),
    commandOrControl: mods.includes("commandorcontrol") || mods.includes("cmdorctrl"),
  };
}

function normalizeKey(raw: string): string {
  const k = raw.toLowerCase();
  if (k === "space") return " ";
  if (k === "plus") return "+";
  if (k.length === 1) return k;
  // Electron 常用功能键名
  const map: Record<string, string> = {
    escape: "escape",
    esc: "escape",
    return: "enter",
    enter: "enter",
    tab: "tab",
    backspace: "backspace",
    delete: "delete",
    up: "arrowup",
    down: "arrowdown",
    left: "arrowleft",
    right: "arrowright",
  };
  return map[k] ?? k;
}

/** 与 Electron Input（before-input-event）比对 */
export function matchAcceleratorInput(
  accel: string,
  input: {
    type: string;
    key: string;
    code?: string;
    meta: boolean;
    control: boolean;
    alt: boolean;
    shift: boolean;
  },
): boolean {
  if (input.type !== "keyDown") return false;
  const parsed = parseAccelerator(accel);
  if (!parsed) return false;

  const inputKey = normalizeKey(input.key);
  if (inputKey !== parsed.key && input.key.toLowerCase() !== parsed.key) {
    // 部分布局下 key 为 "S"，已在 normalizeKey 处理
    if (inputKey.length === 1 && parsed.key.length === 1) {
      if (inputKey !== parsed.key) return false;
    } else {
      return false;
    }
  }

  // CommandOrControl：mac = ⌘，win/linux = Ctrl
  if (parsed.commandOrControl) {
    if (process.platform === "darwin") {
      if (!input.meta || input.control) return false;
    } else if (!input.control || input.meta) {
      return false;
    }
  } else {
    if (input.meta !== parsed.meta) return false;
    if (input.control !== parsed.control) return false;
  }

  if (input.alt !== parsed.alt) return false;
  if (input.shift !== parsed.shift) return false;
  return true;
}

/** 设置面板展示用 */
export function formatAcceleratorLabel(accel: string): string {
  const parsed = parseAccelerator(accel);
  if (!parsed) return accel;

  const parts: string[] = [];
  const isMac = isMacPlatform();

  if (parsed.commandOrControl) {
    parts.push(isMac ? "⌘" : "Ctrl");
  } else {
    if (parsed.meta) parts.push(isMac ? "⌘" : "Super");
    if (parsed.control) parts.push(isMac ? "⌃" : "Ctrl");
  }
  if (parsed.alt) parts.push(isMac ? "⌥" : "Alt");
  if (parsed.shift) parts.push(isMac ? "⇧" : "Shift");

  const keyLabel =
    parsed.key === " " ? "Space" : parsed.key.length === 1 ? parsed.key.toUpperCase() : parsed.key;
  parts.push(keyLabel);
  return parts.join(isMac ? "" : "+");
}

function isMacPlatform(): boolean {
  if (typeof process !== "undefined" && typeof process.platform === "string") {
    return process.platform === "darwin";
  }
  if (typeof navigator !== "undefined") {
    return /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
  }
  return false;
}

/** 从浏览器 KeyboardEvent 生成 accelerator（录制用） */
export function acceleratorFromKeyboardEvent(e: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): string | null {
  const key = e.key;
  if (!key || key === "Meta" || key === "Control" || key === "Alt" || key === "Shift") {
    return null;
  }

  const parts: string[] = [];
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);

  if (isMac) {
    if (e.metaKey) parts.push("CommandOrControl");
    else if (e.ctrlKey) parts.push("Control");
  } else {
    if (e.ctrlKey) parts.push("CommandOrControl");
    else if (e.metaKey) parts.push("Super");
  }
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");

  let keyPart = key;
  if (key.length === 1) keyPart = key.toUpperCase();
  else if (key === " ") keyPart = "Space";
  else if (key.startsWith("Arrow")) keyPart = key.replace("Arrow", "");
  else keyPart = key;

  // 至少要有一个修饰键，避免单键误触
  if (parts.length === 0) return null;

  parts.push(keyPart);
  return parts.join("+");
}
