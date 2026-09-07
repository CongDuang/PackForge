# F13 — 工作台串联

| 字段 | 内容 |
|------|------|
| 编号 | F13 |
| 状态 | `pending` |
| 依赖 | F07、F08、F09、F12（及传递依赖 F05/F06/F10/F11） |
| PRD | §4.3 典型场景、§7 工作台、§14 可用性、§17 验收清单主路径 |
| 触发语 | `开始执行 F13` |

## 1. 目标

把已有能力串成**可健壮使用**的主路径：预检闸门、任务预览、开始/取消、构建结束后刷新产物、错误人话提示。用户在工作台无需跳转即可完成一次打包与复制（JDK 可在本页选择；签名按当前工程路径绑定/自动带出）。

## 2. 非目标

- 不打安装包（F14）
- 不新增大功能 IPC（可薄封装组合调用）
- 不做构建历史 / 队列（v1.1+）

## 3. 冻结契约

### 3.1 预检顺序（开始打包前，失败则禁用或点击后提示）

1. 已打开合法项目（否则引导选择）
2. 模块非空
3. 变体选择完整（各维度 + buildType + kind）→ 可算出 taskName
4. `resolveBuildEnv` 成功（SDK + JDK）
5. 本工程签名：已保存绑定；若 `inject=true` 则 profile 完整，否则 `signingProfileId=null`（不注入）

### 3.2 工作台状态（建议 Zustand `useWorkbenchStore`）

字段至少：`project`、`module`、`kind`、`buildType`、`flavorSelections`、`jdkId`、`projectSigning`（本工程绑定）、`taskNamePreview`、`buildStatus`、`logLines`、`artifacts`、`selectedArtifactPaths`、`lastError`。

### 3.3 人话错误

用 PRD §15「用户提示要点」映射 Toast/横幅；日志区仍保留原始 Gradle 输出。

## 4. 实现规格

1. 组装 WorkbenchPage：项目条、模块、变体、JDK、本工程签名绑定、预览、开始/取消、日志、产物。
2. 构建 `succeeded` → 自动 `scanArtifacts`；空则提示 `E_ARTIFACT_NONE`。
3. 构建中禁用再次开始；取消按钮可用。
4. 可用性：项目与 JDK/签名已配置时，到达「开始打包」的关键操作清晰（侧栏切换不算）。
5. 回归：密码预览打码、无拖出按钮、无独立签名管理页。

## 5. 验收清单（主路径）

- [ ] 选项目 → 选模块/APK或AAB/flavor/type → 选 JDK → 绑定或自动带出本工程签名 → 预览任务名正确
- [ ] 开始打包有流式日志；失败/成功/取消状态正确
- [ ] 成功后产物可多选复制到文件夹
- [ ] 缺 Wrapper/SDK/JDK 时阻断且提示正确
- [ ] 不修改工程 gradle 文件

## 6. 完成动作

1. 状态 → `done`
2. **commit-and-push**
