# super-ai-search

一次输入，在 Chrome 中并行打开多个 AI / 搜索站点，并**自动填充**各站输入框（一期：仅填充，不自动发送）。

## 支持的渠道（可在扩展选项里开关）

| 渠道 | 说明 |
|------|------|
| 豆包 | doubao.com 对话页 |
| Gemini | gemini.google.com |
| Kimi | kimi.moonshot.cn / kimi.com |
| Google | 谷歌首页搜索框 |
| 百度 | 百度搜索框 |

各站点 DOM 会改版，选择器维护在 `extension/src/shared/channels.ts`。

## 本地构建与加载

```bash
cd extension
npm install
npm run build
```

在 Chrome 打开 `chrome://extensions` → 开启「开发者模式」→「加载已解压的扩展程序」→ 选择 `extension/dist` 目录。

## 使用

1. 先在各站点 **自行登录**（扩展使用你浏览器已有 Cookie）。
2. 点击工具栏图标，在弹窗输入问题，点击「发送到各渠道」。
3. 快捷键：`Ctrl+Enter` / `Cmd+Enter` 提交。
4. 「渠道设置」中勾选需要并行打开的站点。

## 项目结构

```
extension/
  src/
    background/     # 并行开标签、重试 messaging
    content/        # 各页输入框探测与填充
    popup/          # 统一输入框
    options/        # 渠道开关
    shared/         # channels 配置、storage
  dist/             # 构建产物（加载此目录）
```

## 二期（未实现）

抓取各站回答并由智能体汇总 — 需在各渠道增加 DOM 抽取与后端 Agent。
