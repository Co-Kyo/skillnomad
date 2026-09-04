# skillnomad Agent Contract

> 状态：active
> 定位：根级 agent 契约，只放跨会话不变量和分级规则。框架源码仓（TS monorepo，四包同版 0.1.0）。
> **§1 角色先行是最高优先级，凌驾于一切便利；与下文冲突时以 §1 为准。**

## 1. 角色先行（每次任务进门执行）

> 来源：本项目角色先行约定（2026-09-04）—— 后续工作流与讨论视角先夯实角色，否则会在三个角色里迷失。

| 角色 | 是谁 | 他关心 | 他不需要 |
|---|---|---|---|
| A · 产物使用者 | 照着 md 干活的人 | 文件里有什么/缺什么 | 源码行号、构建细节 |
| B · 框架开发者 | 维护本仓的人 | 哪段代码、什么行为；修哪里 | 无 |
| C · Skill 作者 | 下游 Skill 作者 | 升级后产物有何变化 | 框架内部实现 |

铁律：

1. 每次任务先声明读者（A/B/C）与问题归属；T1/T2 动手前经用户确认，T0 在回复开头声明假设。
2. 每个回答先给结论，再给证据；不确定的标出来，不猜。
3. 术语首次出现即解释；改动保持最小。
4. 多角色任务按角色分节，每节只讲给一个人。
5. 本机私有 overlay 见 `agents.local.md`（gitignore，不入库）。

## 2. 项目边界

- TS monorepo：`packages/skillnomad-types` / `-common` / `skillnomad` / `-validate`，同版同节奏（`release-manifest.json`）；push tag → Actions OIDC 直发 npm。
- `renderStep` / validate / contract 行为即契约；改渲染、校验、类型就是改契约。
- `docs/` 为 VitePress 站；`demos/` 最小用例；`release.yml` Version gate 要求 tag / manifest / 每包版本三者一致。
- `main` 受分支保护：一切变更走分支 + PR，不直推（直推报 GH013 拒收）。

## 3. 内容→角色映射

| 内容 | 约束角色 | 讲什么 / 不讲什么 |
|---|---|---|
| 渲染/校验/类型/contract 变更、根因、修法 | B | 行号、分支、diff、前后对照；不展开 sp-skill 业务 |
| “产物 md 有什么变化”类问题 | A | 只讲文件章节有无与执行者影响；不贴源码 diff 回答 |
| 下游 Skill 管线语义问题 | C（指针） | 指去下游仓库，不在本仓展开 |

## 4. 冷启动

1. 读 `README.md`、`CHANGELOG.md`、`release-manifest.json` 确认版本口径。
2. 读 `packages/*/package.json` 确认四包结构。
3. 读 `docs/guide/contract.md` 确认契约语义。
4. 读 `.github/workflows/release.yml` 确认发布门。
5. 跑 `git log --oneline -10` + `git status` 确认基线。

## 5. 执行分级

| 级别 | 适用 | 最低要求 |
|---|---|---|
| T0 | 只读核验、问答、typo | 直接执行 |
| T1 | 单包小改 | 改后跑 `typecheck` / `build` / `test`，命令输出记回复 |
| T2 | 多包、契约/渲染/发布、subagent 委托 | 任务卡 + 独立验证 + 回归断言；委托需明确优势并记录理由 |

## 6. 通用规则

- 最小改动；改前选最小充分验证；不扩大范围；发现相关问题先记录，不擅自顺手改。
- Windows 路径用 `pathToFileURL`（e45555b 教训）；换行用 `.gitattributes`。
- T1/T2 把实际命令、输出摘要、改动文件和结论写入回复。
- 推送分工（2026-09-04 确立）：分支推送 agent 可直接执行（含建分支、提交、push、开 PR）；**云端合入（merge）由用户把关，agent 不点合入**。

## 7. 用户门（到达必须停下确认）

- 版本 bump、打 tag、push（走分支 + PR 合入，不直推 main）、发布。
- contract / 渲染 / 校验语义变更；0.x breaking 变更。
- 改变本契约。

## 8. 文档关系

- 本契约：根级，保持短小。
- `CHANGELOG.md` / `release-manifest.json`：版本真相源。
- 历史背景：见 CHANGELOG（0.1.0 起）。
