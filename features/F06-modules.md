# F06 — 多模块

| 字段 | 内容 |
|------|------|
| 编号 | F06 |
| 状态 | `pending` |
| 依赖 | F05 |
| PRD | FR-02 |
| 触发语 | `开始执行 F06` |

## 1. 目标

解析 `settings.gradle` / `settings.gradle.kts` 的 `include` 列表，供用户选择应用模块；默认优先 `app`；解析失败允许手动输入模块名。

## 2. 非目标

- 不发现 flavor/buildType（F07）
- 不执行 `tasks` Gradle 命令（可在 F07）

## 3. 冻结契约

```ts
listModules(projectPath: string): Result<{ modules: string[]; defaultModule: string; parseWarning?: string }>
```

- `modules`：去掉 `:` 前缀后的模块路径名，如 `app`、`feature:home` → 规范为 Gradle 路径形式与后续任务一致。  
  **冻结：** 对外统一为**不含前导冒号**的模块坐标，例如 `app` 或 `feature:login`；拼任务时再加 `:` → `:app:assembleDebug`。
- `defaultModule`：若存在名为 `app` 的模块（精确匹配最后一段或完整名 `app`），选它；否则 `modules[0]`；列表空则 `defaultModule = 'app'` 并带 `parseWarning`。

### 解析规则（尽力）

- Groovy：`include ':app', ':lib'` / `include(":app")` / 多行 `include`
- KTS：`include(":app")`、`include(":app", ":data")`
- 忽略 `pluginManagement` / `dependencyResolutionManagement` 块内误匹配（可用简单括号深度或分段扫描）
- 失败：`modules=[]`，`parseWarning` 非空，UI 显示手填框

## 4. 实现规格

1. `electron/services/modules.ts` + 纯函数可放 `src/shared/parseSettings.ts` 便于单测。
2. 工作台：模块下拉；解析失败时 Input 手填。
3. 单元测试覆盖：多 `include`、kts、无 app、解析失败。

## 5. 文件清单

| 操作 | 路径 |
|------|------|
| 新建 | `src/shared/parseSettings.ts`、`electron/services/modules.ts`、对应 `*.test.ts` |
| 修改 | Workbench UI、IPC |

## 6. 自检

```bash
npm run test
npm run dev  # 打开多模块工程，默认选中 app
```

## 7. 验收清单

- [ ] 能列出 include 模块
- [ ] 默认 `app` 优先
- [ ] 解析失败可手填模块名
- [ ] 单测覆盖主要语法

## 8. 完成动作

1. 状态 → `done`
2. **commit-and-push**
