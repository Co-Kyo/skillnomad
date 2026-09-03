# 版本线与迁移

> 当前版本：**0.1.0**（首个稳定版）。beta 线（0.1.0-beta.x）已完成使命，接口在 0.1.0 定型；后续版本节奏以 [CHANGELOG](https://github.com/Co-Kyo/skillnomad/releases) 为准，不在此预告。

## 版本线（beta → 0.1.0）

| 版本 | 里程碑 | 破坏性变更 |
| :--- | :--- | :--- |
| 0.1.0-beta.4/5 | 契约收窄 | `dependsOn` 数组 → 单值；删除 `contractRefs`（收拢进 reads + `as` 标签）|
| 0.1.0-beta.6 | 调度策略 | `meta.schedulingPolicy` 成为一等公民；步骤不再各自登记调度 |
| 0.1.0-beta.7 | 模块抽象 | `SourceContract.scope` 归属层；构建期 `validateModuleUsage` 校验 |
| 0.1.0-beta.8 | API 表面收敛 | **单包**：`step`/类型统一从 `skillnomad` 导出；删除对 `skillnomad-types` 的直接 import |
| 0.1.0-beta.9 | 概念引用 | `SourceRef.path` 可选 + `ref?` 概念引用形态 |

## 迁移要点

- **beta.7 迁移**（模块注册表）：`as:'contract'` 引用必须指向 skill 级条目；step 级模块跨步引用 → 构建期报错
- **beta.8 迁移**（单包）：`import { step } from 'skillnomad-types'` → `import { step } from 'skillnomad'`；package.json 只声明 `skillnomad` 一个依赖
- **beta.9 迁移**（概念引用）：路径字面量从步骤层退出，改用 `refOf('entity')` / `entities.xxx.artifact`

## 安装

```bash
npm install skillnomad             # 稳定版 0.1.0（latest）
npm install -D skillnomad@beta     # beta 线（历史预发布，仅供回溯）
```
