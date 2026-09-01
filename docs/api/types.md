# API 参考

> 本页当前为手写核心类型概览；TypeDoc 自动生成（从 `skillnomad-types` 源码 JSDoc 派生）计划中——
> 生成后 API 页将完全由 CI 构建，永不手写。

## SourceRef（引用条目）

```ts
interface SourceRef {
  path?: string;              // 路径字面量（与 ref 二选一，解析后必填）
  ref?: string;               // 概念引用（8.16）：领域侧解析为 path 后传入
  schema?: string;
  required?: boolean;
  dynamic?: boolean;
  description?: string;
  as?: SourceRefRole;         // 'contract' | 'schema' | 'rule' | 'method' | 'reference'
}
```

- `as: 'contract'` 的条目在产物中派生渲染「契约引用」章节
- `ref` 是概念引用声明形态——框架**只承载形态，不做领域模型抽象**，解析归业务顶层

## SourceContract（模块注册表条目）

```ts
interface SourceContract {
  id: string;
  kind: 'policy' | 'schema' | 'method' | 'rule';
  path: string;
  description: string;
  scope: 'skill' | 'step';    // 8.15 归属层：skill 级共享 / step 级私有
  step?: string;              // step 级时归属的步骤 id
}
```

## schedulingPolicy（skill 级调度声明，8.13/8.14）

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
import { step } from 'skillnomad';   // 8.17 起单包导出

step(id, title)
  .summary(...)
  .dependsOn('prev-step')            // 单值（8.4 收窄）
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
