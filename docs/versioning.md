# 版本线与迁移

> ⚠️ **1.0 前 API 不稳定**：beta 线接口可能以破坏性方式变更；升级前查阅本页与 CHANGELOG。契约在 0.1.0 冻结。

## 版本线（beta）

| 版本 | 里程碑 | 破坏性变更 |
| :--- | :--- | :--- |
| 0.1.0-beta.4/5 | 8.4/8.5 契约收窄 | `dependsOn` 数组 → 单值；删除 `contractRefs`（收拢进 reads + `as` 标签）|
| 0.1.0-beta.6 | 8.13/8.14 调度策略 | `meta.schedulingPolicy` 成为一等公民；步骤不再各自登记调度 |
| 0.1.0-beta.7 | 8.15 模块抽象 | `SourceContract.scope` 归属层；构建期 `validateModuleUsage` 校验 |
| 0.1.0-beta.8 | 8.17 API 表面收敛 | **单包**：`step`/类型统一从 `skillnomad` 导出；删除对 `skillnomad-types` 的直接 import |
| 0.1.0-beta.9 | 8.16 概念引用 | `SourceRef.path` 可选 + `ref?` 概念引用形态 |

## 迁移要点

- **beta.7 迁移**（模块注册表）：`as:'contract'` 引用必须指向 skill 级条目；step 级模块跨步引用 → 构建期报错
- **beta.8 迁移**（单包）：`import { step } from 'skillnomad-types'` → `import { step } from 'skillnomad'`；package.json 只声明 `skillnomad` 一个依赖
- **beta.9 迁移**（概念引用）：路径字面量从步骤层退出，改用 `refOf('entity')` / `entities.xxx.artifact`

## 安装

```bash
npm install -D skillnomad@beta        # 最新 beta（预发布）
npm install -D skillnomad             # 稳定线（beta 期 = 首个 beta，不建议）
```
