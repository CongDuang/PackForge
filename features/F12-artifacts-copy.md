# F12 — 产物与复制

| 字段 | 内容 |
|------|------|
| 编号 | F12 |
| 状态 | `pending` |
| 依赖 | F11 |
| PRD | FR-07、§10（**本序列去掉拖出**） |
| 触发语 | `开始执行 F12` |

## 1. 目标

构建后扫描 APK / AAB / `mapping.txt`；支持单选/多选：复制路径、复制文件到目标文件夹、写入系统**文件**剪贴板、在访达/资源管理器中显示。

## 2. 非目标

- **不做拖出**（`dragStart` / 拖到微信）——明确禁止实现
- 不做 native symbols（P1）
- 不做 IM 专用 SDK

## 3. 冻结契约

```ts
scanArtifacts(input: {
  projectPath: string
  module: string
  flavorPart: string
  buildType: string
  kind: 'assemble' | 'bundle'
  showAllModuleArtifacts?: boolean  // 默认 false：尽量只留与本次变体相关
}): Result<{ items: ArtifactItem[] }>

copyArtifactsToFolder(paths: string[], targetDir: string): Result<{ copied: string[] }>
copyPathsToClipboard(paths: string[]): Result<void>          // 文本：多行绝对路径
writeFilesToClipboard(paths: string[]): Result<void>         // 系统文件剪贴板
showItemInFolder(path: string): Result<void>
```

复制失败 → `E_COPY_FAILED`。  
扫描成功但空列表 → 可返回 `ok:true, items:[]`，由 F13 在「构建成功且空」时映射 `E_ARTIFACT_NONE`。

### 扫描路径（模块目录相对）

- APK：`build/outputs/apk/**/*.apk`
- AAB：`build/outputs/bundle/**/*.aab`
- Mapping：`build/outputs/mapping/**/mapping.txt`
- 可选收录：`output-metadata.json` → type `other`

变体过滤：路径或文件名包含 flavor/buildType 的小写/驼峰变体时优先；`showAllModuleArtifacts=true` 时不过滤。

### 复制到文件夹

- 重名：默认改名为 `name__yyyyMMdd_HHmmss.ext`（行为冻结，避免弹窗阻塞；可在 UI 注明）
- 拷贝后可抽查 size 一致

### 文件剪贴板

- macOS：写入文件 URL 到 pasteboard（Electron `clipboard` 不足时用主进程 native/script）
- Windows：`CF_HDROP` 或等效
- 若某平台实现受限：须在 UI 标明「当前平台文件剪贴板不可用」，但**复制到文件夹**必须可用

## 4. 实现规格

1. `electron/services/artifacts.ts`、`electron/services/clipboardFiles.ts`
2. 产物面板：复选框、全选/反选、四个操作按钮（无「拖出」文案）
3. 更新 PRD 已同步的话术：分享 = 复制，不是拖

## 5. 验收清单

- [ ] 扫描能识别 apk/aab/mapping（可用夹具目录单测）
- [ ] 多选复制到文件夹内容完整
- [ ] 复制路径到文本剪贴板可用
- [ ] 无拖出相关代码与 UI
- [ ] `showItemInFolder` 可用

## 6. 完成动作

1. 状态 → `done`
2. **commit-and-push**
