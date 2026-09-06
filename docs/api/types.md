# API 参考

> 本页为核心类型概览；完整 API 参考由 TypeDoc 在构建时从 `skillnomad-types` 源码 JSDoc 自动生成（CI 执行，永不手写）。

## SourceRef（引用条目）

```ts
interface SourceRef {
  path: string;               // 源产物路径（必填）
  schema?: string;
  required?: boolean;
  dynamic?: boolean;
  description?: string;
  as?: SourceRefRole;         // 'contract' | 'schema' | 'rule' | 'method' | 'reference'
}
```

- `as: 'contract'` 的条目在产物中派生渲染「契约引用」章节
- 路径解析（如概念名→路径）归用户侧 helper（`refOf` 模式），框架不承载概念引用形态（v0.2.0 起 `ref` 声明形态已清退）

## SourceContract（模块注册表条目）

```ts
interface SourceContract {
  id: string;
  kind: 'policy' | 'schema' | 'method' | 'rule';
  path: string;
  description: string;
  scope: 'skill' | 'step';    // 归属层：skill 级共享 / step 级私有
  step?: string;              // step 级时归属的步骤 id
}
```

## schedulingPolicy（skill 级调度声明）

```ts
interface SchedulingPolicy {
  concurrencyLimit: number;       // 全局并发上限（Task Group）
  windowBudget: {
    maxWindowSize: number;        // 单次调用窗口数上限
    inputChunkTokens: number;
    itemSummaryTokens: number;
  };
  batchPolicy: {
    mode: 'rolling_window';
    maxBatchSize: number;
    slotOccupancy: number;
  };
}
```

声明在 `meta.schedulingPolicy`——SKILL.md 公共级章节；步骤内控制流用 `parallel` / `map`（`maxConcurrency`）表达，两层不混淆。

## step builder（构造步骤）

```ts
import { step } from 'skillnomad';   // 单包导出

step(id, title)
  .summary(...)
  .dependsOn('prev-step')            // 单值（单值收窄）
  .reads(...)                        // SourceRef[]（符号名/概念引用）
  .writes(...)
  .inputs(...) / .outputs(...)
  .parallel(...) / .map(...) / .branch(...) / .loop(...)   // 步内控制流
  .checkpoint(...)
  .build();
```

## 更多类型

完整类型集（`SkillDefinition` / `SourceStep` / `SourceFlow` / `EffectContract`…）在 `skillnomad-types` 源码中，
TypeDoc 生成后此处自动展开。
