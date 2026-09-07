# F08 — JDK 管理

| 字段 | 内容 |
|------|------|
| 编号 | F08 |
| 状态 | `pending` |
| 依赖 | F03 |
| PRD | FR-04、§3.2（无下载） |
| 触发语 | `开始执行 F08` |

## 1. 目标

JDK 管理页：导入本机 JDK 目录、列表展示版本、设默认、移除（仅删登记）。打包侧可列出并选择 `jdkId`。产品默认**强制**从已登记列表选择。

## 2. 非目标

- **禁止**任何 JDK 下载 / Adoptium / 缓存安装包 UI 与代码
- 不做常见路径扫描一键导入（PRD v1.1，本序列不做）
- 不在本任务 spawn 完整 Gradle（仅 `java -version`）

## 3. 冻结契约

```ts
importJdk(homePath: string): Result<JdkInstall>
listJdks(): Result<{ installs: JdkInstall[]; defaultId: string | null }>
removeJdk(id: string): Result<void>           // 不删除磁盘文件
setDefaultJdk(id: string | null): Result<void>
```

### 校验

- 存在 `bin/java`（win：`bin\\java.exe`）
- 执行 `java -version`（stderr 常见），解析版本字符串写入 `version`
- `name` 默认 `JDK {version}` 或目录名
- `source: 'import'`
- 无效 → `E_JDK_INVALID`

### UI 禁令

- 文案与按钮不得出现「下载 JDK」「在线安装」「缓存安装包」

## 4. 实现规格

1. `electron/services/jdk.ts`
2. JDK 管理页：表格/列表 + 导入 + 设为默认 + 移除（确认对话框说明「仅从列表移除」）
3. 工作台下拉绑定 `jdk.defaultId`（可先占位，F13 再强制校验）

## 5. 验收清单

- [ ] 可导入 ≥1 个真实 JDK 并显示版本
- [ ] 移除后磁盘目录仍在
- [ ] 无下载入口
- [ ] 数据写入 `jdk.installs` / `jdk.defaultId`

## 6. 完成动作

1. 状态 → `done`
2. **commit-and-push**
