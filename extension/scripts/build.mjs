import { build, context } from "esbuild";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

const channelMatches = [
  "https://www.doubao.com/*",
  "https://gemini.google.com/*",
  "https://kimi.moonshot.cn/*",
  "https://www.kimi.com/*",
  "https://www.google.com/*",
  "https://www.google.com.hk/*",
  "https://www.baidu.com/*",
];

const manifest = {
  manifest_version: 3,
  name: "超级 AI 搜索",
  version: "0.1.0",
  description: "一次输入，并行打开豆包、Gemini、Kimi、Google、百度并自动填充输入框",
  action: {
    default_title: "超级 AI 搜索",
    default_popup: "popup/popup.html",
  },
  options_page: "options/options.html",
  background: {
    service_worker: "background/service-worker.js",
    type: "module",
  },
  permissions: ["storage", "tabs"],
  host_permissions: channelMatches,
  content_scripts: [
    {
      matches: channelMatches,
      js: ["content/fill.js"],
      run_at: "document_idle",
    },
  ],
};

async function bundle(watch) {
  mkdirSync(dist, { recursive: true });

  const common = {
    bundle: true,
    format: "esm",
    target: "chrome120",
    sourcemap: true,
    outdir: dist,
    entryNames: "[dir]/[name]",
  };

  const entries = {
    "background/service-worker": join(root, "src/background/service-worker.ts"),
    "content/fill": join(root, "src/content/fill.ts"),
    "popup/popup": join(root, "src/popup/popup.ts"),
    "options/options": join(root, "src/options/options.ts"),
  };

  if (watch) {
    const ctx = await context({ ...common, entryPoints: entries });
    await ctx.watch();
    console.log("watching…");
  } else {
    await build({ ...common, entryPoints: entries });
  }

  cpSync(join(root, "src/popup/popup.html"), join(dist, "popup/popup.html"));
  cpSync(join(root, "src/popup/popup.css"), join(dist, "popup/popup.css"));
  cpSync(join(root, "src/options/options.html"), join(dist, "options/options.html"));
  cpSync(join(root, "src/options/options.css"), join(dist, "options/options.css"));

  writeFileSync(join(dist, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("built →", dist);
}

const watch = process.argv.includes("--watch");
bundle(watch).catch((e) => {
  console.error(e);
  process.exit(1);
});
