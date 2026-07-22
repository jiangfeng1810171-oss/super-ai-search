import { CHANNELS } from "../shared/channels.js";
import { loadSettings, saveSettings } from "../shared/storage.js";

const listEl = document.getElementById("channelList") as HTMLUListElement;
const saveEl = document.getElementById("save") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;

async function render(): Promise<void> {
  const settings = await loadSettings();
  listEl.innerHTML = "";
  for (const ch of CHANNELS) {
    const li = document.createElement("li");
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.dataset.channelId = ch.id;
    input.checked = settings.channelPrefs[ch.id]?.enabled ?? true;
    const span = document.createElement("span");
    span.textContent = ch.name;
    label.append(input, span);
    li.append(label);
    listEl.append(li);
  }
}

saveEl.addEventListener("click", async () => {
  const settings = await loadSettings();
  for (const input of listEl.querySelectorAll<HTMLInputElement>("input[type=checkbox]")) {
    const id = input.dataset.channelId;
    if (!id) continue;
    settings.channelPrefs[id] = { enabled: input.checked };
  }
  await saveSettings(settings);
  statusEl.textContent = "已保存";
  setTimeout(() => {
    statusEl.textContent = "";
  }, 2000);
});

void render();

export {};
