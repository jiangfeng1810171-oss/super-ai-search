<template>
  <div ref="slotRef" class="webview-slot">
    <div v-if="status === 'failed'" class="error-banner">
      {{ error ?? "渠道操作失败，请在本页手动完成" }}
      <button type="button" class="retry" @click="emit('retry')">重试</button>
    </div>
    <div v-else-if="status === 'loading' || status === 'resetting'" class="overlay">
      {{ status === "resetting" ? "正在开启新会话…" : "正在发送…" }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, watch } from "vue";
import type { ChannelStatus } from "../env.js";

const props = defineProps<{
  channelId: string;
  status: ChannelStatus;
  error?: string;
  active: boolean;
}>();

const emit = defineEmits<{ retry: [] }>();

const slotRef = ref<HTMLElement | null>(null);
let observer: ResizeObserver | null = null;
let raf = 0;

function reportBounds(): void {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    const el = slotRef.value;
    if (!el || !props.active) {
      window.desktopApi.setViewBounds(props.channelId, {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
      return;
    }
    const rect = el.getBoundingClientRect();
    window.desktopApi.setViewBounds(props.channelId, {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
  });
}

watch(
  () => props.active,
  () => reportBounds(),
);

onMounted(() => {
  observer = new ResizeObserver(reportBounds);
  if (slotRef.value) observer.observe(slotRef.value);
  window.addEventListener("scroll", reportBounds, true);
  window.addEventListener("resize", reportBounds);
  reportBounds();
});

onUnmounted(() => {
  observer?.disconnect();
  window.removeEventListener("scroll", reportBounds, true);
  window.removeEventListener("resize", reportBounds);
  cancelAnimationFrame(raf);
  window.desktopApi.setViewBounds(props.channelId, {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
});
</script>

<style scoped>
.webview-slot {
  position: relative;
  flex: 1;
  min-height: 0;
  background: #0a0c10;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 12, 16, 0.55);
  color: var(--text-secondary);
  font-size: 13px;
  pointer-events: none;
  z-index: 2;
}

.error-banner {
  position: absolute;
  left: 8px;
  right: 8px;
  top: 8px;
  z-index: 3;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: rgba(240, 113, 120, 0.15);
  border: 1px solid rgba(240, 113, 120, 0.35);
  color: #ffb4b9;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.retry {
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  flex-shrink: 0;
}
</style>
