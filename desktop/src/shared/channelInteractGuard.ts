/**
 * 注入到渠道页主世界：未激活时拦截滚轮（转整页滚动）与点击（请求激活）
 * 依赖 preload 暴露的 window.__sasDesktop
 */
export const CHANNEL_INTERACT_GUARD_SCRIPT = `
(() => {
  if (window.__sasGuardInstalled) return true;
  if (!window.__sasDesktop) return false;
  window.__sasGuardInstalled = true;

  var interactive = false;
  var hint = null;

  function ensureHint() {
    if (interactive) {
      if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
      hint = null;
      return;
    }
    if (hint && hint.parentNode) return;
    hint = document.createElement("div");
    hint.setAttribute("data-sas-hint", "1");
    hint.textContent = "点击以交互 · 滚轮滚动整页";
    hint.style.cssText = [
      "position:fixed",
      "left:50%",
      "bottom:14px",
      "transform:translateX(-50%)",
      "z-index:2147483646",
      "padding:8px 14px",
      "border-radius:999px",
      "background:rgba(12,14,18,0.82)",
      "color:#eef1f6",
      "font:12px/1.3 -apple-system,BlinkMacSystemFont,sans-serif",
      "letter-spacing:0.02em",
      "pointer-events:none",
      "box-shadow:0 8px 24px rgba(0,0,0,0.35)",
      "border:1px solid rgba(61,214,198,0.35)",
      "backdrop-filter:blur(8px)",
    ].join(";");
    (document.documentElement || document.body).appendChild(hint);
  }

  function setInteractive(next) {
    interactive = !!next;
    ensureHint();
  }

  window.addEventListener(
    "wheel",
    function (e) {
      if (interactive) return;
      e.preventDefault();
      e.stopPropagation();
      window.__sasDesktop.passthroughWheel({
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        deltaMode: e.deltaMode,
      });
    },
    { capture: true, passive: false },
  );

  window.addEventListener(
    "mousedown",
    function (e) {
      if (interactive) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      window.__sasDesktop.requestActivate();
    },
    { capture: true },
  );

  window.__sasDesktop.subscribeInteractive(setInteractive);
  ensureHint();
  return true;
})();
`;
