# 概念：发布布局（角色 → 路径派生）

> 输出目录就是发布物：目录树不由作者手排，而由**角色**派生。你声明「这份文件是谁的」，框架决定「它发布到哪」——写错路径这件事在机制上不存在。

## 官方标准 ＋ 唯一扩展

发布布局遵循 Agent Skills 官方词表（[agentskills.io/specification](https://agentskills.io/specification)）：

| 目录 | 装什么 |
| :--- | :--- |
| `SKILL.md` | 入口：调用方式、流程总览、步骤详情 |
| `references/` | 文档（skill 级共享的 `.md`） |
| `assets/` | 静态资源（数据文件、模板、图片） |
| `scripts/` | 可执行代码 |

本框架的扩展只有一条：长流程多步管线需要「每步一组文件」——`steps/<NN>-<步id>/`，每步执行文件固定名 `step.md`。

```text
dist/skill/
├── SKILL.md
├── steps/
│   └── 03-deep-dive/step.md
├── references/
│   └── substitution-test.md
└── assets/
    └── schemas.json
```

## 分工：谁定什么

| 谁 | 定什么 |
| :--- | :--- |
| **消费者** | ① 哪个文件随包分发（源位置自由，放哪都行）；② 它的**角色**——`scope: 'skill'`（技能级共享）或 `scope: 'step'` ＋ 归属步 id（步骤自有） |
| **框架** | 由角色派生发布位置，并校验：归属步存在／保留名未占用／派生目标唯一／产物无源码形态路径 |

声明入口就是模块注册表（`SourceContract`）：

```ts
// 步骤自有文档 → steps/<NN>-<步id>/<文件名>
{ id: 'barrier-check', kind: 'policy', path: 'src/brainstorm/barrier-check.md',
  description: '…', scope: 'step', step: 'brainstorm' }

// 技能级 .md → references/；技能级数据文件 → assets/
{ id: 'substitution-test', kind: 'policy', path: 'src/rules/substitution-test.md',
  description: '…', scope: 'skill' }
```

派生规则（`publishPath`）：`scope:'step'` 进归属步目录；`scope:'skill'` 按扩展名分流——文档进 `references/`，其余进 `assets/`。**消费侧不写发布路径**：路径是派生物，写错无处可改，漏改就会静默断链。

## 三道校验（构建期即红）

1. **归属存在**：`scope:'step'` 的 `step` 必须在链上——归属步不存在即红。
2. **保留名**：`step.md`、`SKILL.md` 是保留名，资产占用即红（请改名）。
3. **唯一性**：两个源文件派生到同一路径即红——**同名不自动改名**，改名或用显式覆盖。

渲染期翻译：在注册表登记过角色的文件，产物「文件引用」表里印的是**发布路径**（`published` 映射在 `buildPipeline` 内完成）；未登记的按源路径原样印——所以随包分发的文件都应进注册表，否则产物里读到的引用与包内实存对不上。构建期还会扫产物文本——

- `scanSourcePaths`（构建期自动）：产物里出现源码形态路径（`src/…`）即红——散文也不行，逼内容域只说发布形态。
- `scanDanglingRefs`（供组装脚本调用，判据由调用方给）：随包文本里引用了 `steps/…`／`references/…` 等包内路径，但解析不到即红（含历史布局遗留名——写了就是断链）。模板（含 `{}`）与通配（含 `*`）不参与。
- `scanMetaDiscourse`（供组装脚本调用，黑名单由调用方给）：产物文本含构建过程话术（"构建期渲染""manifest 锁定"类）即报——这类词对执行侧读者是噪声。
- `scanMarkerDuplication`（供组装脚本调用，标记表由调用方给）：同一标记在同一行出现 ≥2 次即报（渲染器与数据各加一层标注的叠加痕迹）。

## 模块读取：附录锚

模块承载的读取不印路径——步骤产物里给的是「模块附录」锚点；正文**集中展开在该 step.md 文末的「模块附录」节**（不在正文处内联，也不进 SKILL.md），读者顺着锚到文末取正本，不需要知道任何文件在哪。

::: tip 写作提醒
指针与正文同文件但相距可能上百行——域绑定的具体动作（校验哪个字段、编织哪个关系）请写在任务正文里，包附录只承载通用方法论；否则执行侧按正文行事时会断供。
:::

## API 一览

| 导出 | 作用 |
| :--- | :--- |
| `PUBLISH_DIRS` / `STEP_ENTRY_FILE` | 官方目录常量与每步执行文件名 |
| `PublishableAsset` | 资产声明形状（`path` ＋ `scope` ＋ `step?`） |
| `publishPath(asset, seqOf)` | 由角色派生发布路径 |
| `checkPublishLayout(assets, steps)` | 三道布局校验（构建期自动接入） |
| `scanSourcePaths(files)` / `scanDanglingRefs(files, resolve)` | 文本级扫描（产物无源码路径／包内引用自洽） |
| `scanMetaDiscourse(files, blacklist)` / `scanMarkerDuplication(files, markers)` | 组装文本扫描（元话语黑名单／标记叠加检测——查机械痕迹，属组装质量；语义质量不在其范围，判据由调用方给） |

消费仓组装脚本与框架用同一份实现，派生逻辑不会两套口径。

> 下一步：模块归属与可见性 → [模块抽象](modules)；产物实体与概念引用 → [产物路径投射](entities)。
