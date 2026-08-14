# AGENTS.md

本仓库是若干 Tampermonkey userscript 的集合（每个脚本一个目录，目录内直接放同名 `.user.js` 文件，无构建系统）。

## Agent skills

### Issue tracker

GitHub — issues 用 `gh` CLI 管理。见 `docs/agents/issue-tracker.md`。

### Triage labels

五个默认角色标签（`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`）。见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文：脚本所在目录 `CONTEXT.md` + 根目录的 `docs/adr/`。见 `docs/agents/domain.md`。