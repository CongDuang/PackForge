---
name: commit-and-push
description: >-
  基于本地 git status、diff、log 起草提交说明，执行 add+commit，并 push 到 origin。
  Use when the user asks to 提交并推送、commit and push、push 代码，或显式使用本 skill。
---

# Commit and Push

对当前仓库完成：**分析变更 → 提交 → 推送到 origin**。默认 remote：

`git@github.com:CongDuang/PackForge.git`

## 安全红线

- 禁止修改 git config
- 禁止 `push --force` 到 `main` / `master`（除非用户在本轮明确要求）
- 禁止 `--no-verify` / 跳过 hooks（除非用户明确要求）
- 禁止交互式命令（如 `git rebase -i`、`git add -i`）
- 禁止把 `.env`、密钥、keystore 密码文件等打进提交；若用户坚持，先警告
- 不要随意 `amend`：仅当用户明确要求，或「刚由你创建的 HEAD 提交被 hook 改文件且未推送」时才可 amend；commit 失败后必须**新建** commit

## 工作流

### 1. 并行收集上下文

在仓库根目录并行执行：

```bash
git status
git diff && git diff --staged
git log -5 --oneline
git remote -v
git branch -vv
```

无变更则停止并说明，不要空提交。

### 2. 校正 origin

若没有 `origin`，或 URL 不是 `git@github.com:CongDuang/PackForge.git`：

```bash
git remote add origin git@github.com:CongDuang/PackForge.git
# 若 origin 已存在但 URL 错误：
git remote set-url origin git@github.com:CongDuang/PackForge.git
```

### 3. 起草 commit message

- 阅读 status + diff，归纳 **why**（不是文件清单）
- 1–2 句；可沿用仓库既有 `git log` 风格
- 用 HEREDOC 提交，避免转义问题

### 4. Add + Commit

```bash
git add <相关路径>
git commit -m "$(cat <<'EOF'
<message>

EOF
)"
```

- 只 stage 与本次意图相关的文件
- pre-commit 失败：修复后**新** commit，不要 amend 失败提交

### 5. Push

```bash
git push -u origin HEAD
```

需要网络 / SSH 权限。成功后回报：

- 分支名
- commit hash 与 message
- 远程：`git@github.com:CongDuang/PackForge.git`

若 push 被拒（非快进等）：说明原因与可选下一步，**不要**擅自 force push。

### 6. 收尾

再跑一次 `git status`，确认工作区干净且与 upstream 同步（或说明仍 ahead/behind）。
