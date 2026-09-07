# F07 — 变体与任务名

| 字段 | 内容 |
|------|------|
| 编号 | F07 |
| 状态 | `done` |
| 依赖 | F06 |
| PRD | FR-03、§9 |
| 触发语 | `开始执行 F07` |

## 1. 目标

发现 buildType / productFlavor（动态 `tasks` 优先，静态解析回退），按 AGP 规则拼装 `:module:assemble|bundle + FlavorPart + BuildType`；UI 实时预览任务名；纯拼装逻辑有单测覆盖 PRD §9 全部示例。

## 2. 非目标

- 不真正执行 assemble/bundle 构建（F11）
- 不注入签名

## 3. 冻结契约

### 3.1 拼装纯函数（必须单测）

```ts
function buildGradleTaskName(input: {
  module: string
  kind: 'assemble' | 'bundle'
  flavorPart: string  // '' 或 'Prod' 或 'DevFree'
  buildType: string   // 'Release' | 'Debug' | ...
}): string
// => ':app:bundleProdRelease'
```

规则：`:${module}:${kind}${flavorPart}${buildType}`（kind 小写开头 assemble/bundle；flavorPart/buildType 保持 AGP 驼峰，buildType 首字母大写）。

### 3.2 API

```ts
discoverVariants(projectPath, module): Result<{
  source: 'tasks' | 'static'
  buildTypes: string[]
  flavorDimensions: { name: string; flavors: string[] }[]  // 无维度则 []
  assembleTasks: string[]   // 原始任务短名可选
  bundleTasks: string[]
  warning?: string
}>

previewTaskName(req: Pick<BuildRequest,'module'|'kind'|'flavorPart'|'buildType'>): Result<{ taskName: string }>
```

### 3.3 发现策略

1. **动态：** 在 Wrapper 目录 spawn：  
   `wrapper :<module>:tasks --all`（可加超时，如 120s）  
   解析输出行中匹配 `/^(assemble|bundle)([A-Z][\w]*)?$/` 的任务名，反推 buildTypes / flavors（启发式：去掉前缀后，末段为 Debug/Release/… 当作 buildType，前缀为 flavorPart）。
2. **静态回退：** 读 `\<module\>/build.gradle(.kts)`，正则/简易解析 `buildTypes { debug release }`、`productFlavors`、`flavorDimensions`；UI 标注「回退解析，请核对」。
3. 皆失败 → `E_VARIANT_PARSE`。

### 3.4 UI

- 产物类型：APK=`assemble` / AAB=`bundle`
- Build Type 下拉
- 每个 flavor 维度一个下拉；`flavorPart` = 各选中 flavor 按维度顺序拼接
- 只读预览：`:app:bundleProdRelease`

## 4. 实现规格

1. `src/shared/taskName.ts` + 完整单测（PRD 表格每一行）。
2. `electron/services/variants.ts`：tasks 解析 + static 解析。
3. 工作台「刷新变体」按钮。
4. 动态发现需要 JAVA_HOME 时：若尚无 F10，允许使用进程环境已有 Java；失败则走静态回退并 warning（勿阻塞整个 F07）。

## 5. 验收清单

- [x] `buildGradleTaskName` 单测覆盖 §9.2 全部示例
- [x] 动态或静态至少一条路径可用
- [x] 回退时 UI 有明确标注
- [x] 无 flavor 时生成 `assembleRelease` / `bundleRelease` 等形式

## 6. 完成动作

1. 状态 → `done`
2. **commit-and-push**
