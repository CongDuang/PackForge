# 匠包（PackForge）

本地锻造，不上云。

面向 Android 工程师的**本地 Gradle 打包工作台**：指定工程后，用项目自带 `gradlew` / `gradlew.bat` 打 APK / AAB，不经过 Android Studio IDE，避免 IDE 层同步/上传签名与未知遥测。

| | |
|---|---|
| 平台 | macOS、Windows |
| 状态 | 需求已确认，应用开发中 |
| 仓库 | [CongDuang/PackForge](https://github.com/CongDuang/PackForge) |

## 能做什么

- 指定项目路径，自动识别 macOS / Windows 的 Wrapper 脚本
- 导入本机已安装 JDK，打包时选择 `JAVA_HOME`（**不提供**在线下载）
- 管理签名档案（keystore / 别名 / 密码），经 AGP injected signing 注入，**不改**工程 `build.gradle`
- 读取 `buildType` / `flavor`，组合如 `bundleProdRelease`、`assembleDevDebug`
- 汇总 APK、AAB、`mapping.txt` 等产物，支持单选/多选复制到文件夹、文件剪贴板与拖出分享

## 技术栈（锁定）

Electron + React + TypeScript + Vite + Tailwind CSS + Zustand；配置用 `electron-store`，签名密码进系统钥匙串（`keytar`）；安装包用 `electron-builder`。

## 文档

完整产品需求见 [docs/PRD.md](docs/PRD.md)。实现与 PRD 冲突时，先更新 PRD 再改代码。

## 开发

应用脚手架尚未落地。后续将在本仓库提供：

```bash
# 示意（待脚手架就绪后补充真实命令）
npm install
npm run dev
```

## 隐私

- 零遥测；MVP 默认无出站网络
- 签名与密码仅留在本机（钥匙串 + 本地路径）
- 只用项目 Gradle Wrapper，不走 Android Studio IDE 打包路径

## License

待定。
