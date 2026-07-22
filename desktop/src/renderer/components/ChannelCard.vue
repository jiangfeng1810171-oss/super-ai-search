<template>
  <article
    class="channel-card"
    :class="{
      failed: channel.status === 'failed',
      interactive: interactive,
    }"
    :style="{ '--ch-accent': meta.accent }"
  >
    <header class="card-head" @mousedown="emit('deactivate')">
      <div class="title-row">
        <span class="badge" />
        <h3 class="name">{{ meta.name }}</h3>
        <span
          class="status-pill"
          :data-status="interactive ? 'interactive' : channel.status"
        >
          {{ interactive ? "交互中" : statusLabel }}
        </span>
      </div>
      <div class="actions">
        <button type="button" class="icon-btn" title="复制链接" @click="emit('copyLink')">
          ⧉
        </button>
        <button type="button" class="icon-btn" title="刷新" @click="emit('refresh')">
          ↻
        </button>
        <button
          v-if="channel.status === 'failed'"
          type="button"
          class="text-btn"
          @click="emit('retry')"
        >
          重试
        </button>
        <button type="button" class="icon-btn" title="全屏" @click="emit('expand')">
          ⤢
        </button>
      </div>
    </header>
    <WebviewSlot
      :channel-id="meta.id"
      :status="channel.status"
      :error="channel.error"
      :active="active"
      @retry="emit('retry')"
    />
  </article>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import WebviewSlot from "./WebviewSlot.vue";
import type { ChannelStatus } from "../env.js";

export interface ChannelMetaView {
  id: string;
  name: string;
  accent: string;
  entryLabel: string;
}

export interface ChannelRuntimeView {
  status: ChannelStatus;
  error?: string;
  lastPrompt?: string;
}

const props = defineProps<{
  meta: ChannelMetaView;
  channel: ChannelRuntimeView;
  active: boolean;
  interactive?: boolean;
}>();

const emit = defineEmits<{
  expand: [];
  refresh: [];
  retry: [];
  copyLink: [];
  deactivate: [];
}>();

const statusLabel = computed(() => {
  switch (props.channel.status) {
    case "loading":
      return "发送中";
    case "resetting":
      return "新会话";
    case "sent":
      return "已发送";
    case "failed":
      return "失败";
    default:
      return "就绪";
  }
});
</script>

<style scoped>
.channel-card {
  display: flex;
  flex-direction: column;
  height: var(--channel-block-height, 60vh);
  min-height: var(--channel-block-height, 60vh);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: border-color var(--transition), box-shadow var(--transition);
}

.channel-card:hover {
  border-color: color-mix(in srgb, var(--ch-accent) 35%, var(--border-subtle));
}

.channel-card.failed {
  border-color: rgba(240, 113, 120, 0.35);
}

.channel-card.interactive {
  border-color: color-mix(in srgb, var(--ch-accent) 70%, var(--border-subtle));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ch-accent) 45%, transparent);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.badge {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ch-accent);
  flex-shrink: 0;
}

.name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.status-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
}

.status-pill[data-status="sent"] {
  color: var(--success);
  background: rgba(127, 217, 98, 0.12);
}

.status-pill[data-status="loading"],
.status-pill[data-status="resetting"] {
  color: var(--accent);
  background: var(--accent-dim);
}

.status-pill[data-status="failed"] {
  color: var(--danger);
  background: rgba(240, 113, 120, 0.12);
}

.status-pill[data-status="interactive"] {
  color: var(--accent);
  background: var(--accent-dim);
}

.actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-btn,
.text-btn {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.icon-btn:hover,
.text-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}

.text-btn {
  color: var(--accent);
}
</style>
