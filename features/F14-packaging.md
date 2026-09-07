# F14 — 安装包与发布

| 字段 | 内容 |
|------|------|
| 编号 | F14 |
| 状态 | `pending` |
| 依赖 | F13 |
| PRD | FR-10、§6 图标 vibe |
| 触发语 | `开始执行 F14` |

## 1. 目标

应用图标与品牌资源落地；配置 `electron-builder`；在当前开发机 OS 打出可安装/可运行产物并验证启动；更新 README 真实构建命令；任务序列收尾为「可发布」状态。

## 2. 非目标

- 不强制在本机交叉编译另一 OS 的安装包（须在文档写清）
- 不上传商店、不公证自动化（可预留说明）
- 不新增业务功能

## 3. 冻结契约

### 3.1 产物形态

| OS | 目标格式 |
|----|----------|
| macOS | `dmg` 与/或 `zip`；arch：优先当前 arch，配置中写明 `arm64`/`x64`（可 `universal` 若可行） |
| Windows | `nsis` x64 |

`package.json` / `electron-builder` 配置中：

- `appId`：建议 `com.packforge.app`（冻结后勿随意改）
- `productName`：`PackForge`（界面中文名仍为匠包）

### 3.2 package.json scripts

| script | 行为 |
|--------|------|
| `dist` | 先 `build` 再 `electron-builder` |
| `dist:mac` / `dist:win` | 可选分平台 |

### 3.3 图标

- 提供 `resources/icon.icns` / `icon.ico` / `icon.png`（可用设计稿生成；隐喻：密封箱 + 盾牌，深色底，点缀 Android 绿）
- 禁止以「云上传」为主视觉

## 4. 实现规格

1. `electron-builder.yml` 或 `package.json.build` 字段齐全。
2. 在本机执行 `pnpm dist`（或平台 script），产出到 `release/` 或 `dist/`（gitignore 已忽略）。
3. 安装/打开产物，确认标题、关于页、主路径入口正常。
4. README：
   - 开发：`pnpm install` / `pnpm dev`
   - 打包：`pnpm dist`
   - 指向 `features/README.md` 与 `docs/PRD.md`
5. 将 [features/README.md](README.md)「可发布」勾选为 `[x]`；F01–F14 状态均为 `done`（本任务改 F14，并核对索引勾选）。
6. **Windows 包在 mac 上：** 配置必须提交；验收写「配置已就绪，二进制需在 Windows CI/机器执行 `pnpm dist:win`」。不得因此卡住 F14 在 Mac 上的完成定义。

## 5. 验收清单

- [ ] 当前 OS 安装包可生成并启动
- [ ] 双平台 builder 配置齐全
- [ ] 图标与窗口/关于品牌一致
- [ ] README 命令真实可用
- [ ] features 索引「可发布」已勾选

## 6. 完成动作

1. 状态 → `done`；索引可发布勾选
2. **commit-and-push**（勿提交 `release/` 大二进制，除非用户明确要求）
