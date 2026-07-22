import { contextBridge, ipcRenderer } from "electron";

function readChannelId(): string {
  const arg = process.argv.find((a) => a.startsWith("--sas-channel="));
  return arg ? arg.slice("--sas-channel=".length) : "";
}

const channelId = readChannelId();

let interactiveCb: ((interactive: boolean) => void) | null = null;

ipcRenderer.on("channel:interactive", (_: unknown, value: boolean) => {
  interactiveCb?.(value);
});

contextBridge.exposeInMainWorld("__sasDesktop", {
  passthroughWheel: (payload: {
    deltaX: number;
    deltaY: number;
    deltaMode: number;
  }) => {
    ipcRenderer.send("channel:passthrough-wheel", { channelId, ...payload });
  },
  requestActivate: () => {
    ipcRenderer.send("channel:request-activate", channelId);
  },
  subscribeInteractive: (cb: (interactive: boolean) => void) => {
    interactiveCb = cb;
    void ipcRenderer.invoke("channel:get-interactive", channelId).then(cb);
  },
});
