<template>
  <Teleport to="body">
    <div v-if="open" class="settings-backdrop" @click.self="emit('close')">
      <aside class="settings-panel" role="dialog" aria-labelledby="settings-title">
        <header class="settings-head">
          <h2 id="settings-title">设置</h2>
          <button type="button" class="close" aria-label="关闭" @click="emit('close')">
            ×
          </button>
        </header>

        <section class="block">
          <h3>布局</h3>
          <div class="seg">
            <button
              type="button"
              :class="{ active: layoutMode === 'cards' }"
              @click="emit('update:layoutMode', 'cards')"
            >
              卡片
            </button>
            <button
              type="button"
              :class="{ active: layoutMode === 'accordion' }"
              @click="emit('update:layoutMode', 'accordion')"
            >
              手风琴
            </button>
          </div>
          <p class="help">卡片模式每行最多 2 个渠道。</p>
        </section>

        <section class="block">
          <h3>搜索快捷键</h3>
          <div class="shortcut-row">
            <button
              type="button"
              class="shortcut-btn"
              :class="{ capturing }"
              @click="startCapture"
              @keydown="onCaptureKey"
            >
              {{ capturing ? "按下新快捷键…" : shortcutLabel }}
            </button>
            <button
              type="button"
              class="text-link"
              :disabled="searchShortcut === defaultShortcut"
              @click="resetShortcut"
            >
              恢复默认
            </button>
          </div>
          <p class="help">仅应用前台生效。默认 ⌘⇧S（Windows / Linux 为 Ctrl+Shift+S）。</p>
        </section>

        <section class="block">
          <h3>启用渠道</h3>
          <ul class="channel-list">
            <li v-for="ch in channels" :key="ch.id">
              <label>
                <input
                  type="checkbox"
                  :checked="enabledMap[ch.id]"
                  @change="onToggle(ch.id, ($event.target as HTMLInputElement).checked)"
                />
                <span class="dot" :style="{ background: ch.accent }" />
                {{ ch.name }}
              </label>
            </li>
          </ul>
        </section>

        <section class="block">
          <button type="button" class="reset-all" @click="emit('resetAll')">
            全部新会话
          </button>
          <p class="help">无确认框，立即重置已启用渠道。</p>
        </section>

        <footer class="proto-note">桌面版 · 内嵌网页为真实渠道站点</footer>
      </aside>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import {
  acceleratorFromKeyboardEvent,
  DEFAULT_SEARCH_SHORTCUT,
  formatAcceleratorLabel,
} from "@shared/shortcut.js";
import type { LayoutMode } from "@shared/types.js";

export interface SettingsChannelMeta {
  id: string;
  name: string;
  accent: string;
}

const props = defineProps<{
  open: boolean;
  layoutMode: LayoutMode;
  channels: SettingsChannelMeta[];
  enabledMap: Record<string, boolean>;
  searchShortcut: string;
}>();

const emit = defineEmits<{
  close: [];
  "update:layoutMode": [mode: LayoutMode];
  "update:enabledMap": [map: Record<string, boolean>];
  "update:searchShortcut": [accel: string];
  resetAll: [];
}>();

const capturing = ref(false);
const defaultShortcut = DEFAULT_SEARCH_SHORTCUT;

const shortcutLabel = computed(() => formatAcceleratorLabel(props.searchShortcut));

watch(
  () => props.open,
  (open) => {
    if (!open) capturing.value = false;
  },
);

function onToggle(id: string, enabled: boolean): void {
  emit("update:enabledMap", { ...props.enabledMap, [id]: enabled });
}

function startCapture(): void {
  capturing.value = true;
}

function onCaptureKey(e: KeyboardEvent): void {
  if (!capturing.value) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.key === "Escape") {
    capturing.value = false;
    return;
  }
  const accel = acceleratorFromKeyboardEvent(e);
  if (!accel) return;
  capturing.value = false;
  emit("update:searchShortcut", accel);
}

function resetShortcut(): void {
  capturing.value = false;
  emit("update:searchShortcut", DEFAULT_SEARCH_SHORTCUT);
}
</script>

<style scoped>
.settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
}

.settings-panel {
  width: min(360px, 92vw);
  height: 100%;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-strong);
  display: flex;
  flex-direction: column;
  padding: 20px 20px 16px;
  animation: slideIn 0.25s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.settings-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.settings-head h2 {
  margin: 0;
  font-size: 18px;
}

.close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  font-size: 20px;
  line-height: 1;
}

.block {
  margin-bottom: 22px;
}

.block h3 {
  margin: 0 0 10px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.seg {
  display: flex;
  padding: 4px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.25);
  gap: 4px;
}

.seg button {
  flex: 1;
  border: none;
  padding: 8px;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
}

.seg button.active {
  background: var(--bg-elevated);
  color: var(--text-primary);
  box-shadow: 0 1px 0 var(--border-subtle);
}

.help {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.45;
}

.shortcut-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shortcut-btn {
  flex: 1;
  min-height: 40px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  letter-spacing: 0.04em;
}

.shortcut-btn.capturing {
  border-color: var(--accent);
  color: var(--accent);
  animation: pulse 1.2s ease infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.7;
  }
}

.text-link {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
  padding: 0;
}

.text-link:disabled {
  opacity: 0.4;
}

.text-link:not(:disabled):hover {
  color: var(--accent);
}

.channel-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.channel-list label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.channel-list label:hover {
  background: rgba(255, 255, 255, 0.04);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.reset-all {
  width: 100%;
  padding: 11px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.reset-all:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.proto-note {
  margin-top: auto;
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
}
</style>
