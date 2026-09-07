# 匠包（PackForge）

本地锻造，不上云。

面向 Android 工程师的**本地 Gradle 打包工作台**：指定工程后，用项目自带 `gradlew` / `gradlew.bat` 打 APK / AAB，不经过 Android Studio IDE，避免 IDE 层同步/上传签名与未知遥测。

| | |
|---|---|
| 平台 | macOS、Windows |
| 状态 | MVP 可发布（F01–F14） |
| 仓库 | [CongDuang/PackForge](https://github.com/CongDuang/PackForge) |

## 能做什么

- 指定项目路径，自动识别 macOS / Windows 的 Wrapper 脚本
- 导入本机已安装 JDK，打包时选择 `JAVA_HOME`（**不提供**在线下载）
- 按工程路径绑定签名（keystore / 别名 / 密码），再次打开自动带出；经 AGP injected signing 注入，**不改**工程 `build.gradle`；无独立签名管理页
- 读取 `buildType` / `flavor`，组合如 `bundleProdRelease`、`assembleDevDebug`
- 汇总 APK、AAB、`mapping.txt` 等产物，支持单选/多选**复制到文件夹**、**复制路径**、**文件剪贴板**（不做拖出）

## 技术栈（锁定）

Electron + React + TypeScript + Vite + Tailwind CSS + Zustand；包管理器 **pnpm**；配置用 `electron-store`，签名密码进系统钥匙串（`keytar`）；安装包用 `electron-builder`。

## 文档

- 产品需求：[docs/PRD.md](docs/PRD.md)
- **开发任务（顺序执行）：** [features/README.md](features/README.md)（F01–F14）

实现与 PRD 冲突时，先更新 PRD 再改代码。会话中说「开始执行 Fxx」即按对应任务说明书开发，完成后自动 commit-and-push。

## 开发

包管理器：**pnpm**（勿用 npm / yarn）。

```bash
pnpm install
pnpm rebuild    # 为当前 Electron 重建 keytar 原生模块（签名钥匙串）
pnpm dev        # 启动 Vite + Electron
pnpm typecheck  # TypeScript 严格检查
pnpm test       # 单元测试
pnpm build      # 编译渲染进程与主进程
```

`keytar` 是原生模块，必须针对 Electron 的 Node ABI 重建。若保存签名时报钥匙串写入失败，先执行 `pnpm rebuild`。

本仓库用 `pnpm-workspace.yaml` 的 `allowBuilds` 允许 `electron` / `esbuild` / `keytar` 等安装脚本；`electron-winstaller` 默认关闭（Windows 安装器脚本，仅在需要时再打开）。

## 打包发布

配置见 [electron-builder.yml](electron-builder.yml)：`appId=com.packforge.app`，`productName=PackForge`（界面中文名仍为匠包）。图标在 `resources/icon.{png,icns,ico}`。

```bash
pnpm dist        # 当前 OS：先 build 再 electron-builder
pnpm dist:mac    # macOS → release/*.dmg 与 *.zip（默认当前 arch；可用 --arm64 / --x64）
pnpm dist:win    # Windows → NSIS x64（须在 Windows 机器或 CI 执行）
```

产物目录：`release/`（已 gitignore，勿提交大二进制）。

**交叉编译说明：** 在 macOS 上完成 F14 验收时，Windows NSIS **配置已就绪**，二进制需在 Windows CI/机器执行 `pnpm dist:win`。不强制在 Mac 上交叉打出 Windows 安装包。

## 隐私

- 零遥测；MVP 默认无出站网络
- 签名与密码仅留在本机（钥匙串 + 本地路径）
- 只用项目 Gradle Wrapper，不走 Android Studio IDE 打包路径

## License

待定。
