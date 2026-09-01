# Changelog

> **注意**：下方 v0.2.0/v0.1.0 为改名（skillpack → skillnomad）时沿用的旧版本史。新线自 **0.1.0-beta.1** 独立起步（orphan 干净根提交），本轮 beta 线追溯如下。

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
