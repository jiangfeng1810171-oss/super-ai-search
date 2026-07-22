<template>
  <section
    class="accordion-item"
    :class="{ open: open, interactive: interactive }"
  >
    <button
      type="button"
      class="accordion-trigger"
      @click="emit('toggle')"
      @mousedown="emit('deactivate')"
    >
      <span class="badge" :style="{ background: meta.accent }" />
      <span class="name">{{ meta.name }}</span>
      <span
        class="status"
        :data-status="interactive ? 'interactive' : channel.status"
      >
        {{ interactive ? "交互中" : statusLabel }}
      </span>
      <span class="chevron">{{ open ? "▾" : "▸" }}</span>
    </button>
    <div v-show="open" class="accordion-panel">
      <div class="panel-toolbar" @mousedown="emit('deactivate')">
        <button type="button" class="tb" @click.stop="emit('copyLink')">复制链接</button>
        <button type="button" class="tb" @click.stop="emit('expand')">全屏</button>
        <button type="button" class="tb" @click.stop="emit('refresh')">刷新</button>
        <button
          v-if="channel.status === 'failed'"
          type="button"
          class="tb accent"
          @click.stop="emit('retry')"
        >
          重试
        </button>
      </div>
      <WebviewSlot
        :channel-id="meta.id"
        :status="channel.status"
        :error="channel.error"
        :active="active && open"
        class="accordion-slot"
        @retry="emit('retry')"
      />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import WebviewSlot from "./WebviewSlot.vue";
import type { ChannelMetaView, ChannelRuntimeView } from "./ChannelCard.vue";

const props = defineProps<{
  meta: ChannelMetaView;
  channel: ChannelRuntimeView;
  open: boolean;
  active: boolean;
  interactive?: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
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
.accordion-item {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-card);
  transition: border-color var(--transition), box-shadow var(--transition);
}

.accordion-item.interactive {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent-dim);
}

.accordion-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: none;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-primary);
  text-align: left;
}

.badge {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.name {
  font-weight: 600;
  flex: 1;
}

.status {
  font-size: 11px;
  color: var(--text-muted);
}

.status[data-status="sent"] {
  color: var(--success);
}

.status[data-status="failed"] {
  color: var(--danger);
}

.status[data-status="interactive"] {
  color: var(--accent);
}

.chevron {
  color: var(--text-muted);
  font-size: 12px;
}

.accordion-panel {
  border-top: 1px solid var(--border-subtle);
}

.panel-toolbar {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.tb {
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
}

.tb.accent {
  color: var(--accent);
}

.accordion-slot {
  height: var(--channel-block-height, 60vh);
  min-height: var(--channel-block-height, 60vh);
  flex: none;
}

.accordion-slot :deep(.webview-slot) {
  height: 100%;
  border-radius: 0;
}
</style>
