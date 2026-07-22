import {
  BrowserWindow,
  WebContentsView,
  type WebContents,
} from "electron";
import { join } from "path";
import { getChannelById } from "../shared/channels.js";
import { CHANNEL_INTERACT_GUARD_SCRIPT } from "../shared/channelInteractGuard.js";
import {
  buildFillAndSubmitScript,
  buildFocusClearScript,
  buildResetClickScript,
  buildSubmitOnlyScript,
  buildVerifyDispatchedScript,
} from "../shared/pageAutomation.js";
import type { RectBounds } from "../shared/types.js";

function hasUsableUrl(wc: WebContents): boolean {
  const url = wc.getURL();
  return Boolean(url && url.startsWith("http"));
}

/** 等待主文档就绪；主框 ERR_ABORTED / 子资源失败不判死（DeepSeek 等 SPA 常见） */
function waitForLoad(wc: WebContents): Promise<void> {
  if (!wc.isLoading() && hasUsableUrl(wc)) return Promise.resolve();
  if (!wc.isLoading()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      if (hasUsableUrl(wc)) resolve();
      else reject(new Error("load timeout"));
    }, 45000);

    const onFinish = (): void => {
      cleanup();
      resolve();
    };

    const onFail = (
      _event: Electron.Event,
      errorCode: number,
      errorDescription: string,
      _validatedURL: string,
      isMainFrame: boolean,
    ): void => {
      if (!isMainFrame) return;
      // -3 ERR_ABORTED：重定向/取消导航，页面往往仍可用
      if (errorCode === -3) return;
      cleanup();
      if (hasUsableUrl(wc)) resolve();
      else reject(new Error(`load failed: ${errorDescription}`));
    };

    const cleanup = (): void => {
      clearTimeout(timeout);
      wc.removeListener("did-finish-load", onFinish);
      wc.removeListener("did-fail-load", onFail);
    };

    wc.on("did-finish-load", onFinish);
    wc.on("did-fail-load", onFail);
  });
}

export class ChannelViewManager {
  private win: BrowserWindow | null = null;
  private views = new Map<string, WebContentsView>();
  /** 已挂到窗口上的 view（未挂载时不会挡住壳 UI） */
  private mounted = new WeakSet<WebContentsView>();
  private onWebContentsReady: ((wc: WebContents) => void) | null = null;
  /** 当前允许指针/滚轮交互的渠道；null = 全部仅浏览，滚轮归整页 */
  private interactiveChannelId: string | null = null;

  attachWindow(win: BrowserWindow): void {
    this.win = win;
  }

  /** 渠道页 WebContents 创建后回调（用于挂快捷键等） */
  setWebContentsHook(hook: (wc: WebContents) => void): void {
    this.onWebContentsReady = hook;
    for (const view of this.views.values()) {
      hook(view.webContents);
    }
  }

  getInteractiveChannelId(): string | null {
    return this.interactiveChannelId;
  }

  setInteractiveChannel(channelId: string | null): void {
    this.interactiveChannelId = channelId;
    for (const [id, view] of this.views) {
      if (view.webContents.isDestroyed()) continue;
      view.webContents.send(
        "channel:interactive",
        channelId !== null && channelId === id,
      );
    }
    if (channelId) {
      const view = this.views.get(channelId);
      if (view && !view.webContents.isDestroyed()) {
        view.webContents.focus();
      }
    } else if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.focus();
    }
  }

  isChannelInteractive(channelId: string): boolean {
    return this.interactiveChannelId === channelId;
  }

  private installInteractGuard(wc: WebContents): void {
    let attempts = 0;
    const tryInstall = (): void => {
      if (wc.isDestroyed()) return;
      void wc.executeJavaScript(CHANNEL_INTERACT_GUARD_SCRIPT, true).then((ok) => {
        if (!ok) {
          attempts += 1;
          if (attempts < 25) setTimeout(tryInstall, 200);
          return;
        }
        const id = [...this.views.entries()].find(([, v]) => v.webContents === wc)?.[0];
        if (id) {
          wc.send(
            "channel:interactive",
            this.interactiveChannelId !== null && this.interactiveChannelId === id,
          );
        }
      });
    };
    wc.on("dom-ready", () => {
      attempts = 0;
      tryInstall();
    });
    if (!wc.isLoading()) tryInstall();
  }

  private mountView(view: WebContentsView): void {
    if (!this.win || this.mounted.has(view)) return;
    this.win.contentView.addChildView(view);
    this.mounted.add(view);
  }

  private unmountView(view: WebContentsView): void {
    if (!this.win || !this.mounted.has(view)) return;
    this.win.contentView.removeChildView(view);
    this.mounted.delete(view);
  }

  ensureChannel(channelId: string): WebContentsView {
    const existing = this.views.get(channelId);
    if (existing) return existing;

    const def = getChannelById(channelId);
    if (!def) throw new Error(`unknown channel ${channelId}`);

    const view = new WebContentsView({
      webPreferences: {
        partition: `persist:channel-${channelId}`,
        contextIsolation: true,
        nodeIntegration: false,
        preload: join(__dirname, "../preload/channel.js"),
        additionalArguments: [`--sas-channel=${channelId}`],
      },
    });

    view.setBackgroundColor("#0a0c10");
    this.views.set(channelId, view);
    this.onWebContentsReady?.(view.webContents);
    this.installInteractGuard(view.webContents);
    void view.webContents.loadURL(def.entryUrl);
    return view;
  }

  /** 后台预热：加载 URL，但不挂载到窗口 */
  warmChannel(channelId: string): void {
    this.ensureChannel(channelId);
  }

  async warmChannelAsync(
    channelId: string,
  ): Promise<{ channelId: string; ok: boolean; error?: string }> {
    const view = this.ensureChannel(channelId);
    try {
      await waitForLoad(view.webContents);
      return { channelId, ok: true };
    } catch (e) {
      // 页面已可用却被导航事件误伤时，仍算成功（避免 DeepSeek 等假失败）
      if (hasUsableUrl(view.webContents)) {
        return { channelId, ok: true };
      }
      return {
        channelId,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  async preloadChannelsAsync(
    channelIds: string[],
    onProgress?: (progress: {
      phase: "loading" | "done";
      ready: number;
      total: number;
      failedIds: string[];
    }) => void,
  ): Promise<{ total: number; failedIds: string[] }> {
    const total = channelIds.length;
    const failedIds: string[] = [];
    let ready = 0;

    const report = (phase: "loading" | "done") => {
      onProgress?.({ phase, ready, total, failedIds: [...failedIds] });
    };

    if (total === 0) {
      report("done");
      return { total: 0, failedIds: [] };
    }

    report("loading");

    this.releaseChannelsNotIn(channelIds);

    await Promise.all(
      channelIds.map(async (id) => {
        const result = await this.warmChannelAsync(id);
        if (!result.ok) failedIds.push(id);
        ready += 1;
        report("loading");
      }),
    );

    report("done");
    return { total, failedIds };
  }

  preloadChannels(channelIds: string[]): void {
    for (const id of channelIds) {
      this.warmChannel(id);
    }
  }

  /** 释放未启用渠道的 WebContentsView，避免占内存与后台加载 */
  releaseChannelsNotIn(keepIds: string[]): void {
    const keep = new Set(keepIds);
    if (this.interactiveChannelId && !keep.has(this.interactiveChannelId)) {
      this.setInteractiveChannel(null);
    }
    for (const [id, view] of [...this.views.entries()]) {
      if (keep.has(id)) continue;
      this.unmountView(view);
      const wc = view.webContents;
      if (!wc.isDestroyed()) {
        wc.close();
      }
      this.views.delete(id);
    }
  }

  setBounds(channelId: string, bounds: RectBounds): void {
    const view = this.views.get(channelId);
    if (!view) return;
    const w = Math.max(0, Math.floor(bounds.width));
    const h = Math.max(0, Math.floor(bounds.height));
    if (w < 2 || h < 2) {
      this.unmountView(view);
      return;
    }
    this.mountView(view);
    view.setBounds({
      x: Math.floor(bounds.x),
      y: Math.floor(bounds.y),
      width: w,
      height: h,
    });
  }

  hideAll(): void {
    for (const view of this.views.values()) {
      this.unmountView(view);
    }
  }

  hideExcept(channelId: string | null): void {
    if (channelId === null) return;
    for (const [id, view] of this.views) {
      if (id !== channelId) this.unmountView(view);
    }
  }

  async reloadChannel(channelId: string): Promise<void> {
    const view = this.ensureChannel(channelId);
    const def = getChannelById(channelId);
    if (!def) return;
    await view.webContents.loadURL(def.entryUrl);
  }

  getChannelUrl(channelId: string): string {
    const view = this.views.get(channelId);
    if (view) {
      const url = view.webContents.getURL();
      if (url && !url.startsWith("about:")) return url;
    }
    const def = getChannelById(channelId);
    return def?.entryUrl ?? "";
  }

  async runFillAndSubmit(channelId: string, prompt: string): Promise<void> {
    const def = getChannelById(channelId);
    if (!def) throw new Error("unknown channel");
    const view = this.ensureChannel(channelId);
    const wc = view.webContents;
    try {
      await waitForLoad(wc);
    } catch {
      if (!hasUsableUrl(wc)) throw new Error("page not ready");
    }

    const url = wc.getURL();
    const hostOk = def.matches.some((pattern) => {
      const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
      return new RegExp(`^${escaped}$`).test(url);
    });
    if (!hostOk) {
      await wc.loadURL(def.entryUrl);
      await new Promise((r) => setTimeout(r, 800));
    }

    await new Promise((r) => setTimeout(r, 500));

    const verifySent = async (): Promise<boolean> => {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const check = await wc.executeJavaScript(
          buildVerifyDispatchedScript(def, prompt),
          true,
        );
        return Boolean(check?.ok);
      } catch {
        return false;
      }
    };

    // Slate / Lexical 等富文本：用原生 insertText，DOM 赋值无法启用发送按钮
    if (def.fill.kind === "contenteditable") {
      try {
        await wc.executeJavaScript(buildFocusClearScript(def), true);
        await new Promise((r) => setTimeout(r, 120));
        wc.insertText(prompt);
        await new Promise((r) => setTimeout(r, 400));
        const result = await wc.executeJavaScript(buildSubmitOnlyScript(def), true);
        if (result?.ok) return;
      } catch {
        /* fall through */
      }
      if (await verifySent()) return;
      throw new Error("automation failed");
    }

    try {
      const script = buildFillAndSubmitScript(def, prompt);
      const result = await wc.executeJavaScript(script, true);
      if (result?.ok) return;
    } catch {
      /* fall through */
    }
    if (await verifySent()) return;
    throw new Error("automation failed");
  }

  async resetSession(channelId: string): Promise<void> {
    const def = getChannelById(channelId);
    if (!def) throw new Error("unknown channel");
    const view = this.ensureChannel(channelId);
    const wc = view.webContents;
    const reset = def.sessionReset;
    const target = reset.navigate ?? def.entryUrl;

    // loadURL 的 Promise 已表示主文档加载完成，勿再挂 did-fail-load（易被子资源 SSL 误伤）
    await wc.loadURL(target);
    await new Promise((r) => setTimeout(r, 400));

    if (reset.click) {
      try {
        await new Promise((r) => setTimeout(r, 400));
        const script = buildResetClickScript(def);
        await wc.executeJavaScript(script, true);
      } catch {
        // 已回到入口页；找不到「新对话」按钮不视为失败
      }
    }
  }
}

export const channelViews = new ChannelViewManager();
