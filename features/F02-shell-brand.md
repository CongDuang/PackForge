# F02 — 品牌与壳层

| 字段 | 内容 |
|------|------|
| 编号 | F02 |
| 状态 | `pending` |
| 依赖 | F01 |
| PRD | §6 品牌与视觉、§7 信息架构 |
| 触发语 | `开始执行 F02` |

## 1. 目标

建立深色「本地工坊」视觉壳层：色板 CSS 变量、侧栏四页导航、工作台占位三栏布局、正式窗口标题。

## 2. 非目标

- 不实现选项目 / JDK / 签名 / 打包等业务逻辑
- 不设计最终应用图标文件（F14）；本任务可用简单 SVG/emoji 占位侧栏 logo
- 不接 electron-store

## 3. 冻结契约

### 3.1 路由 / 页面 id

| id | 中文标签 |
|----|----------|
| `workbench` | 工作台 |
| `jdk` | JDK 管理 |
| `signing` | 签名管理 |
| `settings` | 设置 |

默认页：`workbench`。

### 3.2 CSS 变量（名称与色值冻结，见 PRD §6.3）

```css
--bg-base: #0F1419;
--bg-panel: #1A2332;
--border: #2A3544;
--text-primary: #E8EEF5;
--text-muted: #8B9BB0;
--accent: #3DDC84;
--accent-dim: #2A9B5C;
--danger: #F07178;
--warn: #E6B450;
```

### 3.3 窗口标题（冻结文案）

`匠包 — 本地 Android 打包工作台`

### 3.4 工作台占位结构

```text
侧栏 | 主区（项目条占位 + 配置占位 + 开始打包按钮禁用） | 产物面板占位
     | 构建日志占位
```

## 4. 实现规格

1. 用 Zustand 或 React state 管理「当前页面」即可（完整 store 在 F03）。
2. 侧栏：四项可点击切换；当前项用 `--accent` 高亮。
3. 各页先放标题 + 一句占位说明（工程师语气，勿「魔法上云」）。
4. 全局背景 `--bg-base`，面板 `--bg-panel`，分割线 `--border`。
5. 主进程 `BrowserWindow` 的 `title` 与 HTML `<title>` 同步正式标题。
6. 口号可在设置页关于区占位：`本地锻造，不上云`（完整关于在 F04）。

## 5. 文件清单

| 操作 | 路径 |
|------|------|
| 新建 | `src/components/Sidebar.tsx`、`src/pages/WorkbenchPage.tsx`、`src/pages/JdkPage.tsx`、`src/pages/SigningPage.tsx`、`src/pages/SettingsPage.tsx`、`src/layout/AppShell.tsx` |
| 修改 | `src/App.tsx`、`src/index.css`、`electron/main.ts`（窗口标题） |

## 6. 自检

```bash
pnpm dev
# 点击四个侧栏项，页面切换正常；标题栏文案正确；深色主题可读
```

## 7. 验收清单

- [ ] 四页可切换，默认工作台
- [ ] 色板变量已应用，对比度可读
- [ ] 工作台可见三栏/日志占位布局
- [ ] 窗口标题为「匠包 — 本地 Android 打包工作台」
- [ ] 无业务 IPC 调用

## 8. 完成动作

1. 状态 → `done`
2. **commit-and-push**
