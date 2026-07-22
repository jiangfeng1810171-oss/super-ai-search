<template>
  <article
    class="channel-card"
    :class="{ failed: channel.status === 'failed' }"
    :style="{ '--ch-accent': meta.accent }"
  >
    <header class="card-head">
      <div class="title-row">
        <span class="badge" />
        <h3 class="name">{{ meta.name }}</h3>
        <span class="status-pill" :data-status="channel.status">
          {{ statusLabel }}
        </span>
      </div>
      <div class="actions">
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
    <MockWebview
      :accent="meta.accent"
      :entry-label="meta.entryLabel"
      :status="channel.status"
      :error="channel.error"
      :last-prompt="channel.lastPrompt"
      :channel-name="meta.name"
    />
  </article>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import MockWebview from "./MockWebview.vue";
import type { ChannelMeta } from "../types/app.types";
import type { ChannelRuntime } from "../types/app.types";

const props = defineProps<{
  meta: ChannelMeta;
  channel: ChannelRuntime;
}>();

const emit = defineEmits<{
  expand: [];
  refresh: [];
  retry: [];
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

.channel-card :deep(.mock-viewport) {
  flex: 1;
  min-height: 0;
}

.channel-card.failed {
  border-color: rgba(240, 113, 120, 0.35);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border-subtle);
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
