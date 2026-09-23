# panel2doc —— 同一个 skill 的两种写法

两步流程：**三方角色讨论 → 四段决策文档**。内容完全相同，写法有两份：

- `skill/`：手写版（1 个 SKILL.md ＋ 1 个 references 文件，纯 markdown，不知道框架存在）
- `src/`：框架源码版（3 个 ts 文件，构建后产出 markdown）

## 跑一遍（在本目录）

```bash
npm install                        # 依赖装在本目录 node_modules 下
npx tsx ../../src/bin/cli.ts build skillnomad.config.ts   # 框架构建 → ./out/（gitignore）
npx tsx assemble.ts                # 组装发布包      → ./release/（gitignore）
```

## 产物对照

| 手写版 | 框架版 |
| --- | --- |
| `skill/SKILL.md`（56 行，两步混排在一起） | `release/SKILL.md`（入口页）＋ `release/steps/00-panel/step.md` ＋ `release/steps/01-write-doc/step.md`（两步各自独立成文件） |
| `skill/references/report-standard.md`（路径写死在正文第 39 行） | `release/references/report-standard.md`（路径由 `publishPath` 按角色派生，正文里没人写过这个路径） |

## 散文变成代码的七处（手写行号 → 源码位置）

| # | 手写版 | 框架版 |
| --- | --- | --- |
| 1 | frontmatter 两行（1-4 行） | `src/skill.ts` 的 `meta` |
| 2 | 「打开 references/report-standard.md」（39 行） | `src/contracts.ts` 登记 ＋ `.reads({ ...reportStandard, as: 'contract' })` |
| 3 | 「起 3 个 subagent，各自独立跑」（15 行） | `.parallel('panel-round', [...3 个 roleTask...], { converge })` |
| 4 | 三个角色的定义（17-21 行） | `roleTask('role-backend' / 'role-pm' / 'role-security', 立场描述)` |
| 5 | 「缺一样就让它补」（23 行） | 第一步 `.checkpoint({ checkItems: [...3 项...] })` |
| 6 | 「写完后自查三件事」（48 行） | 第二步 `.checkpoint({ checkItems: [...3 项...] })` |
| 7 | 「内容全部从第一步的产物里取」（41 行） | 第一步 `.writes(disagreement-table.md)` ＋ 第二步 `.reads(同一路径)` 成对声明 |

## 框架没替你做的事

框架构建只产出**文本**（`SKILL.md` ＋ `steps/` ＋ 清单），不会搬运你登记的正文文件。
`assemble.ts` 用框架公开的 `publishPath()` 算出发布路径再拷贝——消费仓走的是同一条路
（`projects/sp-skill-dev/scripts/assemble-release.ts`）。