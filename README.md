# 匠包（PackForge）

本地锻造，不上云。

面向 Android 工程师的**本地 Gradle 打包工作台**：指定工程后，用项目自带 `gradlew` / `gradlew.bat` 打 APK / AAB，不经过 Android Studio IDE，避免 IDE 层同步/上传签名与未知遥测。

| | |
|---|---|
| 平台 | macOS、Windows |
| 状态 | 需求已确认，按 features 任务开发中 |
| 仓库 | [CongDuang/PackForge](https://github.com/CongDuang/PackForge) |

## 能做什么

- 指定项目路径，自动识别 macOS / Windows 的 Wrapper 脚本
- 导入本机已安装 JDK，打包时选择 `JAVA_HOME`（**不提供**在线下载）
- 管理签名档案（keystore / 别名 / 密码），经 AGP injected signing 注入，**不改**工程 `build.gradle`
- 读取 `buildType` / `flavor`，组合如 `bundleProdRelease`、`assembleDevDebug`
- 汇总 APK、AAB、`mapping.txt` 等产物，支持单选/多选**复制到文件夹**、**复制路径**、**文件剪贴板**（不做拖出）

## 技术栈（锁定）

Electron + React + TypeScript + Vite + Tailwind CSS + Zustand；配置用 `electron-store`，签名密码进系统钥匙串（`keytar`）；安装包用 `electron-builder`。

## 文档

- 产品需求：[docs/PRD.md](docs/PRD.md)
- **开发任务（顺序执行）：** [features/README.md](features/README.md)（F01–F14）

实现与 PRD 冲突时，先更新 PRD 再改代码。会话中说「开始执行 Fxx」即按对应任务说明书开发，完成后自动 commit-and-push。

## 开发

包管理器：**npm**。脚手架已落地（F01）。

```bash
npm install
npm run dev        # 启动 Vite + Electron
npm run typecheck  # TypeScript 严格检查
npm run build      # 编译渲染进程与主进程
```

打包发布见任务 **F14**（`npm run dist` 等，以落地后 README 为准）。

## 隐私

- 零遥测；MVP 默认无出站网络
- 签名与密码仅留在本机（钥匙串 + 本地路径）
- 只用项目 Gradle Wrapper，不走 Android Studio IDE 打包路径

## License

待定。
