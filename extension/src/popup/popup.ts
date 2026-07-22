const promptEl = document.getElementById("prompt") as HTMLTextAreaElement;
const submitEl = document.getElementById("submit") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;
const openOptions = document.getElementById("openOptions") as HTMLAnchorElement;

openOptions.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

function setStatus(text: string, kind: "idle" | "ok" | "error" = "idle"): void {
  statusEl.textContent = text;
  statusEl.classList.remove("ok", "error");
  if (kind === "ok") statusEl.classList.add("ok");
  if (kind === "error") statusEl.classList.add("error");
}

submitEl.addEventListener("click", async () => {
  const prompt = promptEl.value.trim();
  if (!prompt) {
    setStatus("请先输入内容", "error");
    return;
  }

  submitEl.disabled = true;
  setStatus("正在打开标签页并填充…");

  try {
    const res = await chrome.runtime.sendMessage({
      type: "DISPATCH_PROMPT",
      prompt,
    });
    if (!res?.ok) {
      setStatus(res?.error ?? "发送失败", "error");
      return;
    }
    const { ok, failed } = res.result as {
      ok: string[];
      failed: { id: string; error: string }[];
    };
    if (failed.length === 0) {
      setStatus(`已完成：${ok.length} 个渠道`, "ok");
    } else {
      setStatus(
        `成功 ${ok.length}，失败 ${failed.length}：${failed.map((f) => f.id).join("、")}`,
        failed.length === ok.length ? "error" : "ok",
      );
    }
  } catch (e) {
    setStatus(e instanceof Error ? e.message : "未知错误", "error");
  } finally {
    submitEl.disabled = false;
  }
});

promptEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    submitEl.click();
  }
});

export {};
