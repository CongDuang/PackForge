# F09 — 签名档案

| 字段 | 内容 |
|------|------|
| 编号 | F09 |
| 状态 | `pending` |
| 依赖 | F03 |
| PRD | FR-05、§12 |
| 触发语 | `开始执行 F09` |

## 1. 目标

签名管理：CRUD 档案；密码进 keytar；提供「拼装 injected 参数 + 命令预览打码」纯函数；可选不使用签名注入。

## 2. 非目标

- 不改工程 `build.gradle`
- 不把密码写入 electron-store 或项目文件
- 不在本任务执行正式打包（F11 调用拼装结果）

## 3. 冻结契约

### 3.1 keytar

- `service = 'PackForge'`
- `account = signing:${profileId}:store` / `signing:${profileId}:key`

### 3.2 API

```ts
listSigningProfiles(): Result<SigningProfileMeta[]>
upsertSigningProfile(input: {
  id?: string
  name: string
  storeFile: string
  keyAlias: string
  storeType?: string
  storePassword: string
  keyPassword: string
  keyPasswordSameAsStore: boolean
}): Result<SigningProfileMeta>
deleteSigningProfile(id: string): Result<void>  // 同步删 keytar

// 主进程内部或 shared：
buildSigningInjectArgs(profileId: string | null): Promise<Result<{
  args: string[]           // -Pandroid.injected.signing...
  previewArgs: string[]    // 密码已替换为 ***
}>>
```

注入键名冻结：

```text
android.injected.signing.store.file
android.injected.signing.store.password
android.injected.signing.key.alias
android.injected.signing.key.password
android.injected.signing.store.type   # 可选，有 storeType 才加
```

`profileId === null` → `args=[]`，表示不注入。

### 3.3 校验

- keystore 路径文件存在；缺密码或缺文件 → `E_SIGN_MISSING`

## 4. 实现规格

1. 依赖 `keytar`；注意 Electron 原生模块重建（`@electron/rebuild` 或 electron-builder 约定），在 README/本任务实现说明里写清 `pnpm rebuild`（若需要则加 script）。
2. 签名页：表单含「key 密码与 store 相同」开关。
3. 命令预览组件：只展示 `previewArgs`；若提供「显示密钥」必须二次确认，且默认关闭。
4. 单元测试：打码函数保证 password 不会出现在 preview 中。

## 5. 验收清单

- [ ] 档案元数据在 store，密码只在 keytar
- [ ] 删除档案时钥匙串条目清除
- [ ] preview 默认无明文密码
- [ ] 可空签名（不注入）
- [ ] UI/代码无「把密码写入工程」路径

## 6. 完成动作

1. 状态 → `done`
2. **commit-and-push**
