# 概念：产物路径投射（8.16）

> 路径是业务顶层的投射物——**步骤层零路径字面量**，这是「声明事实，框架推导其余」的终局。

## 为什么路径要退出步骤层

8.16 之前，产物路径有两处声明：`contracts.ts` 的 runtime 表 + 步骤的 `inputs/outputs` 字面量——
**同一批路径手写两遍**，改一处漏一处（双列表）。

老板的裁定：**产物路径模型是从学习模型中投射出来的**。路径应该跟随领域概念，而不是散落在步骤里。

## 实体声明（唯一事实）

`src/domain/entities.ts` —— 每个产物实体 = 领域概念 + 路径模板：

```ts
export const entities = {
  ladder: {
    concept: 'ladder',                                  // 领域概念（只登记不发明）
    artifact: '{workDir}/{seq}-{short_name}/learning-ladder.md',
    kind: 'learning',                                   // learning / asset / mechanism
    description: '学习阶梯',
  },
  // ...
};
```

- `concept` 指向已有领域模块（intent / brainstorm / partition / scan / capability / evaluation / ladder + 机制产物）
- `kind: 'asset'` 标注长期资产（如 `capabilities/*.md` 跨命题累积）
- **实体 = 已有概念，只登记不发明**

## 概念引用（步骤侧）

步骤通过 `refOf` 引用概念，**源码里没有任何路径字面量**：

```ts
import { refOf, schemaRef } from '../domain/entities.js';

.writes(refOf('ladder'))
.inputs(refOf('requirementWeb').path)
.verify(verify.file(refOf('scanIndex').path, 'index.json 已生成'))
```

## 效果契约同源

`effects.ts` 的保证（如 `E-ladder-judgment`）从实体取值：

```ts
artifact: entities.ladder.artifact,   // ← 同源，ladder 路径双写消失
```

## 验收口径

- 步骤源码 grep 无 `{workDir}` / `assets/` **代码级字面量**（提示词文本除外）
- 路径只存在于：`entities.ts`（实体声明）+ 构建产物（SKILL.md 展开）
