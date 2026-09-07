# F09 — 工程签名绑定

| 字段 | 内容 |
|------|------|
| 编号 | F09 |
| 状态 | `done` |
| 依赖 | F03、F05（规范化 projectPath） |
| PRD | FR-05、§12（v1.4：按工程路径绑定） |
| 触发语 | `开始执行 F09` |

## 1. 目标

签名与**工程路径 1:1 绑定**：首次打开某工程时在工作台配置（或选择不注入）并缓存；再次打开同路径自动带出。密码进 keytar；提供「拼装 injected 参数 + 命令预览打码」纯函数。**无独立签名管理页。**

## 2. 非目标

- 不改工程 `build.gradle`
- 不把密码写入 electron-store 或项目文件
- 不维护全局签名档案列表
- 不在本任务执行正式打包（F11 调用拼装结果）

## 3. 冻结契约

### 3.1 keytar

- `service = 'PackForge'`
- `account = signing:${profileId}:store` / `signing:${profileId}:key`
- `profileId` 为该工程绑定内生成并固定的 id（改 keystore 路径时仍复用，避免丢密码）

### 3.2 存储

```ts
// electron-store: signing.bindings
Record<projectPath, ProjectSigningBinding>

ProjectSigningBinding {
  projectPath: string   // 规范化绝对路径
  inject: boolean
  profile: SigningProfileMeta | null  // inject=false 时为 null
}

SigningProfileMeta {
  id: string
  storeFile: string
  keyAlias: string
  storeType?: string
  keyPasswordSameAsStore: boolean
  // 无 name；无密码字段
}
```

### 3.3 API

```ts
getProjectSigning(projectPath: string): Result<ProjectSigningBinding | null>
upsertProjectSigning(projectPath: string, input: {
  inject: boolean
  storeFile?: string
  keyAlias?: string
  storeType?: string
  storePassword?: string   // 编辑时留空表示沿用钥匙串
  keyPassword?: string
  keyPasswordSameAsStore?: boolean
}): Result<ProjectSigningBinding>
clearProjectSigning(projectPath: string): Result<void>  // 删绑定 + keytar

buildSigningInjectArgs(projectPath: string): Promise<Result<{
  args: string[]           // -Pandroid.injected.signing...
  previewArgs: string[]    // 密码已替换为 ***
}>>
// 无绑定或 inject=false → args=[] / previewArgs=[]
```

注入键名冻结：

```text
android.injected.signing.store.file
android.injected.signing.store.password
android.injected.signing.key.alias
android.injected.signing.key.password
android.injected.signing.store.type   # 可选，有 storeType 才加
```

### 3.4 校验

- 注入时：keystore 路径文件存在；缺密码或缺文件 → `E_SIGN_MISSING`

## 4. 实现规格

1. 依赖 `keytar`；`pnpm rebuild`（见 README）。
2. 工作台内嵌签名步骤（打开工程后显示）：「不注入」开关 + keystore 表单 + 保存；预览默认打码，「显示密钥」二次确认。
3. 打开工程 → `getProjectSigning` 自动带出。
4. 单元测试：打码函数保证 password 不会出现在 preview 中。

## 5. 验收清单

- [x] 绑定元数据按工程路径在 store，密码只在 keytar
- [x] 改为不注入 / 清除绑定时钥匙串条目清除
- [x] preview 默认无明文密码
- [x] 可按工程记住「不注入」
- [x] 无独立签名管理页；UI/代码无「把密码写入工程」路径
- [x] 再打开同路径自动带出

## 6. 完成动作

1. 状态 → `done`
2. **commit-and-push**
