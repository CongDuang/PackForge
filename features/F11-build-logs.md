# F11 — 构建与日志

| 字段 | 内容 |
|------|------|
| 编号 | F11 |
| 状态 | `done` |
| 依赖 | F07、F09、F10 |
| PRD | FR-06、§12 日志脱敏、§13 杀进程树 |
| 触发语 | `开始执行 F11` |

## 1. 目标

使用项目 Wrapper spawn Gradle 任务：合并环境、注入签名参数、流式日志、环形缓冲、取消构建、退出码映射错误码；日志与事件中密码脱敏。

## 2. 非目标

- 不扫描产物（F12）
- 不完成工作台全部预检 UX（F13 可增强，但本任务需提供可调用 API）

## 3. 冻结契约

```ts
startBuild(request: BuildRequest): Result<{ buildId: string }>
cancelBuild(buildId: string): Result<void>
onBuildLog(cb: (e: { buildId: string; line: string; stream: 'stdout' | 'stderr' }) => void): () => void
onBuildStatus(cb: (e: {
  buildId: string
  status: 'running' | 'succeeded' | 'failed' | 'cancelled'
  exitCode?: number
  error?: AppError
  taskName: string
}) => void): () => void
```

### 进程行为

1. `cwd` = Wrapper 所在目录（项目 path）。
2. 命令：`wrapperCommand` + 参数：`[clean, taskName, ...signingArgs, ...extraArgs, ...settings.advancedGradleArgs 拆分]`。  
   每次开始打包前先 `clean`（PRD v1.5）；`taskName = buildGradleTaskName(...)`。
3. `env = { ...process.env, ...resolveBuildEnv(...).env }`。
4. **同时只允许一个 running build**（第二次 start → 明确错误 message；不必新错误码）。
5. 日志环形缓冲：内存最近 **5000** 行；可另附写入 `{userData}/logs/packforge-YYYYMMDD.log`（可选但推荐）。
6. 脱敏：写出 UI 的 line 若含 store/key password 明文则替换 `***`；argv 预览同 F09。
7. 取消：
   - POSIX：杀进程组 / `SIGTERM` 后超时 `SIGKILL`
   - Windows：`taskkill /pid /t /f` 或等效杀树，避免残留 `java`
8. 退出码非 0 → status `failed` + `E_BUILD_FAILED`；取消 → `E_BUILD_CANCELLED`。

## 4. 实现规格

1. `electron/services/buildRunner.ts`
2. 工作台：日志面板追加、清空、简单过滤搜索、复制全部（已脱敏）；开始/取消按钮可先接上（预检可在 F13 加固）。
3. UI 不因日志洪泛卡死：批量 flush（如 50ms 节流）。

## 5. 验收清单

- [x] 能对真实或最小 stub 工程跑通 spawn（至少能看到 Gradle 输出或明确失败日志）
- [x] 取消后状态为 cancelled，不误报成功
- [x] 密码不出现在日志面板
- [x] 仅使用 Wrapper，无全局 gradle

## 6. 完成动作

1. 状态 → `done`
2. **commit-and-push**
