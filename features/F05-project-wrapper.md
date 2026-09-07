# F05 — 项目与 Wrapper

| 字段 | 内容 |
|------|------|
| 编号 | F05 |
| 状态 | `pending` |
| 依赖 | F03（UI 壳可用 F02） |
| PRD | FR-01、§13 |
| 触发语 | `开始执行 F05` |

## 1. 目标

用户可通过目录选择器或粘贴路径打开 Android 工程；自动识别 macOS `gradlew` / Windows `gradlew.bat`；维护最近打开（最多 20）；校验失败给出 `E_NO_WRAPPER` / `E_NO_SETTINGS`。

## 2. 非目标

- 不解析模块 / 变体（F06/F07）
- 不启动 Gradle 构建
- 不调用系统全局 `gradle` 或 Android Studio 内置 Gradle

## 3. 冻结契约

### 3.1 校验结果

```ts
type ProjectValidation = {
  path: string
  wrapperCommand: string        // 绝对路径指向 gradlew 或 gradlew.bat
  wrapperKind: 'gradlew' | 'gradlew.bat'
  settingsFile: 'settings.gradle' | 'settings.gradle.kts'
}
```

`validateProject(path): Result<ProjectValidation>`  
`openProject(path): Result<ProjectValidation>` — 校验成功则写入/更新 `projects.recent`  
`listRecentProjects(): Result<ProjectRef[]>`  
`removeRecentProject(id)` / `pinRecentProject(id, pinned)`

### 3.2 识别算法（必须实现）

1. 规范化为绝对路径；目录不存在 → 可读错误（可用通用 message，或扩展码但优先复用文案）。
2. 检测 `settings.gradle` 或 `settings.gradle.kts`（同级）；皆无 → `E_NO_SETTINGS`。
3. OS = win32：必须存在 `gradlew.bat`；否则 `E_NO_WRAPPER`。  
   非 Windows：必须存在 `gradlew`；若无执行位，尝试 `chmod +x`；仍不可执行则 `E_NO_WRAPPER` 并说明权限。
4. **禁止**回退到 `gradle` 命令。

### 3.3 最近列表

- 最多 20 条；再打开已存在路径则更新 `lastOpenedAt` 并移到合理顺序（置顶项保持 pinned 优先）。
- `displayName` 默认取目录 basename。

## 4. 实现规格

1. 主进程服务：`electron/services/project.ts`。
2. 工作台顶部：路径展示、「选择项目…」「打开」；最近列表可点开、置顶、移除。
3. 粘贴路径支持去引号、trim。
4. 单元测试（Node）：用临时目录 fixture 覆盖「有 settings+gradlew」「缺 wrapper」「缺 settings」；Windows 用例可用 mock `process.platform`。

## 5. 文件清单

| 操作 | 路径 |
|------|------|
| 新建 | `electron/services/project.ts`、`src/components/ProjectPicker.tsx`、测试 `electron/services/project.test.ts` 或 `src/shared/...` |
| 修改 | 工作台页、IPC register、preload 已有 stub 改为真实现 |

## 6. 自检

```bash
npm run test   # 或 vitest 针对 project 服务
npm run dev    # 选真实/伪造工程目录，错误码与成功路径符合预期
```

## 7. 验收清单

- [ ] Mac/Linux 逻辑使用 `gradlew`；代码中 Windows 分支使用 `gradlew.bat`
- [ ] 缺 Wrapper / settings 时阻断并返回正确错误码
- [ ] 最近 20 条、置顶/移除可用
- [ ] 无全局 `gradle` 回退
- [ ] 有单元测试覆盖核心识别分支

## 8. 完成动作

1. 状态 → `done`
2. **commit-and-push**
