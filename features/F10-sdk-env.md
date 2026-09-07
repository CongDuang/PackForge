# F10 — SDK 与环境

| 字段 | 内容 |
|------|------|
| 编号 | F10 |
| 状态 | `pending` |
| 依赖 | F04、F08 |
| PRD | FR-08、§13 |
| 触发语 | `开始执行 F10` |

## 1. 目标

实现 Android SDK 解析优先级，并组装构建子进程环境：`JAVA_HOME`、`ANDROID_HOME`/`ANDROID_SDK_ROOT`、`PATH`。供 F11 使用。

## 2. 非目标

- 不安装 SDK 组件
- 不写 `local.properties`
- 不启动构建

## 3. 冻结契约

```ts
resolveBuildEnv(input: {
  projectPath: string
  jdkId: string | null
}): Result<{
  env: Record<string, string>  // 已合并的 env 片段（可在 spawn 时 {...process.env, ...env}）
  javaHome: string
  androidHome: string
  diagnosis: string[]          // 人话步骤，便于 UI 展示
}>
```

### SDK 优先级（冻结）

1. `settings.androidSdkPath`（非空且目录存在）
2. `process.env.ANDROID_HOME` 或 `ANDROID_SDK_ROOT`
3. 项目 `local.properties` 的 `sdk.dir`（读取并处理 `\:` 转义；**只读**）

皆无或无效 → `E_NO_SDK`。

### JDK

- 必须用 `jdkId` 查表得到 `homePath`；无效 → `E_JDK_INVALID` / `E_NO_JDK`
- 仅当 `settings.allowSystemJdkFallback === true` 且未选 jdk 时，才允许用 `process.env.JAVA_HOME`（并 `diagnosis` 警告）
- 默认强制列表选择：无 jdkId → `E_NO_JDK`

### PATH

- 将 `${javaHome}/bin`（win：`\bin`）**前置**到 PATH

## 4. 实现规格

1. `electron/services/env.ts` + `readLocalPropertiesSdkDir` 纯函数单测。
2. 设置页可显示「当前解析到的 SDK」（调用 resolve 只读诊断，可选）。

## 5. 验收清单

- [ ] 三级优先级行为正确（单测或手工矩阵）
- [ ] 不修改 `local.properties`
- [ ] JAVA_HOME 来自登记 JDK
- [ ] 错误码 `E_NO_SDK` / `E_NO_JDK` 正确

## 6. 完成动作

1. 状态 → `done`
2. **commit-and-push**
