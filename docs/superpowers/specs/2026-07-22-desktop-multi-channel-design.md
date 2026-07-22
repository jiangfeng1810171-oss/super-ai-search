# 桌面版多渠道并行搜索 — 设计说明

**日期：** 2026-07-22  
**状态：** 待审  
**取代范围：** 删除 Chrome 扩展（`extension/`），以 Electron 桌面应用为唯一产品形态。

---

## 1. 目标与成功标准

用户一次输入问题，在**同一应用窗口**内并排查看多个渠道（豆包、Gemini、Kimi、Google、百度、DeepSeek、千问、腾讯元宝）的**真实网页**与交互能力，各渠道**自动填充并自动发送**，无需手动切换多个浏览器标签。

成功标准：

- 首屏极简：仅大输入框；发送后输入收起为右上角半透明搜索 icon，内容区以卡片展示（每行最多 2 张）。
- 再输入：点击 icon 打开居中模态大输入框，Enter 发送，Cmd+Enter 换行。
- 支持卡片 / 手风琴布局切换；卡片可沉浸式全屏（隐藏输入 icon 与顶栏，Esc 退出）。
- 一键「全部新会话」：无确认框，并行重置已启用渠道为新对话/空白搜索页，**保留登录态**。
- 首版发布 macOS 安装包；代码结构预留 Windows / Linux。

---

## 2. 非目标（YAGNI）

- Chrome 扩展及 `extension/` 目录。
- 抓取各站回答、Agent 汇总（原 README 二期）。
- 复用系统 Chrome Profile 或 Cookie。
- iframe 聚合外站（受 X-Frame-Options / CSP 限制）。
- 重置前确认对话框（产品决策：真正一键，选项 B）。

---

## 3. 技术选型

| 项 | 决策 |
|----|------|
| 壳 | **Electron**（Chromium 嵌页，与站点行为一致） |
| 壳 UI | **Vue 3 + Vite + TypeScript** |
| 嵌页 | 每渠道一个 `WebContentsView`（或当前 Electron 推荐的等价嵌页 API），挂到主窗口布局区域 |
| 会话 | `session.fromPartition('persist:channel-<id>')`  per 渠道，持久 Cookie |
| 配置 | `electron-store` 或等价 JSON 持久化 |
| 打包 | electron-builder，首版 **macOS**（架构上不绑死平台 API） |

---

## 4. 仓库结构

```
super-ai-search/
  desktop/
    src/
      main/           # 窗口、WebView 池、IPC、自动化调度
      preload/        # 壳 renderer 与 main 的 contextBridge
      renderer/       # Vue 壳：首屏、模态、卡片、设置
      shared/         # channels、类型、注入脚本（fill/submit/reset）
  docs/superpowers/specs/
  README.md           # 桌面版构建与使用
```

实施时 **删除** `extension/` 整目录。

---

## 5. 架构与数据流

### 5.1 进程职责

- **Main**：创建主窗口；按已启用渠道创建/销毁 WebView；后台预热 `loadURL(entryUrl)`；执行 `dispatchPrompt`、`resetAllSessions`；向 Renderer 推送各渠道状态。
- **Renderer**：纯壳 UI，不加载外站 URL。通过 IPC 触发搜索与重置，接收 `channelStatus` 更新。
- **渠道 WebView**：仅加载各站 `entryUrl` / `reset` URL，用户可在内嵌页内正常登录、滚动、继续对话。

### 5.2 发送流程

1. 用户输入（首屏或模态）→ `dispatchPrompt(prompt)`。
2. Main 对**已启用**渠道并行：
   - 确保 WebView 已加载且匹配 `matches`；
   - 注入/执行 **fill**（轮询 selector，逻辑源自原 `extension/src/content/fill.ts`）；
   - 执行 **submit**（click / Enter / form，按渠道配置）；
3. 结果：`ok` | `failed` + 错误摘要；Renderer 在卡片标题栏或 banner 展示；支持单渠道「重试发送」。

### 5.3 后台预热

- 应用启动后，对已启用渠道在**不可见区域**（离屏或极小 viewport）创建 WebView 并 `loadURL(entryUrl)`，用户首屏仍只见输入框。
- 首次发送后展示卡片网格；WebView 移入对应卡片 viewport（或从一开始就按卡片尺寸布局，首屏用遮罩/布局隐藏卡片区——实现择一，以「首屏仅输入框」为准）。

---

## 6. 界面与交互

### 6.1 阶段

| 阶段 | UI |
|------|-----|
| 未发送过 | 全屏居中**大输入框**（可有一句短提示）；**不展示**渠道卡片。 |
| 已发送过 | 右上角**半透明搜索 icon**；下方为渠道卡片区（或手风琴）。 |

### 6.2 输入快捷键

- **Enter**：发送（模态内阻止默认换行，或单行行为由产品定：多行 textarea 时 Enter 发送、Cmd+Enter 换行）。
- **Cmd+Enter**：换行。

### 6.3 再输入（模态 B）

- 点击搜索 icon → **居中模态**大输入框（与首屏一致）。
- Enter 发送 → 关闭模态；Esc 关闭不发送。

### 6.4 卡片布局

- 网格：**每行最多 2 列**（`grid-template-columns: repeat(2, 1fr)`）；窗口过窄时可降为 1 列（断点由实现定，如 `<720px`）。
- 每卡：渠道名、状态、放大、刷新、可选「重试」；下方为 WebView 视口。

### 6.5 手风琴布局

- 设置项 `layoutMode: 'cards' | 'accordion'`。
- 手风琴为纵向展开条；每条条内嵌同一 WebView 实例（切换布局不销毁 WebView，仅改变容器）。

### 6.6 沉浸式全屏

- 某卡「放大」→ 该渠道占满内容区；**隐藏**搜索 icon 与常规顶栏，仅保留 slim 条（渠道名 + 退出全屏）或悬浮控件。
- **Esc** 或退出按钮 → 恢复卡片/手风琴与 icon。

### 6.7 设置与其它入口

- 渠道开关（8 个渠道默认均可配置启用）。
- 布局模式切换。
- **全部新会话**按钮（设置页 + 主界面均可达，避免仅 buried 在设置）。

---

## 7. 渠道定义

共 **8** 个渠道，配置集中于 `desktop/src/shared/channels.ts`。

| id | 名称 | entryUrl（首版） |
|----|------|------------------|
| doubao | 豆包 | `https://www.doubao.com/chat/` |
| gemini | Gemini | `https://gemini.google.com/app` |
| kimi | Kimi | `https://kimi.moonshot.cn/` |
| google | Google | `https://www.google.com/` |
| baidu | 百度 | `https://www.baidu.com/` |
| deepseek | DeepSeek | `https://chat.deepseek.com/` |
| qwen | 千问 | `https://tongyi.aliyun.com/qianwen/` |
| yuanbao | 腾讯元宝 | `https://yuanbao.tencent.com/chat` |

每个渠道包含：

- `matches`：URL 匹配（用于校验自动化执行页面）。
- `fill`：`kind`、`selectors`、`waitMs`（迁移并扩展自原扩展配置）。
- `submit`：`kind: 'click' | 'enter' | 'form'`，及 selectors 等。
- `sessionReset`：见第 8 节。

实现阶段为各站实测 selector；Google/百度 submit 为表单或 Enter；AI 站多为点击发送按钮或 Enter。

---

## 8. 全部新会话（sessionReset）

### 8.1 语义

- 各已启用渠道开启**新对话**或**空白搜索首页**。
- **不**调用 `clearStorageData` 清 Cookie；**不**登出。

### 8.2 配置形状

```ts
sessionReset: {
  /** 优先：加载即新会话的 URL */
  navigate?: string;
  /** 备选：点击「新对话 / New chat」等 */
  click?: {
    selectors: string[];
    waitMs?: number;
  };
}
```

### 8.3 执行顺序（每渠道）

1. 若存在 `navigate` → `loadURL(navigate)`，等待加载完成；可选轻量校验（输入区为空等），失败则进入 2。
2. 若存在 `click` → 注入脚本点击可见按钮（与 fill 共用可见性、MutationObserver、重试策略）。
3. 兜底 → `loadURL(entryUrl)`，UI 标记「可能仍为上一条会话，请手动新对话」。

### 8.4 一键重置 UX

- 用户点击「全部新会话」→ **无确认框** → IPC `RESET_ALL_SESSIONS`。
- 并行 `Promise.allSettled`；各卡展示进度与结果；失败渠道提供「重试本渠道新会话」。
- 重置**不**自动填充或发送问题。

### 8.5 分渠道策略倾向

| 类型 | navigate | click |
|------|----------|-------|
| Google / 百度 | 使用首页 entryUrl | — |
| AI 对话站 | 实现时调研专用 URL（若有） | 新对话按钮 selector 为主 |

---

## 9. 错误处理

| 场景 | 行为 |
|------|------|
| 空 prompt | 禁止提交，壳内提示 |
| fill/submit 超时 | 卡内 banner + 重试本渠道 |
| reset 失败 | 卡内状态 + 单渠道重试 |
| WebView 崩溃 | 自动 reload 一次，仍失败则提示 |
| 某站验证码 / 二次确认 | 不自动绕过；用户在内嵌页手动处理 |

---

## 10. 测试

- **单元**：shared 注入逻辑、selector 辅助函数（可用 jsdom 或纯函数测试）。
- **手动清单**：8 渠道登录、发送、reset、卡片/手风琴、全屏 Esc、模态再输入、Enter/Cmd+Enter。
- **不做**：对真站的 CI E2E（易 flaky）。

---

## 11. 迁移说明

- 从 `extension/src/shared/channels.ts` 与 `fill.ts` **迁移思路**，非保留扩展目录。
- README 重写为 `desktop/` 的 install、build、load 说明。
- Git 历史中扩展提交保留；工作区移除 `extension/`。

---

## 12. 后续扩展（不在本 spec 实现）

- Windows / Linux 安装包。
- 远程更新 selector 配置。
- 按渠道「仅填充 / 自动发送」开关。
- 重置前可选确认（设置项，默认关）。
