# F04 — 设置与关于

| 字段 | 内容 |
|------|------|
| 编号 | F04 |
| 状态 | `pending` |
| 依赖 | F03 |
| PRD | FR-09、§7.3 设置页 |
| 触发语 | `开始执行 F04` |

## 1. 目标

实现设置页：Android SDK 路径配置、高级 Gradle 参数文本框（可先保存）、关于与隐私声明（零遥测、本地、不上云）。打通 `getSettings` / `setSettings`。

## 2. 非目标

- 不实现 SDK 解析优先级完整构建环境（F10）
- 不写 `local.properties`
- 不做主题切换以外的花活（深色已是默认）

## 3. 冻结契约

沿用 F03：`settings.androidSdkPath`、`settings.allowSystemJdkFallback`、`settings.advancedGradleArgs`。

关于页固定披露文案（可微调标点，语义不可删）：

- 本应用不上传签名、不上传工程源码
- 无使用分析遥测；MVP 默认无出站网络
- 签名密码保存在系统钥匙串；keystore 仅存本地路径
- 仅使用项目 Gradle Wrapper，不经 Android Studio IDE 打包路径

## 4. 实现规格

1. 设置页表单：
   - 「Android SDK 路径」：文本框 +「浏览…」调用 `pickDirectory`
   - 「允许回退系统 JDK」：开关，默认关（对应 `allowSystemJdkFallback`）
   - 「高级 Gradle 参数」：单行/多行文本，占位符如 `--stacktrace`
2. 保存即时写入 electron-store；Toast/行内提示「已保存」。
3. 关于区：产品名「匠包 PackForge」、口号「本地锻造，不上云」、上述隐私要点、版本号读 `package.json` version（主进程或 build 注入）。
4. **禁止**任何 fetch/axios 出站（本页不得引入联网检查）。

## 5. 文件清单

| 操作 | 路径 |
|------|------|
| 修改 | `src/pages/SettingsPage.tsx`、`electron/ipc/*` 实现 get/set/pickDirectory |
| 可选 | `src/components/ui/*` 简单 Button/Input |

## 6. 自检

```bash
npm run dev
# 设置 SDK 路径 → 重启应用后仍在
# 关于区可见隐私声明
```

## 7. 验收清单

- [ ] SDK 路径可浏览保存并持久化
- [ ] 关于页含零遥测 / 不上云声明
- [ ] 不改写任何 Android 工程文件
- [ ] `allowSystemJdkFallback` 默认 false 且可切换

## 8. 完成动作

1. 状态 → `done`
2. **commit-and-push**
