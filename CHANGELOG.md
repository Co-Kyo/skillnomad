# Changelog

> **注意**：下方 v0.2.0/v0.1.0 为改名（skillpack → skillnomad）时沿用的旧版本史。新线自 **0.1.0-beta.1** 独立起步（orphan 干净根提交），本轮 beta 线追溯如下。

## v0.2.0（ref 承载形态清退 · D29 缺陷修复版）

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

## v0.2.0

- 新增 `{{num:stepId}}` 占位符:渲染为两位补零步骤序号(与 processes 文件名一致);`{{step:stepId}}` 行为不变。
- 插值盲区补全:bodyFile 内容、任务级 bodyFile、SKILL.md flowOverview 现在也经 `resolveStepRefs` 解析。
- `renderStep` 新增 `stepOrder` 参数(渲染期可解析任意文本中的步骤引用)。
- 首批单元测试(node --test,5 项)。

## v0.1.0

- 首次开源发布。
