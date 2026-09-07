# F01 — 工程脚手架

| 字段 | 内容 |
|------|------|
| 编号 | F01 |
| 状态 | `done` |
| 依赖 | 无 |
| PRD | §5 技术栈与架构 |
| 触发语 | `开始执行 F01` |

## 1. 目标

落地可运行的 Electron + Vite + React + TypeScript + Tailwind 工程，能 `pnpm install` 后 `pnpm dev` 打开空白应用窗口。

## 2. 非目标

- 不做业务 UI、侧栏、IPC、存储
- 不配置 electron-builder 安装包（F14）
- 不引入 keytar / electron-store（F03）

## 3. 冻结契约（本任务起生效）

### 3.1 目录约定

```text
android-packing-tools/
  package.json
  electron/
    main.ts          # 主进程入口
    preload.ts       # 预加载（本任务可空桥，仅占位）
  src/
    main.tsx         # React 入口
    App.tsx
    index.css
  index.html
  vite.config.ts
  tsconfig.json
  tsconfig.node.json
  electron.vite 或等效主进程编译配置
```

### 3.2 package.json scripts（名称冻结）

| script | 行为 |
|--------|------|
| `dev` | 同时/串联启动 Vite 与 Electron，热更新渲染进程 |
| `build` | 编译主进程 + 渲染进程到 `dist`（或项目约定输出目录） |
| `typecheck` | `tsc --noEmit` |

### 3.3 技术版本（锁定）

- 包管理器：**pnpm**（禁止默认使用 npm / yarn）
- Electron **33.x**
- React **19.x**
- TypeScript **5.x**（`strict: true`）
- Vite **6.x 或 5.x**（与 Electron 集成兼容即可）
- Tailwind CSS **4.x**

## 4. 实现规格

1. 使用 **pnpm**；README 与脚本一律写 `pnpm`，不写 `npm`。
2. 主进程：创建 `BrowserWindow`，`webPreferences.preload` 指向编译后的 preload；`contextIsolation: true`，`nodeIntegration: false`。
3. 开发态：加载 Vite `http://localhost:<port>`；生产态：加载打包后的 `index.html`。
4. 窗口标题暂可 `PackForge`（F02 再改成中文正式标题）。
5. Tailwind 已接入，`index.css` 可写最小 `@import "tailwindcss"`。
6. `.gitignore`：`node_modules/`、`dist/`、`out/`、`release/`、`package-lock.json`、`.DS_Store`、日志等。
7. 更新根 [README.md](../README.md)「开发」一节为真实命令：`pnpm install` / `pnpm dev`。
8. `pnpm-workspace.yaml` 中配置 `allowBuilds.electron/esbuild: true`（pnpm 11+ 需显式允许 postinstall）。

## 5. 文件清单

| 操作 | 路径 |
|------|------|
| 新建 | `package.json`、Vite/TS/Tailwind 配置、`electron/main.ts`、`electron/preload.ts`、`src/*`、`index.html` |
| 新建/更新 | `.gitignore`、`.npmrc`（pnpm）、`pnpm-lock.yaml` |
| 更新 | `README.md` 开发命令 |

## 6. 自检

```bash
pnpm install
pnpm typecheck
pnpm dev   # 应弹出窗口，可见 React 占位文案如「匠包 PackForge」
```

## 7. 验收清单

- [x] `pnpm dev` 能打开 Electron 窗口且无白屏报错
- [x] `contextIsolation: true` 且渲染进程无直接 Node 集成
- [x] TypeScript strict 通过 `typecheck`
- [x] Tailwind 已配置（后续 F02 可直接用 utility class）
- [x] README 开发命令可用（pnpm）

## 8. 完成动作

1. 将本文状态改为 `done`
2. 执行 **commit-and-push**（message 侧重 why，例如：落地 Electron+Vite 脚手架以便开始桌面开发）
