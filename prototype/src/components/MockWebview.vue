<template>
  <div class="mock-viewport" :style="{ '--ch-accent': accent }">
    <div class="mock-chrome">
      <span class="dot" /><span class="dot" /><span class="dot" />
      <span class="url">{{ entryLabel }}</span>
    </div>
    <div class="mock-body">
      <div v-if="status === 'loading' || status === 'resetting'" class="mock-state">
        <span class="pulse" />
        {{ status === "resetting" ? "正在开启新会话…" : "正在发送并等待页面响应…" }}
      </div>
      <template v-else-if="status === 'failed'">
        <div class="mock-error">
          {{ error ?? "自动化失败，请在本页手动操作" }}
        </div>
      </template>
      <template v-else>
        <div class="mock-user">{{ lastPrompt || "（等待提问）" }}</div>
        <div class="mock-reply">
          <p v-for="(line, i) in mockReplyLines" :key="i">{{ line }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import type { ChannelStatus } from "../types/app.types";

const props = defineProps<{
  accent: string;
  entryLabel: string;
  status: ChannelStatus;
  error?: string;
  lastPrompt?: string;
  channelName: string;
}>();

const mockReplyLines = computed(() => {
  if (!props.lastPrompt) {
    return ["内嵌 WebView 区域 — 正式版将加载真实站点。"];
  }
  return [
    `【${props.channelName} · 模拟回答】`,
    "此处为原型占位，用于确认卡片高度与滚动行为。",
    "桌面版会在同一区域嵌入真实网页，你可继续对话或点击结果链接。",
  ];
});
</script>

<style scoped>
.mock-viewport {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #0a0c10;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  overflow: hidden;
}

.mock-chrome {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid var(--border-subtle);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
}

.url {
  margin-left: 8px;
  font-size: 11px;
  color: var(--text-muted);
  font-family: ui-monospace, monospace;
}

.mock-body {
  flex: 1;
  padding: 16px;
  overflow: auto;
}

.mock-state {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 13px;
}

.pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ch-accent, var(--accent));
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

.mock-error {
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  background: rgba(240, 113, 120, 0.12);
  border: 1px solid rgba(240, 113, 120, 0.35);
  color: #ffb4b9;
  font-size: 13px;
  line-height: 1.5;
}

.mock-user {
  align-self: flex-end;
  max-width: 88%;
  margin-bottom: 14px;
  padding: 10px 14px;
  border-radius: 12px 12px 4px 12px;
  background: color-mix(in srgb, var(--ch-accent) 22%, transparent);
  border: 1px solid color-mix(in srgb, var(--ch-accent) 40%, transparent);
  font-size: 13px;
  line-height: 1.45;
}

.mock-reply {
  max-width: 92%;
  padding: 12px 14px;
  border-radius: 4px 12px 12px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-secondary);
}

.mock-reply p {
  margin: 0 0 8px;
}

.mock-reply p:last-child {
  margin-bottom: 0;
}
</style>
