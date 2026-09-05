# 快速上手

> **30 秒自测：skillnomad 适合你吗？** skillnomad 只适配「长流程管道型」skill（约 15%）。先回答 3 个问题，命中 **≥2 条**再往下跑；否则请看[排除项说明](#不适合的场景)：
>
> 1. 你的 skill 步骤间有真实链序吗（上一步产物是下一步输入）？
> 2. 有可命名的中间产物吗（计划文件/测试报告/文档对象）？
> 3. 有并行/分批/顺序约束，或可推导字段（下一步/覆盖状态/校验结果）吗？
>
> 判据来源：应用面评估（top20 命中 3/20）。单步问答、无中间产物、无调度需求的 skill 用 skillnomad 收益小于迁移成本。

## 5 分钟跑通

```bash
npm install -D skillnomad          # 单包单源
```

### 1. 声明内容模块（共享规则）

`src/modules.ts` —— 一段被多个步骤共用的规则：

```ts
export const modules = {
  substitutionTest: {
    path: 'assets/common/substitution-test.md',
    description: '替代测试：判定细节角色的共享规则',
    required: true,
  },
};
```

### 2. 定义步骤：引用符号名，不写路径

`src/steps/collect.ts`（对象字面量写法；另需 `description`/`body`/`graph` 三必填，见下）：

```ts
import type { StepDefinition } from 'skillnomad';
import { task } from 'skillnomad';

export const collect: StepDefinition = {
  id: 'collect', title: '收集与标注', description: '收集并标注',
  body: '收集并标注。',
  reads: [{ path: 'assets/common/substitution-test.md', description: '共享规则', required: true }],
  writes: [{ path: '{workDir}/.meta/labeled.json', description: '标注结果', required: true }],
  graph: task({ id: 'collect-do', label: '收集', type: 'agent', body: '收集并标注。' }),
};
```

`src/steps/review.ts` 同上，加一行 `dependsOn: 'collect'`（线性链契约：多步必须连成单链，第二个根即断链报错）。

> 坑位提示（agent 实测 2026-09-05）：旧链式 `.reads().writes().build()` 已不存在；`graph` 是构造字段不是链式方法；`task` 从 `skillnomad` 主包导入（re-export）；缺 `dependsOn` 报"chain is disconnected"，缺 `graph` 报"Control tree graph is required"。

### 3. 组装并构建

`skillnomad.config.ts`：

```ts
import { defineConfig } from 'skillnomad';

export default defineConfig({
  skill: './skill.ts',
  outputDir: './dist/skill',
});
```

```bash
npx skillnomad build skillnomad.config.ts
```

构建产物 `SKILL.md` 里，每个步骤的「读取」章节展开为**带路径的完整引用**——
路径只存在于产物，源码里是干净的符号名。

## 为什么是这样：共用规则应该是模块

当你的 skill 出现这些征兆：**步骤越来越多、步骤之间有依赖、需要并行抓取/分析、产物文件一堆、共享规则在多个步骤重复**——手写 markdown 维护它，顺序、编号、路径、调度迟早漂移成一场事故。

skillnomad 为这个场景而生：你只声明事实，框架推导其余。

写 markdown skill 时，共用规则无法模块化：一段规则想被三个步骤共用，只能靠 `assets/common/xxx.md` 这种路径引用——既不是 markdown 里有的能力，又不符合代码哲学。

skillnomad 的做法：**共用规则是模块，步骤引用的是符号名，路径是构建期的派生物**。

## 不适合的场景

- 单步知识问答（无链序，链推导零收益）。
- 产物散在对话里、无从建模（无实体依赖）。
- 严格串行无分支（调度策略无处安放）。
- 一切字段全靠人写（推导无对象）。

## 下一步

- 模块化导入的完整语义 → [模块抽象](concepts/modules)
- 哪些写法是反模式 → [顶层引导与反模式](anti-patterns)
- 类型参考 → [API 参考](../api/types)
