# F03 — 契约与存储骨架

| 字段 | 内容 |
|------|------|
| 编号 | F03 |
| 状态 | `done` |
| 依赖 | F02 |
| PRD | §11 数据模型、§12 安全、§15 错误码 |
| 触发语 | `开始执行 F03` |

## 1. 目标

冻结共享类型、错误码、electron-store schema、preload 白名单 API 形状；渲染进程**禁止**直接 `fs`/`child_process`。后续业务任务只往白名单里**追加**实现，不改契约语义。

## 2. 非目标

- 不实现具体选目录/打包逻辑（handlers 可返回 stub / `not implemented`）
- 不接入 keytar 真实读写（F09）；可预留 service 名常量
- 不写业务 UI

## 3. 冻结契约

### 3.1 共享包路径

建议：`src/shared/`（渲染与主进程均可引用的纯 TS 类型，勿依赖 DOM/Node 专有 API）。

### 3.2 错误码枚举 `PackForgeErrorCode`（字符串字面量，与 PRD §15 一致）

```text
E_NO_WRAPPER | E_NO_SETTINGS | E_NO_SDK | E_NO_JDK | E_JDK_INVALID
E_SIGN_MISSING | E_VARIANT_PARSE | E_BUILD_FAILED | E_BUILD_CANCELLED
E_ARTIFACT_NONE | E_COPY_FAILED
```

统一错误形状：

```ts
type AppError = { code: PackForgeErrorCode; message: string; detail?: string }
```

### 3.3 数据模型（字段名冻结）

```ts
ProjectRef { id: string; path: string; displayName: string; lastOpenedAt: number; pinned: boolean }
JdkInstall { id: string; name: string; version: string; homePath: string; source: 'import' | 'scan' }
SigningProfileMeta {
  id: string; name: string; storeFile: string; keyAlias: string;
  storeType?: string; keyPasswordSameAsStore: boolean
}
// 密码不进此结构；仅 keytar account 键约定：
// service = 'PackForge'
// account = `signing:${profileId}:store` | `signing:${profileId}:key`

BuildRequest {
  projectPath: string; module: string;
  kind: 'assemble' | 'bundle';
  flavorPart: string; // 无 flavor 时 ''
  buildType: string;  // e.g. 'Release'
  jdkId: string;
  signingProfileId: string | null;
  extraArgs: string[];
}

ArtifactItem {
  path: string;
  type: 'apk' | 'aab' | 'mapping' | 'other';
  size: number; mtime: number; buildId?: string
}
```

### 3.4 electron-store keys（冻结）

| key | 类型 |
|-----|------|
| `settings.androidSdkPath` | `string \| ''` |
| `settings.allowSystemJdkFallback` | `boolean`（默认 `false`） |
| `settings.advancedGradleArgs` | `string`（默认 `''`，F11/F13 用） |
| `projects.recent` | `ProjectRef[]`（最多 20） |
| `jdk.installs` | `JdkInstall[]` |
| `jdk.defaultId` | `string \| null` |
| `signing.profiles` | `SigningProfileMeta[]`（无密码字段） |

### 3.5 preload API 命名空间（冻结）

通过 `contextBridge.exposeInMainWorld('packforge', api)`：

本任务至少声明 TypeScript 接口 `PackforgeApi`，方法可 stub：

| 方法 | 后续实现任务 |
|------|----------------|
| `getSettings` / `setSettings` | F04 |
| `pickDirectory` | F05 等 |
| `pickFile` | F09（追加） |
| `validateProject` / `listRecentProjects` / `openProject` / `removeRecentProject` / `pinRecentProject` | F05 |
| `listModules` | F06 |
| `discoverVariants` / `previewTaskName` | F07 |
| `listJdks` / `importJdk` / `removeJdk` / `setDefaultJdk` | F08 |
| `listSigningProfiles` / `upsertSigningProfile` / `deleteSigningProfile` / `buildSigningInjectArgs` | F09 |
| `resolveBuildEnv` | F10 |
| `startBuild` / `cancelBuild` / `onBuildLog` / `onBuildStatus` | F11 |
| `scanArtifacts` / `copyArtifactsToFolder` / `copyPathsToClipboard` / `writeFilesToClipboard` / `showItemInFolder` | F12 |

事件型 API 用 `ipcRenderer.on` 封装为 `onXxx(cb): () => void` 取消订阅。

### 3.6 安全

- `sandbox` 可选 true；**必须** `contextIsolation: true`、`nodeIntegration: false`
- 渲染层仅通过 `window.packforge` 访问能力
- 在 `src/vite-env.d.ts` 声明 `Window.packforge: PackforgeApi`

## 4. 实现规格

1. 安装 `electron-store`，主进程单例封装 `electron/services/store.ts`。
2. `electron/preload.ts` 暴露完整方法表；未实现的返回 `Promise.reject` 或 `{ ok:false, error }`（二选一后**冻结** Result 风格：推荐 `Result<T> = { ok: true, data: T } | { ok: false, error: AppError }`）。
3. 主进程 `ipcMain.handle` 注册同名 channel：建议 channel = `packforge:<methodName>`（冻结前缀 `packforge:`）。
4. 单测：错误码枚举导出；可选对 Result 类型的 typecheck。

## 5. 文件清单

| 操作 | 路径 |
|------|------|
| 新建 | `src/shared/types.ts`、`src/shared/errors.ts`、`src/shared/result.ts`、`src/shared/api.ts` |
| 新建 | `electron/services/store.ts`、`electron/ipc/register.ts` |
| 修改 | `electron/preload.ts`、`electron/main.ts`、`src/vite-env.d.ts` |
| 依赖 | `package.json` 增加 `electron-store` |

## 6. 自检

```bash
pnpm typecheck
pnpm dev  # 控制台可调用 window.packforge.getSettings()（stub 可返回默认）
```

## 7. 验收清单

- [x] 共享类型与错误码齐全且与 PRD 一致
- [x] store schema 默认值正确
- [x] preload 白名单已暴露；渲染进程无法 `require('fs')`
- [x] Result / channel 命名约定已文档化并在代码中统一
- [x] 无业务功能误实现

## 8. 完成动作

1. 状态 → `done`
2. **commit-and-push**
