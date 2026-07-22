<template>
  <div class="app-root">
    <div class="bg-grid" aria-hidden="true" />

    <header v-if="!fullscreenChannelId" class="top-bar">
      <div class="top-left">
        <span class="app-mark">超级 AI 搜索</span>
        <span
          v-if="hasSubmitted && lastQuery"
          class="query-chip"
          :title="lastQuery"
        >
          {{ truncatedQuery }}
        </span>
      </div>
      <div class="top-center" role="status" aria-live="polite">
        <span
          class="init-status"
          :class="{
            loading: headerStatus.kind === 'loading',
            done: headerStatus.kind === 'done',
            warn: headerStatus.kind === 'warn',
          }"
        >
          {{ headerStatus.text }}
        </span>
      </div>
      <div class="top-actions">
        <template v-if="hasSubmitted">
          <button type="button" class="ghost-btn" @click="resetAllSessions">
            全部新会话
          </button>
        </template>
        <button type="button" class="ghost-btn" @click="settingsOpen = true">
          设置
        </button>
        <button
          v-if="hasSubmitted"
          type="button"
          class="search-fab"
          title="再次搜索"
          aria-label="再次搜索"
          @click="openSearchModal"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
            <path
              d="M20 20l-3.5-3.5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </header>

    <main v-if="!hasSubmitted" class="landing">
      <div class="landing-inner">
        <h1 class="landing-title">一次提问，并排查看各渠道</h1>
        <PromptComposer
          v-model="draft"
          input-id="landing-prompt"
          :disabled="!channelsReady"
          autofocus
          @send="submitFromLanding"
        />
        <button type="button" class="landing-settings" @click="settingsOpen = true">
          渠道与布局设置
        </button>
      </div>
    </main>

    <main
      v-else-if="!fullscreenChannelId"
      class="results"
      @mousedown="onResultsMouseDown"
    >
      <div v-if="layoutMode === 'cards'" class="cards-grid">
        <ChannelCard
          v-for="item in visibleChannels"
          :key="item.meta.id"
          :meta="item.meta"
          :channel="item.runtime"
          :active="viewsActive"
          :interactive="interactiveChannelId === item.meta.id"
          @expand="enterFullscreen(item.meta.id)"
          @refresh="refreshChannel(item.meta.id)"
          @retry="retryChannel(item.meta.id)"
          @copy-link="copyChannelLink(item.meta.id)"
          @deactivate="clearChannelInteraction"
        />
      </div>
      <div v-else class="accordion-stack">
        <ChannelAccordionItem
          v-for="item in visibleChannels"
          :key="item.meta.id"
          :meta="item.meta"
          :channel="item.runtime"
          :open="accordionOpen[item.meta.id] ?? true"
          :active="viewsActive"
          :interactive="interactiveChannelId === item.meta.id"
          @toggle="toggleAccordion(item.meta.id)"
          @expand="enterFullscreen(item.meta.id)"
          @refresh="refreshChannel(item.meta.id)"
          @retry="retryChannel(item.meta.id)"
          @copy-link="copyChannelLink(item.meta.id)"
          @deactivate="clearChannelInteraction"
        />
      </div>
    </main>

    <main v-else class="fullscreen">
      <header class="fs-bar">
        <span class="fs-title">{{ fullscreenMeta?.name }}</span>
        <div class="fs-actions">
          <button
            v-if="fullscreenChannelId"
            type="button"
            class="ghost-btn"
            @click="copyChannelLink(fullscreenChannelId)"
          >
            复制链接
          </button>
          <button type="button" class="ghost-btn" @click="exitFullscreen">退出全屏 · Esc</button>
        </div>
      </header>
      <div class="fs-body">
        <WebviewSlot
          v-if="fullscreenChannelId"
          :channel-id="fullscreenChannelId"
          :status="runtimes[fullscreenChannelId]?.status ?? 'idle'"
          :error="runtimes[fullscreenChannelId]?.error"
          :active="true"
          @retry="retryChannel(fullscreenChannelId)"
        />
      </div>
    </main>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="searchModalOpen"
          class="modal-backdrop"
          @click.self="closeSearchModal"
        >
          <div class="modal-dialog" role="dialog" aria-modal="true" aria-label="再次搜索">
            <PromptComposer
              v-model="draft"
              input-id="modal-prompt"
              modal
              compact
              hint="Enter 发送 · ⌘ + Enter 换行 · Esc 取消"
              autofocus
              @send="submitFromModal"
            />
          </div>
        </div>
      </Transition>
    </Teleport>

    <SettingsDrawer
      :layout-mode="layoutMode"
      :enabled-map="enabledMap"
      :open="settingsOpen"
      :channels="CHANNELS"
      :search-shortcut="searchShortcut"
      @close="settingsOpen = false"
      @update:layout-mode="onLayoutChange"
      @update:enabled-map="onEnabledChange"
      @update:search-shortcut="onSearchShortcutChange"
      @reset-all="resetAllSessions"
    />

    <Transition name="toast">
      <p v-if="toast" class="toast" role="status">{{ toast }}</p>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { CHANNELS } from "./data/channels";
import { channelPrefsFromEnabledMap } from "@shared/channels.js";
import ChannelAccordionItem from "./components/ChannelAccordionItem.vue";
import ChannelCard from "./components/ChannelCard.vue";
import PromptComposer from "./components/PromptComposer.vue";
import SettingsDrawer from "./components/SettingsDrawer.vue";
import WebviewSlot from "./components/WebviewSlot.vue";
import type { ChannelStatus, LayoutMode } from "./env.js";
import type { ChannelInitProgress } from "@shared/types.js";
import { DEFAULT_SEARCH_SHORTCUT, formatAcceleratorLabel } from "@shared/shortcut.js";

interface RuntimeState {
  status: ChannelStatus;
  error?: string;
  lastPrompt?: string;
}

const hasSubmitted = ref(false);
const draft = ref("");
const lastQuery = ref("");
const layoutMode = ref<LayoutMode>("cards");
const settingsOpen = ref(false);
const searchModalOpen = ref(false);
const searchShortcut = ref(DEFAULT_SEARCH_SHORTCUT);
const fullscreenChannelId = ref<string | null>(null);
/** 点击激活的渠道；null 时滚轮归整页 */
const interactiveChannelId = ref<string | null>(null);
const toast = ref("");
const viewsActive = ref(false);
const initProgress = ref<ChannelInitProgress>({
  phase: "idle",
  ready: 0,
  total: 0,
  failedIds: [],
});

const resetProgress = ref<ChannelInitProgress>({
  phase: "idle",
  ready: 0,
  total: 0,
  failedIds: [],
});

let unsubscribeInit: (() => void) | null = null;
let unsubscribeReset: (() => void) | null = null;
let unsubscribeOpenSearch: (() => void) | null = null;
let unsubscribeInteractive: (() => void) | null = null;
let unsubscribeWheel: (() => void) | null = null;

const enabledMap = reactive<Record<string, boolean>>(
  Object.fromEntries(CHANNELS.map((c) => [c.id, true])),
);

const runtimes = reactive<Record<string, RuntimeState>>(
  Object.fromEntries(
    CHANNELS.map((c) => [c.id, { status: "idle" as ChannelStatus }]),
  ),
);

const accordionOpen = reactive<Record<string, boolean>>(
  Object.fromEntries(CHANNELS.map((c) => [c.id, true])),
);

const visibleChannels = computed(() =>
  CHANNELS.filter((m) => enabledMap[m.id]).map((meta) => ({
    meta,
    runtime: runtimes[meta.id],
  })),
);

const truncatedQuery = computed(() => {
  const q = lastQuery.value;
  return q.length > 48 ? `${q.slice(0, 48)}…` : q;
});

const channelsReady = computed(() => initProgress.value.phase === "done");

const headerStatus = computed(() => {
  const reset = resetProgress.value;
  if (reset.phase === "loading") {
    return {
      kind: "loading" as const,
      text:
        reset.total > 0
          ? `正在重置会话 ${reset.ready}/${reset.total}…`
          : "正在重置会话…",
    };
  }
  if (reset.phase === "done") {
    const failed = reset.failedIds.length;
    if (failed === 0) {
      return { kind: "done" as const, text: "已全部开启新会话" };
    }
    return {
      kind: "warn" as const,
      text: `${reset.total - failed}/${reset.total} 个渠道已重置，${failed} 个失败`,
    };
  }

  const { phase, ready, total, failedIds } = initProgress.value;
  if (phase === "idle") {
    return { kind: "loading" as const, text: "准备初始化各渠道…" };
  }
  if (phase === "loading") {
    return {
      kind: "loading" as const,
      text: total > 0 ? `正在初始化渠道 ${ready}/${total}…` : "正在初始化…",
    };
  }
  if (total === 0) {
    return { kind: "warn" as const, text: "请先在设置中启用至少一个渠道" };
  }
  if (failedIds.length === 0) {
    return { kind: "done" as const, text: "各渠道已就绪，可以开始提问" };
  }
  return {
    kind: "warn" as const,
    text: `${total - failedIds.length}/${total} 个渠道已就绪，${failedIds.length} 个加载失败`,
  };
});

const fullscreenMeta = computed(() =>
  fullscreenChannelId.value
    ? CHANNELS.find((c) => c.id === fullscreenChannelId.value)
    : undefined,
);

let unsubscribeStates: (() => void) | null = null;

function showToast(msg: string): void {
  toast.value = msg;
  window.setTimeout(() => {
    toast.value = "";
  }, 2200);
}

function applyStateBatch(
  events: { channelId: string; status: ChannelStatus; error?: string; lastPrompt?: string }[],
): void {
  for (const ev of events) {
    const rt = runtimes[ev.channelId];
    if (!rt) continue;
    rt.status = ev.status as ChannelStatus;
    rt.error = ev.error;
    if (ev.lastPrompt !== undefined) rt.lastPrompt = ev.lastPrompt;
  }
}

function clearChannelInteraction(): void {
  if (interactiveChannelId.value === null) return;
  interactiveChannelId.value = null;
  void window.desktopApi.setInteractiveChannel(null);
}

function onResultsMouseDown(e: MouseEvent): void {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  // 点在卡片标题/工具栏会由子组件 deactivate；点在网格空白处也退出交互
  if (target.classList.contains("results") || target.classList.contains("cards-grid") || target.classList.contains("accordion-stack")) {
    clearChannelInteraction();
  }
}

function applyPassthroughWheel(payload: {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
}): void {
  const scroller = document.querySelector(".results") as HTMLElement | null;
  if (!scroller) return;
  let { deltaX, deltaY, deltaMode } = payload;
  // DOM_DELTA_LINE / PAGE → 近似像素
  if (deltaMode === 1) {
    deltaX *= 16;
    deltaY *= 16;
  } else if (deltaMode === 2) {
    deltaX *= scroller.clientWidth;
    deltaY *= scroller.clientHeight;
  }
  scroller.scrollBy({ left: deltaX, top: deltaY, behavior: "auto" });
}

function syncViewVisibility(): void {
  // 原生 WebContentsView 叠在壳 UI 之上：模态/设置打开时必须卸下，否则看不见输入框
  if (
    !hasSubmitted.value ||
    searchModalOpen.value ||
    settingsOpen.value
  ) {
    viewsActive.value = false;
    window.desktopApi.hideAllViews();
    return;
  }
  if (fullscreenChannelId.value) {
    viewsActive.value = true;
    window.desktopApi.hideViewsExcept(fullscreenChannelId.value);
    return;
  }
  viewsActive.value = true;
  window.desktopApi.hideViewsExcept(null);
}

watch(settingsOpen, (open) => {
  window.desktopApi?.setSuppressSearchShortcut(open);
  if (open) clearChannelInteraction();
});

watch([hasSubmitted, fullscreenChannelId, settingsOpen], syncViewVisibility);

async function startChannelInit(): Promise<void> {
  if (!window.desktopApi) return;
  initProgress.value = {
    phase: "loading",
    ready: 0,
    total: getEnabledCount(),
    failedIds: [],
  };
  unsubscribeInit?.();
  unsubscribeInit = window.desktopApi.onChannelInitProgress((p) => {
    initProgress.value = {
      phase: p.phase === "done" ? "done" : "loading",
      ready: p.ready,
      total: p.total,
      failedIds: p.failedIds,
    };
  });
  try {
    const result = await window.desktopApi.initializeChannels();
    initProgress.value = {
      phase: "done",
      ready: result.total,
      total: result.total,
      failedIds: result.failedIds,
    };
  } catch (e) {
    showToast(e instanceof Error ? e.message : String(e));
    initProgress.value = {
      ...initProgress.value,
      phase: "done",
    };
  }
}

function getEnabledCount(): number {
  return CHANNELS.filter((c) => enabledMap[c.id]).length;
}

async function submitFromLanding(): Promise<void> {
  if (!channelsReady.value) {
    showToast("渠道仍在初始化，请稍候");
    return;
  }
  if (!draft.value.trim()) {
    showToast("请输入问题");
    return;
  }
  if (visibleChannels.value.length === 0) {
    showToast("请至少在设置中启用一个渠道");
    return;
  }
  await dispatchPrompt(draft.value.trim());
  draft.value = "";
}

async function submitFromModal(): Promise<void> {
  const text = draft.value.trim();
  if (!text) return;
  // 先关模态并清空，避免等渠道自动化结束才消失
  draft.value = "";
  searchModalOpen.value = false;
  await nextTick();
  syncViewVisibility();
  await dispatchPrompt(text);
}

async function dispatchPrompt(prompt: string): Promise<void> {
  lastQuery.value = prompt;
  hasSubmitted.value = true;
  await window.desktopApi.setChannelPrefs(channelPrefsFromEnabledMap(enabledMap));
  await window.desktopApi.setHasSubmitted(true);
  syncViewVisibility();
  try {
    await window.desktopApi.dispatchPrompt(prompt);
  } catch (e) {
    showToast(e instanceof Error ? e.message : String(e));
  }
}

async function retryChannel(id: string): Promise<void> {
  if (!lastQuery.value) return;
  try {
    await window.desktopApi.retryChannel(id, lastQuery.value);
  } catch (e) {
    showToast(e instanceof Error ? e.message : String(e));
  }
}

async function refreshChannel(id: string): Promise<void> {
  runtimes[id].status = "loading";
  try {
    await window.desktopApi.reloadChannel(id);
    runtimes[id].status = runtimes[id].lastPrompt ? "sent" : "idle";
  } catch (e) {
    runtimes[id].status = "failed";
    runtimes[id].error = e instanceof Error ? e.message : String(e);
  }
}

async function copyChannelLink(id: string): Promise<void> {
  try {
    const url = await window.desktopApi.getChannelUrl(id);
    if (!url) {
      showToast("暂无可用链接");
      return;
    }
    await navigator.clipboard.writeText(url);
    showToast("链接已复制");
  } catch (e) {
    showToast(e instanceof Error ? e.message : "复制失败");
  }
}

async function resetAllSessions(): Promise<void> {
  await window.desktopApi.setChannelPrefs(channelPrefsFromEnabledMap(enabledMap));
  unsubscribeReset?.();
  unsubscribeReset = window.desktopApi.onChannelResetProgress((p) => {
    resetProgress.value = {
      phase: p.phase === "done" ? "done" : "loading",
      ready: p.ready,
      total: p.total,
      failedIds: p.failedIds,
    };
  });
  resetProgress.value = {
    phase: "loading",
    ready: 0,
    total: getEnabledCount(),
    failedIds: [],
  };
  try {
    const result = await window.desktopApi.resetAllSessions();
    resetProgress.value = {
      phase: "done",
      ready: result.total,
      total: result.total,
      failedIds: result.failedIds,
    };
    for (const ch of CHANNELS) {
      runtimes[ch.id].lastPrompt = undefined;
    }
    window.setTimeout(() => {
      if (resetProgress.value.phase === "done") {
        resetProgress.value = {
          phase: "idle",
          ready: 0,
          total: 0,
          failedIds: [],
        };
      }
    }, 3500);
  } catch (e) {
    showToast(e instanceof Error ? e.message : String(e));
    resetProgress.value = {
      ...resetProgress.value,
      phase: "done",
    };
  }
}

function openSearchModal(): void {
  clearChannelInteraction();
  void (async () => {
    draft.value = "";
    searchModalOpen.value = true;
    // 先让模态画在壳层，再卸下 WebContentsView，避免渠道区先闪黑
    await nextTick();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    syncViewVisibility();
  })();
}

function handleOpenSearchShortcut(): void {
  if (settingsOpen.value) return;
  if (fullscreenChannelId.value) {
    exitFullscreen();
  }
  if (hasSubmitted.value) {
    openSearchModal();
    return;
  }
  document.getElementById("landing-prompt")?.focus();
}

function closeSearchModal(): void {
  searchModalOpen.value = false;
  draft.value = "";
  syncViewVisibility();
}

function enterFullscreen(id: string): void {
  fullscreenChannelId.value = id;
  interactiveChannelId.value = id;
  void window.desktopApi.setInteractiveChannel(id);
  syncViewVisibility();
}

function exitFullscreen(): void {
  fullscreenChannelId.value = null;
  clearChannelInteraction();
  syncViewVisibility();
}

function toggleAccordion(id: string): void {
  accordionOpen[id] = !accordionOpen[id];
}

function onLayoutChange(mode: LayoutMode): void {
  layoutMode.value = mode;
  void window.desktopApi.setLayoutMode(mode);
}

function onEnabledChange(map: Record<string, boolean>): void {
  for (const key of Object.keys(map)) {
    enabledMap[key] = map[key];
  }
  void window.desktopApi.setChannelPrefs(channelPrefsFromEnabledMap(enabledMap));
  void startChannelInit();
}

async function onSearchShortcutChange(accel: string): Promise<void> {
  searchShortcut.value = await window.desktopApi.setSearchShortcut(accel);
  showToast(`快捷键已设为 ${formatAcceleratorLabel(searchShortcut.value)}`);
}

function onGlobalKeydown(e: KeyboardEvent): void {
  if (e.key !== "Escape") return;
  if (fullscreenChannelId.value) {
    exitFullscreen();
    return;
  }
  if (interactiveChannelId.value) {
    clearChannelInteraction();
    return;
  }
  if (searchModalOpen.value) {
    closeSearchModal();
    return;
  }
  if (settingsOpen.value) settingsOpen.value = false;
}

onMounted(async () => {
  window.addEventListener("keydown", onGlobalKeydown);
  if (!window.desktopApi) {
    showToast("应用初始化失败：preload 未就绪");
    return;
  }
  unsubscribeStates = window.desktopApi.onChannelStateBatch(applyStateBatch);
  unsubscribeOpenSearch = window.desktopApi.onOpenSearch(handleOpenSearchShortcut);
  unsubscribeInteractive = window.desktopApi.onInteractiveChanged((id) => {
    interactiveChannelId.value = id;
  });
  unsubscribeWheel = window.desktopApi.onPassthroughWheel(applyPassthroughWheel);

  const settings = await window.desktopApi.getSettings();
  layoutMode.value = settings.layoutMode;
  hasSubmitted.value = settings.hasSubmitted;
  searchShortcut.value = settings.searchShortcut || DEFAULT_SEARCH_SHORTCUT;
  for (const ch of CHANNELS) {
    enabledMap[ch.id] = settings.channelPrefs[ch.id]?.enabled !== false;
  }
  // 修正历史错误格式（boolean 直存）并写回磁盘
  await window.desktopApi.setChannelPrefs(channelPrefsFromEnabledMap(enabledMap));
  syncViewVisibility();
  void startChannelInit();
});

onUnmounted(() => {
  window.removeEventListener("keydown", onGlobalKeydown);
  unsubscribeStates?.();
  unsubscribeInit?.();
  unsubscribeReset?.();
  unsubscribeOpenSearch?.();
  unsubscribeInteractive?.();
  unsubscribeWheel?.();
});
</script>

<style scoped>
.app-root {
  position: relative;
  z-index: 0;
  min-height: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  --channel-block-height: 60vh;
}

.bg-grid {
  pointer-events: none;
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at 50% 0%, black 20%, transparent 70%);
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(12, 14, 18, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
}

.top-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  justify-self: start;
}

.top-center {
  justify-self: center;
  text-align: center;
  max-width: 420px;
}

.init-status {
  font-size: 13px;
  color: var(--text-secondary);
}

.init-status.loading {
  color: var(--accent);
}

.init-status.done {
  color: var(--success);
}

.init-status.warn {
  color: var(--warning);
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-self: end;
}

.app-mark {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.query-chip {
  font-size: 12px;
  color: var(--text-muted);
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ghost-btn {
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 999px;
}

.ghost-btn:hover {
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.search-fab {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  transition: transform var(--transition), background var(--transition);
}

.search-fab:hover {
  transform: scale(1.05);
  background: rgba(61, 214, 198, 0.2);
  color: var(--accent);
}

.landing {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px 80px;
}

.landing-inner {
  width: 100%;
  max-width: 680px;
  text-align: center;
}

.landing-title {
  margin: 0 0 28px;
  font-size: clamp(22px, 4vw, 28px);
  font-weight: 600;
  letter-spacing: -0.02em;
}

.landing-inner :deep(.prompt-shell) {
  margin: 0 auto;
  text-align: left;
}

.landing-settings {
  margin-top: 20px;
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 13px;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.landing-settings:hover {
  color: var(--accent);
}

.results {
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 12px 16px 20px;
  overflow: auto;
  box-sizing: border-box;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
}

@media (max-width: 720px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}

.accordion-stack {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fullscreen {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.fs-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
}

.fs-title {
  font-weight: 600;
}

.fs-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fs-body {
  flex: 1;
  min-height: 0;
  padding: 12px 16px 16px;
}

.fs-body :deep(.webview-slot) {
  height: 100%;
  min-height: calc(100vh - 56px);
  border-radius: var(--radius-md);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(8, 10, 14, 0.45);
  backdrop-filter: blur(18px) saturate(1.2);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
}

.modal-dialog {
  width: 100%;
  max-width: 560px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.22s ease;
}

.modal-fade-enter-active .modal-dialog,
.modal-fade-leave-active .modal-dialog {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-dialog,
.modal-fade-leave-to .modal-dialog {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  padding: 10px 18px;
  border-radius: 999px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  font-size: 13px;
  z-index: 300;
  box-shadow: var(--shadow-soft);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
