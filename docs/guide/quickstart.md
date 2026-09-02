# 快速上手

## 什么时候你需要 skillnomad

当你的 skill 出现这些征兆：**步骤越来越多、步骤之间有依赖、需要并行抓取/分析、产物文件一堆、共享规则在多个步骤重复**——这就是长流程管道型 skill。手写 markdown 维护它，顺序、编号、路径、调度迟早漂移成一场事故。

skillnomad 为这个场景而生：你只声明事实，框架推导其余。

## 你的第一个 skill：markdown 无法模块化导入的问题

skillnomad 存在的理由，是一个真实的槽点：**写 markdown skill 时，共用规则无法模块化**。
一段「替代测试」规则想被三个步骤共用，只能靠 `assets/common/xxx.md` 这种路径引用——
既不是 markdown 里有的能力，又不符合代码哲学。

skillnomad 的做法：**共用规则是模块，步骤引用的是符号名，路径是构建期的派生物**。

```bash
npm install -D skillnomad          # 单包单源（API 表面收敛后）
```

## 最小示例：模块化导入

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

`src/steps/collect.ts`：

```ts
import { step } from 'skillnomad';
import { modules } from '../modules.js';

export const collect = step('collect', '收集与标注')
  .reads({ ...modules.substitutionTest, as: 'rule' })   // ← 符号名引用
  .writes({ path: '{workDir}/.meta/labeled.json', description: '标注结果', required: true })
  .build();
```

`src/steps/review.ts` 同样引用 `substitutionTest`——**两个步骤共用同一份规则，源码里没有任何路径字面量**。

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

## 下一步

- 模块化导入的完整语义 → [模块抽象](concepts/modules)
- 哪些写法是反模式 → [顶层引导与反模式](anti-patterns)
- 类型参考 → [API 参考](../api/types)
