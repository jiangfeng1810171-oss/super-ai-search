<template>
  <div class="app-root">
    <div class="bg-grid" aria-hidden="true" />

    <!-- 顶栏：结果态显示 -->
    <header v-if="hasSubmitted && !fullscreenChannelId" class="top-bar">
      <div class="top-left">
        <span class="app-mark">超级 AI 搜索</span>
        <span v-if="lastQuery" class="query-chip" :title="lastQuery">
          {{ truncatedQuery }}
        </span>
      </div>
      <div class="top-actions">
        <button type="button" class="ghost-btn" @click="resetAllSessions">
          全部新会话
        </button>
        <button type="button" class="ghost-btn" @click="settingsOpen = true">
          设置
        </button>
        <button
          type="button"
          class="search-fab"
          title="再次搜索"
          aria-label="再次搜索"
          @click="openSearchModal"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </header>

    <!-- 首屏：仅输入 -->
    <main v-if="!hasSubmitted" class="landing">
      <div class="landing-inner">
        <p class="kicker">交互原型 · 确认布局与流程</p>
        <h1 class="landing-title">一次提问，并排查看各渠道</h1>
        <PromptComposer
          v-model="draft"
          input-id="landing-prompt"
          autofocus
          @send="submitFromLanding"
        />
        <button type="button" class="landing-settings" @click="settingsOpen = true">
          渠道与布局设置
        </button>
      </div>
    </main>

    <!-- 结果区 -->
    <main v-else-if="!fullscreenChannelId" class="results">
      <div v-if="layoutMode === 'cards'" class="cards-grid">
        <ChannelCard
          v-for="item in visibleChannels"
          :key="item.meta.id"
          :meta="item.meta"
          :channel="item.runtime"
          @expand="enterFullscreen(item.meta.id)"
          @refresh="simulateRefresh(item.meta.id)"
          @retry="retryChannel(item.meta.id)"
        />
      </div>
      <div v-else class="accordion-stack">
        <ChannelAccordionItem
          v-for="item in visibleChannels"
          :key="item.meta.id"
          :meta="item.meta"
          :channel="item.runtime"
          :open="accordionOpen[item.meta.id] ?? true"
          @toggle="toggleAccordion(item.meta.id)"
          @expand="enterFullscreen(item.meta.id)"
          @refresh="simulateRefresh(item.meta.id)"
          @retry="retryChannel(item.meta.id)"
        />
      </div>
    </main>

    <!-- 沉浸式全屏 -->
    <main v-else class="fullscreen">
      <header class="fs-bar">
        <span class="fs-title">{{ fullscreenMeta?.name }}</span>
        <button type="button" class="ghost-btn" @click="exitFullscreen">退出全屏 · Esc</button>
      </header>
      <div class="fs-body">
        <MockWebview
          v-if="fullscreenMeta && fullscreenRuntime"
          :accent="fullscreenMeta.accent"
          :entry-label="fullscreenMeta.entryLabel"
          :status="fullscreenRuntime.status"
          :error="fullscreenRuntime.error"
          :last-prompt="fullscreenRuntime.lastPrompt"
          :channel-name="fullscreenMeta.name"
        />
      </div>
    </main>

    <!-- 再搜索模态 -->
    <Teleport to="body">
      <div
        v-if="searchModalOpen"
        class="modal-backdrop"
        @click.self="closeSearchModal"
        @keydown.esc="closeSearchModal"
      >
        <div class="modal-card" role="dialog" aria-modal="true" aria-label="再次搜索">
          <PromptComposer
            v-model="draft"
            input-id="modal-prompt"
            modal
            compact
            label="再次提问"
            autofocus
            @send="submitFromModal"
          />
          <button type="button" class="modal-close" @click="closeSearchModal">取消 · Esc</button>
        </div>
      </div>
    </Teleport>

    <SettingsDrawer
      :layout-mode="layoutMode"
      :enabled-map="enabledMap"
      :open="settingsOpen"
      :channels="CHANNELS"
      @close="settingsOpen = false"
      @update:layout-mode="layoutMode = $event"
      @update:enabled-map="onEnabledMapUpdate"
      @reset-all="resetAllSessions"
    />

    <Transition name="toast">
      <p v-if="toast" class="toast" role="status">{{ toast }}</p>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { CHANNELS, getChannelMeta } from "./data/channels";
import ChannelAccordionItem from "./components/ChannelAccordionItem.vue";
import ChannelCard from "./components/ChannelCard.vue";
import MockWebview from "./components/MockWebview.vue";
import PromptComposer from "./components/PromptComposer.vue";
import SettingsDrawer from "./components/SettingsDrawer.vue";
import type { ChannelRuntime, LayoutMode } from "./types/app.types";

const hasSubmitted = ref(false);
const draft = ref("");
const lastQuery = ref("");
const layoutMode = ref<LayoutMode>("cards");
const settingsOpen = ref(false);
const searchModalOpen = ref(false);
const fullscreenChannelId = ref<string | null>(null);
const toast = ref("");
const accordionOpen = reactive<Record<string, boolean>>(
  Object.fromEntries(CHANNELS.map((c) => [c.id, true])),
);

const enabledMap = reactive<Record<string, boolean>>(
  Object.fromEntries(CHANNELS.map((c) => [c.id, true])),
);

const runtimes = reactive<Record<string, ChannelRuntime>>(
  Object.fromEntries(
    CHANNELS.map((c) => [
      c.id,
      {
        id: c.id,
        enabled: true,
        status: "idle" as const,
        expanded: false,
      },
    ]),
  ),
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

const fullscreenMeta = computed(() =>
  fullscreenChannelId.value ? getChannelMeta(fullscreenChannelId.value) : undefined,
);

const fullscreenRuntime = computed(() =>
  fullscreenChannelId.value ? runtimes[fullscreenChannelId.value] : undefined,
);

function showToast(msg: string): void {
  toast.value = msg;
  window.setTimeout(() => {
    toast.value = "";
  }, 2200);
}

function onEnabledMapUpdate(map: Record<string, boolean>): void {
  for (const key of Object.keys(map)) {
    enabledMap[key] = map[key];
  }
}

function submitFromLanding(): void {
  if (!draft.value.trim()) {
    showToast("请输入问题");
    return;
  }
  if (visibleChannels.value.length === 0) {
    showToast("请至少在设置中启用一个渠道");
    return;
  }
  hasSubmitted.value = true;
  dispatchPrompt(draft.value.trim());
  draft.value = "";
}

function submitFromModal(): void {
  if (!draft.value.trim()) return;
  dispatchPrompt(draft.value.trim());
  draft.value = "";
  searchModalOpen.value = false;
}

function dispatchPrompt(prompt: string): void {
  lastQuery.value = prompt;
  for (const { meta } of visibleChannels.value) {
    simulateSend(meta.id, prompt);
  }
}

function simulateSend(id: string, prompt: string): void {
  const rt = runtimes[id];
  rt.status = "loading";
  rt.error = undefined;
  rt.lastPrompt = prompt;
  const failDemo = id === "gemini" && prompt.includes("失败");
  window.setTimeout(() => {
    if (failDemo) {
      rt.status = "failed";
      rt.error = "原型演示：输入包含「失败」时 Gemini 模拟失败";
      return;
    }
    rt.status = "sent";
  }, 900 + Math.random() * 600);
}

function retryChannel(id: string): void {
  if (!lastQuery.value) return;
  simulateSend(id, lastQuery.value);
}

function simulateRefresh(id: string): void {
  runtimes[id].status = "loading";
  window.setTimeout(() => {
    runtimes[id].status = runtimes[id].lastPrompt ? "sent" : "idle";
  }, 500);
}

function resetAllSessions(): void {
  for (const { meta } of visibleChannels.value) {
    const rt = runtimes[meta.id];
    rt.status = "resetting";
    rt.error = undefined;
  }
  window.setTimeout(() => {
    for (const { meta } of visibleChannels.value) {
      const rt = runtimes[meta.id];
      rt.status = "idle";
      rt.lastPrompt = undefined;
    }
    showToast("已全部开启新会话（模拟）");
  }, 1100);
}

function openSearchModal(): void {
  searchModalOpen.value = true;
}

function closeSearchModal(): void {
  searchModalOpen.value = false;
}

function enterFullscreen(id: string): void {
  fullscreenChannelId.value = id;
}

function exitFullscreen(): void {
  fullscreenChannelId.value = null;
}

function toggleAccordion(id: string): void {
  accordionOpen[id] = !accordionOpen[id];
}

function onGlobalKeydown(e: KeyboardEvent): void {
  if (e.key !== "Escape") return;
  if (fullscreenChannelId.value) {
    exitFullscreen();
    return;
  }
  if (searchModalOpen.value) {
    closeSearchModal();
    return;
  }
  if (settingsOpen.value) {
    settingsOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener("keydown", onGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onGlobalKeydown);
});
</script>

<style scoped>
.app-root {
  position: relative;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  background: rgba(12, 14, 18, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
}

.top-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
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

.top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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

.kicker {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--accent);
  letter-spacing: 0.06em;
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

.fs-body {
  flex: 1;
  min-height: 0;
  padding: 12px;
}

.fs-body :deep(.mock-viewport) {
  height: 100%;
  min-height: calc(100vh - 56px);
  border-radius: var(--radius-md);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(6px);
}

.modal-card {
  width: 100%;
  max-width: 580px;
  animation: modalIn 0.28s ease;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.modal-close {
  display: block;
  width: 100%;
  margin-top: 12px;
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 13px;
  padding: 8px;
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
