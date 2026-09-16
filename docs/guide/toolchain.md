# 官方工具组合：skillnomad × methodblocks × markrefs

> 一页判据：三个工具各自解决什么、组合起来解决什么、依赖方向、版本。
> 工具保留独立名字／版本／发布节奏；品牌只抓入口，不管内核。
> 落点：先文档页（本页），后脚手架模板（`templates/starter`，开箱即用）；
> 与《P2 集成前置包》（v3，审核关已通过）与《定位记录》同口径。

## 三个工具各自解决什么

| 工具 | 身份 | 解决 | 不解决 |
|---|---|---|---|
| [methodblocks](https://github.com/Co-Kyo/methodblocks) | 写法层：内容侧的作者语言 | 一件事的 what&how 写成积木（target／useMethod／example＋registry）；结构红（引用缺席／实例与母版互含／母版未进正文／同块双发布） | 不认识 step／pipeline（概念层互不相识）；跨文件引用存在性归 markrefs |
| [markrefs](https://github.com/Co-Kyo/markrefs) | 依赖完整性层 | 名字→路径、目标存在性、重复声明；诊断直指 `file:line` | 不做业务语义判断（名字与 scope 都是不透明字符串） |
| skillnomad（本仓） | 装配与产物层 | 组合、解析、验证、编译、渲染；链序、编号、区间、调度策略全部由声明派生 | 不再拥有业务能力（冻结新增：新能力先回答"为什么不能是内容包"） |

## 组合起来解决什么

三层红同一条失败汇总（`Validation failed with N error(s)`），分层不变：

```text
结构红（methodblocks check()）→ 存在性红（markrefs）→ 装配红（skillnomad B1）
```

- 块内结构引用走 methodblocks Registry；跨文件引用一律走 markrefs；`pack()` 产物即 markrefs 语料（无需新适配）。
- 焊点：块集经 `blockModule({ id, registry, body })` 成为模块内容源（产物「模块附录」）；
  构建期块校验走可选 `config.structure`（缺省不声明＝逐字不变）。

## 依赖方向（单向，不可颠倒）

```text
skillnomad → methodblocks（固定版本号）
skillnomad → markrefs（固定版本号）
methodblocks → （不认识 skillnomad）
markrefs → （零运行时依赖，不认识任何宿主）
```

消费侧只依赖 `skillnomad` 一个包（单包单源）；`skillnomad-types`／`-common`／`-validate` 由主包转口，不单独安装。
构思阶段内互引与工具依赖一律固定版本号（整组同版，发版联动须同步全部 pin）。

## 版本（当前已发布版本；各包 package.json 为准）

| 依赖 | 版本 | 出处 |
|---|---|---|
| skillnomad（四包同版） | `0.1.6` | PR #22（P2 集成）→ #23（发版联动），tag `v0.1.6` |
| methodblocks（含 `check()`） | `0.1.1` | P0 前置（结构化校验导出） |
| markrefs | `0.1.0` | 独立版本线 |

三层红端到端 10/10（含三类红逐类必拦）；独立复核 V1–V7 证实。

## 从模板开始

最小可构建 skill（两步线性链，与快速上手同形状）：本仓目录 `templates/starter`。

```bash
cp -r <skillnomad-repo>/templates/starter my-skill && cd my-skill
npm install && npm run build   # 产物见 dist/skill/SKILL.md
```

模板只依赖 `skillnomad` 一个包（单包单源，固定版本号）；methodblocks 与 markrefs 由框架侧依赖带入，不必直引。

## 不走的路

- 不把块概念并入框架内核／类型系统；不改名吞并（反例：Docker Swarm Classic——独立名字与版本线一终止，第三方可用性随之消失）。
- 工具保留独立名字／版本／发布节奏；品牌以"官方推荐组合"露出。
