# API 导览

> 本页按「你要做什么」组织公开面：每张表的符号都链接到自动生成的参考页（签名、字段、设计注释以生成页为准，永不手写、永不漂移）。想读某条设计背后的取舍 → [设计裁定与不走的路](../guide/decisions)。

## 写 skill 的你（作者面）

一条写作路径：`step()` 链式声明步骤 → `createSkillFromModel` 装配 → `defineConfig` 配置构建。步骤引用的共享内容经 `contracts` 注册表登记（[模块抽象](../guide/concepts/modules)），内容模块可用 `defineModule` 或内容包装载器产出（[发布布局](../guide/concepts/publish-layout)）。

| 符号 | 参考页 | 指南 |
| :--- | :--- | :--- |
| `step()` | [functions/step](reference/functions/step.md) | [快速上手](../guide/quickstart) |
| `createSkillFromModel` | [functions/createSkillFromModel](reference/functions/createSkillFromModel.md) | [快速上手](../guide/quickstart) |
| `defineConfig` / `SkillnomadConfig` | [functions/defineConfig](reference/functions/defineConfig.md) · [interfaces/SkillnomadConfig](reference/interfaces/SkillnomadConfig.md) | [核心契约](../guide/contract) |
| `SkillSourceModel` / `SourceStep` / `SourceFlow` / `SourceAction` / `SourceRef` / `SourceContract` / `SourcePolicies` / `SourceCheckpoint` / `SourceVerifyRule` / `SourceFailRule` / `NextAction` | [interfaces/…](reference/interfaces/SkillSourceModel.md) · [type-aliases/…](reference/type-aliases/NextAction.md) | [核心契约](../guide/contract) |
| `StepDefinition` / `SkillMeta` | [interfaces/StepDefinition](reference/interfaces/StepDefinition.md) · [interfaces/SkillMeta](reference/interfaces/SkillMeta.md) | — |
| `defineModule` / `SourceModule` | [functions/defineModule](reference/functions/defineModule.md) · [interfaces/SourceModule](reference/interfaces/SourceModule.md) | [模块抽象](../guide/concepts/modules) |

::: tip 为什么只有这一条路
框架曾同时提供 IR 构造子（`task`/`seq`/`parallel`…）与链式两种写法。两次真实转化证明：所有消费者自发选了链式，IR 面只剩框架自己用——两条路没有带来第二种人，只带来了第二份要维护的语义。裁定详情 → [设计裁定](../guide/decisions#一条写作路径)。
:::

## 做发布组装的你（组装面）

构建只渲染 `SKILL.md` 与 `steps/`；随包文件的**发布路径由角色派生**，你的组装脚本拿同一份实现拷贝落盘（[发布布局](../guide/concepts/publish-layout)）。

| 符号 | 参考页 | 指南 |
| :--- | :--- | :--- |
| `PUBLISH_DIRS` / `STEP_ENTRY_FILE` | [variables/PUBLISH_DIRS](reference/variables/PUBLISH_DIRS.md) | [发布布局](../guide/concepts/publish-layout) |
| `publishPath` / `checkPublishLayout` | [functions/publishPath](reference/functions/publishPath.md) · [functions/checkPublishLayout](reference/functions/checkPublishLayout.md) | [发布布局](../guide/concepts/publish-layout) |
| `scanSourcePaths` / `scanDanglingRefs` | [functions/scanSourcePaths](reference/functions/scanSourcePaths.md) · [functions/scanDanglingRefs](reference/functions/scanDanglingRefs.md) | [发布布局](../guide/concepts/publish-layout) |
| `PublishableAsset` / `PublishDiagnostic` | [interfaces/PublishableAsset](reference/interfaces/PublishableAsset.md) | — |
| 内容包装载器：`readPackageManifest` / `loadPackage` / `checkPackage` / `blockingPackageDiagnostics` / `packageModule` | [functions/loadPackage](reference/functions/loadPackage.md) · [functions/packageModule](reference/functions/packageModule.md) | [官方工具组合](../guide/toolchain) |
| `PackageManifest` / `PackageBlockSpec` / `LoadedPackage` | [interfaces/PackageManifest](reference/interfaces/PackageManifest.md) | — |

## 读机制的你（构建与整合面）

构建链路与工具整合的入口——日常写 skill 不需要直引，排查产物或做深度集成时用。

| 符号 | 参考页 | 指南 |
| :--- | :--- | :--- |
| `buildPipeline` | [functions/buildPipeline](reference/functions/buildPipeline.md) | [核心契约](../guide/contract) |
| `renderSkillMd` / `renderStep` / `renderPipeline` / `renderPipelineState` / `renderModulesAppendix` / `writeAlignReport` | [functions/renderSkillMd](reference/functions/renderSkillMd.md) | — |
| `resolveStepRefs` | [functions/resolveStepRefs](reference/functions/resolveStepRefs.md) | [产物路径投射](../guide/concepts/entities) |
| 散文质量门：`scanMetaDiscourse` / `scanMarkerDuplication` / `ProseHit` | [functions/scanMetaDiscourse](reference/functions/scanMetaDiscourse.md) · [functions/scanMarkerDuplication](reference/functions/scanMarkerDuplication.md) | [发布布局](../guide/concepts/publish-layout) |
| markrefs 整合：`createRefs` / `inspectRefs` / `MarkrefsConfig` / `KeyMap` | [functions/createRefs](reference/functions/createRefs.md) | [官方工具组合](../guide/toolchain) |
| methodblocks 整合：`blockModule` / `BlockModuleInput` / `StructureConfig` / `StructureDocSpec` | [functions/blockModule](reference/functions/blockModule.md) | [官方工具组合](../guide/toolchain) |

## 完整参考

全部公开符号的分组目录 → [API 参考索引](reference/README.md)（TypeDoc 构建期自动生成：签名、字段、源码注释里的设计理由一并呈现）。

::: warning 诚实边界
- 参考页中部分字段类型（如 `SourceMeta`、`SourceRuntimeTrace`）是**公开类型的可达成员**，本身不在公开面清单里——读字段够用，不承诺独立导入路径。
- 公开面清单由快照测试锁定，增删即构建红；本页与生成区都在其管辖内。1.0 前 minor 可含破坏性变更（[版本线](../versioning)）。
:::
