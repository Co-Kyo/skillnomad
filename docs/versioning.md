# 版本线与迁移

> 当前版本：**0.1.0**（首个稳定版，接口已定型）。后续变更以 [CHANGELOG](https://github.com/Co-Kyo/skillnomad/releases) 实际发布为准，本文不预告未发布版本。

## 安装

```bash
npm install skillnomad
```

## 版本历程（beta → 0.1.0）

0.1.0 定型前经过 6 个 beta 预发布，每个对应一个里程碑：

| 预发布 | 里程碑 | 关键变更 |
| :--- | :--- | :--- |
| beta.4/5 | 契约收窄 | `dependsOn` 数组 → 单值；删除 `contractRefs`（收拢进 reads + `as` 标签）|
| beta.6 | 调度策略 | `meta.schedulingPolicy` 成为一等公民；步骤不再各自登记调度 |
| beta.7 | 模块抽象 | `SourceContract.scope` 归属层；构建期 `validateModuleUsage` 校验 |
| beta.8 | API 表面收敛 | **单包**：`step`/类型统一从 `skillnomad` 导出；删除对 `skillnomad-types` 的直接 import |
| beta.9 | 概念引用 | `SourceRef.path` 可选 + `ref?` 概念引用形态 |
| **0.1.0** | **首个稳定版** | 接口定型，`latest` dist-tag |

> beta 预发布已停止维护，仅供历史回溯（npm dist-tag `beta` 指向 0.1.0-beta.9）。
