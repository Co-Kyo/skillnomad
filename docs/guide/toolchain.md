# 官方工具组合：skillnomad × methodblocks × markrefs

> **写给谁**：要用内容块写作、或关心三个工具怎么分工的人。只写管道不碰块 → 本页可跳过。

> 速览：三个工具各自解决什么、组合起来解决什么、依赖方向、版本。
> 工具保留独立名字／版本／发布节奏；品牌只抓入口，不管内核。
> 开箱模板：`skillnomad init`（本页下方）。

## 三个工具各自解决什么

| 工具 | 身份 | 解决 | 不解决 |
|---|---|---|---|
| [methodblocks](https://github.com/Co-Kyo/methodblocks) | 写法层：内容侧的作者语言 | 一件事的 what&how 写成积木（target／useMethod／example＋registry）；结构红（引用缺席／实例与母版互含／母版未进正文／同块双发布） | 不认识 step／pipeline（概念层互不相识）；跨文件引用存在性归 markrefs |
| [markrefs](https://github.com/Co-Kyo/markrefs) | 依赖完整性层 | 名字→路径、目标存在性、重复声明；诊断直指 `file:line` | 不做业务语义判断（名字与 scope 都是不透明字符串） |
| skillnomad（主包） | 装配与产物层 | 组合、解析、验证、编译、渲染；链序、编号、区间、发布路径全部由声明派生 | 不承载业务能力（新业务能力做成内容包）；零调度（并行/分批只在步骤内 flow，不在声明层） |

## 组合起来解决什么

三层红同一条失败汇总（`Validation failed with N error(s)`），分层不变：

```text
结构红（methodblocks check()）→ 存在性红（markrefs）→ 装配红（skillnomad）
```

- 块内结构引用走 methodblocks Registry；跨文件引用一律走 markrefs；`pack()` 产物即 markrefs 语料（无需新适配）。
- **接线**：块集经 `blockModule({ id, registry, body })` 成为模块内容源（产物「模块附录」）；
  构建期块校验走可选 `config.structure`（缺省不声明＝逐字不变）。

## 依赖方向（单向，不可颠倒）

```text
skillnomad → methodblocks（固定版本号）
skillnomad → markrefs（固定版本号）
methodblocks → （不认识 skillnomad）
markrefs → （零运行时依赖，不认识任何宿主）
```

消费侧只依赖 `skillnomad` 一个包；methodblocks 与 markrefs 作为框架依赖自动带入，不必直引。
工具依赖一律固定版本号（整组同版），你不必管理这些版本。

## 版本（当前已发布版本；各包 package.json 为准）

| 依赖 | 版本 | 出处 |
|---|---|---|
| skillnomad | `0.2.4` | npm |
| methodblocks（含 `check()`） | `0.1.1` | 前置依赖（结构化校验导出） |
| markrefs | `0.1.0` | 独立版本线 |

三层校验逐层拦截，同一条失败汇总。

## 从模板开始

最小可构建 skill（两步线性链，与快速上手同形状）：装好 `skillnomad` 后一条命令生成——

```bash
npx skillnomad init my-skill && cd my-skill
npm install && npm run build   # 产物见 dist/skill/SKILL.md
```

`init` 从包内模板生成项目骨架：项目名取自目录名，依赖版本固定为当前安装版本；目标目录非空会拒绝，不覆盖已有文件。模板只依赖 `skillnomad` 一个包；methodblocks 与 markrefs 由框架侧依赖带入，不必直引。

## 三工具的分界

- 三个工具保留独立名字、版本与发布节奏——你可以单独使用其中任何一个；skillnomad 不吞并它们的类型系统。
