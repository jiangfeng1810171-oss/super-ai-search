<template>
  <div
    class="prompt-shell"
    :class="{ compact: compact, modal: modal }"
  >
    <label v-if="!compact" class="prompt-label" :for="inputId">
      {{ label }}
    </label>
    <div class="prompt-box">
      <textarea
        :id="inputId"
        ref="textareaRef"
        v-model="localValue"
        class="prompt-input"
        :rows="compact ? 4 : 6"
        :placeholder="placeholder"
        @keydown="onKeydown"
      />
      <div class="prompt-foot">
        <span class="hint">{{ hint }}</span>
        <button
          type="button"
          class="send-btn"
          :disabled="!localValue.trim()"
          @click="emitSend"
        >
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { nextTick, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    inputId?: string;
    label?: string;
    placeholder?: string;
    hint?: string;
    compact?: boolean;
    modal?: boolean;
    autofocus?: boolean;
  }>(),
  {
    inputId: "prompt-input",
    label: "输入问题，将并行发送到已启用的渠道",
    placeholder: "例如：对比 React 与 Vue 在大型项目中的优劣…",
    hint: "Enter 发送 · ⌘ + Enter 换行",
    compact: false,
    modal: false,
    autofocus: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  send: [];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const localValue = ref(props.modelValue);

watch(
  () => props.modelValue,
  (v) => {
    localValue.value = v;
  },
);

watch(localValue, (v) => emit("update:modelValue", v));

watch(
  () => props.autofocus,
  async (v) => {
    if (!v) return;
    await nextTick();
    textareaRef.value?.focus();
  },
  { immediate: true },
);

function onKeydown(e: KeyboardEvent): void {
  const isMeta = e.metaKey || e.ctrlKey;
  if (e.key === "Enter" && isMeta) return;
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    emitSend();
  }
}

function emitSend(): void {
  if (!localValue.value.trim()) return;
  emit("send");
}

defineExpose({ focus: () => textareaRef.value?.focus() });
</script>

<style scoped>
.prompt-shell {
  width: 100%;
  max-width: 640px;
}

.prompt-shell.modal {
  max-width: 560px;
}

.prompt-label {
  display: block;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.prompt-box {
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}

.prompt-input {
  width: 100%;
  min-height: 140px;
  padding: 20px 22px 12px;
  border: none;
  resize: vertical;
  background: transparent;
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.55;
}

.prompt-input::placeholder {
  color: var(--text-muted);
}

.prompt-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px 14px;
  border-top: 1px solid var(--border-subtle);
}

.hint {
  font-size: 12px;
  color: var(--text-muted);
}

.send-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 999px;
  background: var(--accent);
  color: #0a1210;
  font-size: 13px;
  font-weight: 600;
  transition: transform var(--transition), box-shadow var(--transition);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px var(--accent-glow);
}

.send-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
