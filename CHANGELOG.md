# Changelog

> **注意**：新线自 **0.1.0-beta.1** 独立起步（orphan 干净根提交，skillpack → skillnomad 改名）；改名前的 skillpack 时期记录已归并在该版本节内。

## v0.1.6（methodblocks 集成 · 依赖固定版本号 · 工作流升版）

- **feat(blocks)**：methodblocks 集成——新增 `blockModule()` 适配器（块集 → 模块，构建期渲染进产物「模块附录」）与可选 `config.structure`（构建期块结构校验：引用缺席／一字不抄／母版未进正文／同块双发布；诊断并入构建失败汇总）。缺省不声明时产物与 0.1.5 逐字一致；公开面新增 4 个导出（`blockModule` ＋ 三个类型）。新增依赖 `methodblocks`（Markdown 积木化工具集，独立项目、独立发版）。
- **chore(deps)**：内互引与工具依赖一律改为**固定版本号**——`skillnomad-types`／`-common` 与本包精确同版（0.1.6）、`markrefs` 0.1.0、`methodblocks` 0.1.1；安装主包所得子包版本精确可预期（构思阶段整组同版策略）。
- **chore(ci)**：工作流 action 升版（checkout／setup-node → v7，Pages 动作 → v5），运行注解清零。
- 回归：typecheck 通过；全量测试 98/98。
- 升级影响：新增可选配置与导出为纯加法；依赖为固定版本号——若需与其它版本组合，请显式安装对应精确版本。

## v0.1.5（模块全链路 · 公开 API 面收敛 · 测试 CI 兜底）

- **feat(modules)**：模块接入构建链路——`config.modules`（可选）声明后，构建期做注册表校验（id 唯一、`deps` 无环、注册表 `module` 引用未登记即红），并把模块 `render()` 的结果渲染进引用步骤的「模块附录」（含引用表标注；未声明模块时产物逐字不变）。
- **breaking(api)**：公开面收敛——主包导出从 142 个收敛为 42 个（面向使用者的构造 API、类型与构建 API）；与使用方无关的内部类型与工具（校验器、派生器、内部模型类型、依赖解析等）移出主包，多数仍可从子包（`skillnomad-types`／`-common`）导入。同时清退 4 个弃用占位函数（`edge`／`agent`／`batch`／`mapWork`）与零引用占位 `'{capabilityId}'`。
- **chore(ci)**：新增测试工作流（build → test → lint）；新增「公开面快照」测试锁定导出清单。
- 回归：typecheck 通过；全量测试 91/91。
- 升级影响：从 `skillnomad` 引用被移出符号的代码会编译报错——改从子包导入或不再使用；4 个弃用函数与 `'{capabilityId}'` 占位符移除（零引用）；不声明 `modules` 时构建产物与 0.1.4 逐字一致。

## v0.1.4（模块一等公民 · 调度四层重做 · markrefs 构建期校验）

- **feat(types)**：`SourceModule` 与 `defineModule()` 成为一等公民——模块有显式形状（`id`／`version?`／`kind`／`deps?`／`render`），与 `step` 并列从主包导出；`SourceContract.module` 双轨（缺席即原路径形态，旧写法不变）。
- **feat(render)**：新增「模块附录」节（未声明模块时整段省略）；`sourceTrace` 的 `sourceLayer` 新增 `modules` 取值。
- **feat(scheduling)**：调度四层重做——数据层常量（`SCHEDULING`／`STEP_MODES`／`PROACTIVE_CHECK_IDS`）、动词层纯函数与组合子（`batchParallel`／`rollingWindow`／`topoBatch`）、渲染入口（`renderPolicy`／`renderMode`／`renderBinding`／`renderModuleDoc`）；其中 `SCHEDULING`／`renderBinding`／`renderModuleDoc` 经主包转口，其余从 `skillnomad-common` 直引。`proactiveChecks` 语义收窄为「何时查＋失败怎么办」，查什么由调用方传入。
- **feat(markrefs)**：构建期 markdown 交叉引用校验（**可选，默认不跑**）——在配置里声明名字表与引用登记后，构建输出 `markrefs：N 条引用（X 条判存在性，Y 条模板跳过）`，诊断按 `site ruleId message` 单独成区并计入失败汇总；引用位置由调用栈捕获取 `file:line`。新增依赖 `markrefs`（Markdown 交叉引用解析与校验，独立项目、独立发版）。
- **feat(validate)**：新增两个按需调用的校验器（导出，未接入默认构建流程）：`validateBodySections`（task body 含「搜法／检测／标注／修正」任一动作词时，须同含「判据：」与「参照」字样）、`validateModules`（模块注册表 id 唯一、`deps` 无环）。
- **fix(packaging)**：CLI 的 `bin` 元数据去掉 `./` 前缀——新版 npm 发布会把该写法判为非法并删除，安装后无可用命令。
- 回归：typecheck 通过；全量测试 47/47。
- 升级影响：不配置 `markrefs` 时默认路径与 0.1.3 逐字一致（模块附录缺席省略；两个新校验器按需调用）；`sourceLayer` 联合类型新增 `modules`（穷尽 switch 的消费侧会有编译期提示）；启用 `markrefs` 后 `Validation failed with N error(s)` 的 N 含其诊断数。

## v0.1.3（decision 示例分隔符 · D33）

- **feat(types)**：`SourceDecisionSummary` 加 `isExample?: boolean`（语义单真相源：为 true 时全块为历史运行示例值，非本次运行时填充；缺席即事实）——few-shot 示例分隔符的机器可读边界（D33 P24 升格专案）。
- **feat(render)**：decision 渲染加示例分支（md `renderBarrier`：示例区块标注——题注＋metrics/selection `（示例）` 后缀＋barrier_summary `【示例】` 前缀；缺席逐字不变）＋ `decision-summary.json` manifest 透传（缺席键省略）。
- 回归：typecheck 通过；全量测试 25/25（含新增 `decision-example.test.mjs` 双测：分支含标注＋缺席快照逐字一致）。
- 升级影响：可选字段，缺席逐字不变；存量"（示例）"字样保留作降级兼容。

## v0.1.2（ref 承载形态清退 · D29 缺陷修复版）

- **breaking(types)**：清退 `SourceRef.ref` 概念引用声明形态（删字段与注释块），`SourceRef.path` 转必填——该形态自 beta.9 发布起零真实用例：两次真实转化（sp-skill、narrative-focus port）均自发选择用户侧 `refOf` helper 达成同一不变量「步骤层零路径字面量」，原定验证路径被真实转化绕开而非采用。路径解析归用户侧，框架不承载概念引用形态——「不做领域模型抽象」的边界收得更紧。
- **refactor(core)**：删除两处「未解析概念引用」运行时 throw 防护（`sourceRef` 与 map over）——`path` 必填后为死代码（实测删除后全量测试仍全绿）；缺失路径由运行时 throw 改为编译期报错。
- **fix(core)**（随本版发版生效）：工作区三包补 `main`/`exports` 导出；`createSkill` 直装配路径 checkpoint 正确转 barrier（含 3 回归用例）。
- 升级影响：源码声明 `{ ref: '…' }` 不带 `path` 由运行时 throw 改为编译期报错；两真实转化仓 grep 实测零改动。`docs/api/types.md` 概览已同步；`SourceVerifyRule.ref`（校验清单条目引用）为另一独立字段，不受影响。
- 回归：typecheck 通过；全量测试 23/23。

## v0.1.1（P1 缺陷修复版）

- **fix(render)**：`renderStep` 正文早返分支补渲染四节声明（依赖 / 增量复用 / 降级协议 / 插件加载）——
  早返前四节被静默丢失，带正文步骤的 reuse/plugins 声明在产物中零渲染。抽取四共享函数，早返与完整分支共用；
  无声明时整段省略（行为与修前完整分支一致）。
- 回归：`renderstep-p1.test.mjs` 4 用例（早返四节必有渲染 / 无声明省略 / 无 dependsOn 渲染"无" / 双分支一致）；`npm test` 20/20。
- 端到端：sp-skill 构建产物 `## 增量复用`×4、`## 插件加载`×4、`## 依赖`×11 全命中（`## 降级协议`零命中符合预期：11 步零 `.degrade()`）。
- 升级影响：带正文步骤的产物新增缺失章节（补承诺，非新功能）；无正文步骤产物逐字不变。

## v0.1.0（首个稳定版 · 可信度里程碑）

> **定位**：0.1.0 不是功能里程碑，是**可信度里程碑**——五项指标全部是「兑现已说过的话」，没有新增功能。semver 口径：0.x 的 minor 即可包含破坏性变更；本版承诺仅「默认安装即可用」，**契约冻结发生在 1.0**（`0.2.0` 起仍可破坏性变更）。

**五项指标（M1-M5）全部达标**：

- **M1 安装面**：四包 + release-manifest 统一 0.1.0；`latest` dist-tag 自本版起首次指向正式版（此前停留 beta.1，默认安装落后 8 个版本）
- **M2 契约对账**：`contract.md` 12 条公开承诺逐条对账全绿（框架 45 测试 case + `skillnomad-validate` 独立入口实测）
- **M3 悬空清零**：第二用例 narrative-focus-port 归位（纳入版本控制）并升级至本版本
- **M4 形态反证**：`SourceRef.ref` 由第二用例以 **ref 声明模式**落地（`{ ref: 'name' }` + 领域 resolver），框架未解析防护正反用例 4/4 通过；与 sp-skill 的实体常量模式互为反证
- **M5 变更出口**：README 冻结点表述修正，升级风险判断口径唯一

**相对 v0.1.0-beta.9 的代码差异（诚实口径）**：

- fix(validate)：CLI 动态 import 改用 `pathToFileURL`——Windows 下裸绝对路径报 `protocol 'c:'`（与主包 CLI 同法）
- types 注释口径清理（移除内部裁定编号）
- 版本号统一 0.1.0

从 beta.9 升级无行为变化（validate CLI 修复除外）；从更早版本升级请逐条查阅 beta.1 → beta.9 各节。

## v0.1.0-beta.9（8.16 概念引用承载候选）

- **概念引用形态（8.16 产物路径投射的框架侧）**：
  - `SourceRef.path` 改为可选 + 新增 `ref?`（概念引用声明形态）。
  - 边界（老板裁定）：框架**只承载形态，不做领域模型抽象**——`ref` 需由领域侧 resolver 解析为 `path` 后传入；`sourceRef`/map over 遇未解析 `ref` 抛错并提示。
  - sp-skill 采用实体常量模式（`domain/entities.ts` + `refOf`），步骤层路径字面量清零——框架渲染/校验零逻辑改动。

## v0.1.0-beta.8（API 表面收敛）

- **主包 = 唯一公共 API 表面**：`skillnomad/src/index.ts` 追加 `export * from 'skillnomad-types'` —— `step` builder、flow 辅助（task/seq/parallel/mapNode/branch/loop）与全部类型统一从主包出。
- 用户端体验收敛为：`npm install skillnomad -D` 一条命令 + `import ... from 'skillnomad'` 一个源；types/common 保留为内部组织（传递依赖）。
- 配套 sp-skill：18 处 `skillnomad-types` import 收敛 + package.json 只声明 skillnomad；第二用例 narrative-focus-port 同步收敛。
- 验证：tsc + 16 测试全绿；sp-skill 44 测试全绿、产物无新增差异。

## v0.1.0-beta.7（8.15 Step 2 候选）

- **模块引用一致性校验（8.15 模块抽象落地）**：
  - `SourceContract` 加 `scope: 'skill' | 'step'`（归属层）+ `step?`（step 级归属步骤）。
  - `SourceRefRole` 加 `'method'`（8.5「其余遇到再加」）。
  - `SkillDefinition` 加 `contracts?`；`createSkillFromModel` 透传；CLI 构建透传。
  - common 新增 `validateModuleUsage(steps, registry)`：V1 角色×归属一致性（`as:'contract'` 必须指向 skill 级条目）；V2 私有可见性（step 级模块跨步引用报错）；buildPipeline 接入。
  - 新增 module-usage.test.mjs 6 用例；完整测试 16/16 全绿。

## v0.1.0-beta.6

- **调度策略 schedulingPolicy 一等公民（8.13/8.14 落地）**：
  - model.ts 新增 `SourceSchedulingPolicy`（`concurrencyLimit` 必填 + `windowBudget` + `batchPolicy` + `note`）/ `SchedulingBatchPolicy` / `SchedulingWindowBudget` / `SchedulingBatchMode`；`SourceMeta.schedulingPolicy?`。
  - `renderSkillMd` 渲染「## 调度策略」公共章节（SKILL.md 级），三类声明派生渲染。
  - common `validateSchedulingPolicy`：concurrencyLimit 正整数 / batchPolicy.mode 枚举合法性校验；buildPipeline 接入。
  - 新增 scheduling-policy.test.mjs（渲染 + 校验 5 用例）；完整测试 10/10 全绿。

## v0.1.0-beta.5

- **8.5 渲染侧修复：`as:'contract'` 派生渲染契约引用章节**：
  - `FileRef` 新增 `as?: SourceRefRole`；`sourceRef()` 透传 as。
  - `renderFileRefs()` 重构：契约文档进「契约引用」章节，数据流 reads+writes 进「文件引用」表，二者互不重复（消除人工双清单）。
  - `renderStep()` 无 body 路径统一走 `renderFileRefs()`（消除双路径分叉）。

## v0.1.0-beta.4

- **8.4 dependsOn 单值化**：`dependsOn: string[]` → `dependsOn?: string`；builder `.dependsOn(id: string)`；`next` 加 `@deprecated` 注解。
- **8.5 contractRefs 删除**：`SourceInstruction.contractRefs` 删除；`SourceRef` 新增 `as?: 'contract'|'schema'|'rule'|'reference'` 角色标签。
- 顺带修复：renderStep/renderSkillMd footer 版本号 hardcode 改为 `v${SKILLNOMAD_VERSION}`。
- README 补「1.0 前 API 不稳定」说明 + `.dependsOn()` 单值语义。

## v0.1.0-beta.3

- 修复 artifact-manifest 版本 hardcode bug（`skillnomad_version: '0.2.0'` → 从 package.json 动态读取）。

## v0.1.0-beta.2

- OIDC 发布链路验证通过；prerelease 走 `beta` dist-tag，不占 `latest`。

## v0.1.0-beta.1

- 全新独立起点（干净根提交），4 包改名发布；CLI `skillnomad`、`.skillnomad-state.json`、`SKILLNOMAD_SOURCE_COMMIT`、release.yml OIDC。

**改名前记录（skillpack 时期）**：

- （skillpack v0.2.0）新增 `{{num:stepId}}` 占位符:渲染为两位补零步骤序号(与 processes 文件名一致);`{{step:stepId}}` 行为不变。
- （skillpack v0.2.0）插值盲区补全:bodyFile 内容、任务级 bodyFile、SKILL.md flowOverview 现在也经 `resolveStepRefs` 解析。
- （skillpack v0.2.0）`renderStep` 新增 `stepOrder` 参数(渲染期可解析任意文本中的步骤引用)。
- （skillpack v0.2.0）首批单元测试(node --test,5 项)。
- （skillpack v0.1.0）首次开源发布。
