# super-ai-search

一次输入，在桌面应用中并行打开多个 AI / 搜索站点，**自动填充并发送**；同一窗口内用卡片（每行最多 2 个，高度约 60vh）或手风琴并排查看各渠道**真实网页**（非 iframe）。

技术栈：**Electron + Vue 3 + Vite + TypeScript**。

## 支持的渠道

默认顺序：豆包 → Gemini → Kimi → DeepSeek → 千问 → 腾讯元宝 → Google → 百度。

可在**设置**中勾选启用/禁用；**仅已启用渠道**会预热加载，取消勾选后会释放对应页面实例以节省内存。

各站点 DOM 会改版，选择器与自动化逻辑维护在 `desktop/src/shared/channels.ts`、`desktop/src/shared/pageAutomation.ts`。

## 主要功能

- **落地页 / 再次搜索**：首次大输入框；发送后右上角搜索图标或快捷键打开居中搜索框（毛玻璃背景，单输入框）。
- **快捷键**（仅应用前台、窗口聚焦时）：默认 **⌘⇧S**（Windows / Linux：**Ctrl+Shift+S**），可在设置中录制自定义组合键。
- **输入**：Enter 发送，⌘Enter / Ctrl+Enter 换行。
- **渠道交互**：默认滚轮滚动整页结果区；**点击**某渠道内容区进入「交互中」，方可滚动/点击该站内页；Esc 或点标题栏/空白处退出。全屏单渠道时自动进入交互。
- **全部新会话**：无确认，对已启用渠道刷新/新开对话（保留登录态）。
- **每卡操作**：复制链接、刷新、重试、全屏。

## 开发

```bash
cd desktop
npm install
npm run dev
```

开发时渲染进程默认端口 **5000**（见 `desktop/electron.vite.config.ts`）。

若 Electron 二进制下载失败：

```bash
cd desktop
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

类型检查：

```bash
cd desktop
npm run typecheck
```

## 构建

### 仅编译（开发/预览用）

```bash
cd desktop
npm run build
```

产物是源码编译结果 `desktop/out/`（**不是**可安装的 `.app` / `.dmg`）。

本地预览编译结果：

```bash
cd desktop
npm run preview
```

### macOS 安装包（DMG，Universal）

在 **macOS** 上执行（需已 `npm install`）：

```bash
cd desktop
npm run dist
```

若打包时在 `@electron/rebuild` 阶段报错（例如扫描到用户目录下损坏的 `~/.pnpm` 链接），项目已在 `package.json` 中设置 `"npmRebuild": false`（本应用无原生 Node 模块，可安全跳过）。请确认已保存该配置后再执行 `dist`。

若下载 Electron 二进制超时，可先设置镜像再打包：

```bash
cd desktop
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm run dist
```

- 输出目录：`desktop/release/`
- 安装包名形如：`超级 AI 搜索-0.1.0-mac-universal.dmg`
- **Universal**：同一份 DMG 可在 **Intel（x64）** 与 **Apple 芯片（arm64）** Mac 上安装使用。

仅打包 `.app` 目录、不生成 DMG（调试打包更快）：

```bash
cd desktop
npm run dist:dir
```

当前未配置 Apple 公证与签名，首次打开若被拦截，可在 `.app` 或 DMG 安装后使用 **右键 → 打开**，或在「系统设置 → 隐私与安全性」中允许。

若只需单一架构（体积更小），可将 `desktop/package.json` 里 `build.mac.target[0].arch` 改为 `["arm64"]` 或 `["x64"]`。

## 交互原型（可选）

`prototype/` 为纯 Web 静态交互稿，用于早期确认壳层布局（无真实内嵌页）：

```bash
cd prototype
npm install
npm run dev
```

## 项目结构

```
desktop/
  src/
    main/           # 主进程：窗口、WebContentsView、IPC、设置持久化
    preload/        # 壳 preload + 各渠道页 preload（滚轮穿透 / 点击激活）
    renderer/       # Vue 壳 UI
    shared/         # 渠道配置、快捷键、页面注入脚本
prototype/          # UI 原型
docs/superpowers/specs/
```

设计说明：[docs/superpowers/specs/2026-07-22-desktop-multi-channel-design.md](docs/superpowers/specs/2026-07-22-desktop-multi-channel-design.md)
