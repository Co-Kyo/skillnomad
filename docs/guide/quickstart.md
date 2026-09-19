# 快速上手

> **30 秒自测：skillnomad 适合你吗？** skillnomad 只适配「长流程管道型」skill（约 15%）。先回答 3 个问题，命中 **≥2 条**再往下跑；否则请看[排除项说明](#不适合的场景)：
>
> 1. 你的 skill 步骤间有真实链序吗（上一步产物是下一步输入）？
> 2. 有可命名的中间产物吗（计划文件/测试报告/文档对象）？
> 3. 有并行/分批/顺序约束，或可推导字段（下一步/覆盖状态/校验结果）吗？
>
> 判据来源：应用面评估（GitHub 高 star 前 20 个 skill 抽样，命中 3/20 ≈ 15%；样本与判定为一次性人工评估，非可复跑基准）。单步问答、无中间产物的 skill 用 skillnomad 收益小于迁移成本。

## 5 分钟跑通

```bash
npm install -D skillnomad
```

`skillnomad` 一个包承载全部：step builder、类型、校验、发布布局派生、内容包装载器、CLI。

### 1. 注册共享内容模块（带角色）

`src/contracts.ts` —— 一段被多个步骤共用的规则，注册进模块注册表。你只声明**它的角色**（skill 级共享），发布位置由框架派生。注意：`contracts` 字段是这张**登记表**的名字，与本站《核心契约》页里"框架的承诺"那个"契约"是两回事。

先声明条目对象，后面步骤直接展开引用，路径只写这一次：

```ts
export const substitutionTest = {
  id: 'substitution-test', kind: 'policy' as const,
  path: 'src/rules/substitution-test.md',        // 源路径：文件放哪自由，只写这一处
  description: '替代测试：判定细节角色的共享规则',
  scope: 'skill' as const,                        // 角色：skill 级 → 发布到 references/
};
export const contracts = [substitutionTest];
```

### 2. 定义步骤：链式写法，引用符号名不写路径

`src/steps/collect.ts`：

```ts
import { step } from 'skillnomad';
import { substitutionTest } from '../contracts.js';

export const collect = step('collect', '收集与标注')
  .target('收集并标注。')
  .summary('收集并标注')
  .action('parse', 'collect-do', '收集', '收集并标注。')
  .reads({ ...substitutionTest, as: 'contract' })   // 符号名引用，不重复写路径
  .writes({ path: '{workDir}/.meta/labeled.json', description: '标注结果', required: true })
  .checkpoint({
    checkItems: ['标注结果是否完整'],
    clarifyPrompt: '收集完成，确认后进入复核。',
    onConfirm: 'continue',
    onReject: 'rollback',
  })
  .build();
```

`src/steps/review.ts` 同上，加一行 `.dependsOn('collect')`（线性链契约：多步必须连成单链，第二个根即断链报错）。

> 坑位提示：`step()` 的每一步都要 `.build()` 收尾；构建会生成一份**对齐报告**（`align-report.md`，逐步核对每步的呈现是否齐全），它要求每步**动作正文＋检查点＋产出**三件套齐全（缺 `.checkpoint()` 构建即红），这也是给消费者的交付质量线；步骤内并行／分批用 `.parallel()`／`.map()`（见[契约](contract)）；顶层步骤是线性链，不要把可并行的动作拆成多个顶层步骤。

### 3. 组装并构建

`skill.ts`（把步骤收进模型；`createSkillFromModel` 是唯一装配入口）：

```ts
import type { SkillSourceModel } from 'skillnomad';
import { createSkillFromModel } from 'skillnomad';
import { collect } from './src/steps/collect.js';
import { review } from './src/steps/review.js';
import { contracts } from './src/contracts.js';

const model: SkillSourceModel = {
  meta: {
    name: 'my-skill',
    title: '我的技能',
    description: '一句话说明这个技能做什么',
    frontmatterDescription: '一句话说明这个技能做什么',
    callExamples: [],
    params: [],
    phases: [],
  },
  steps: [collect, review],
  contracts,
  policies: {
    contextIsolation: false,
    reuseByFileExistence: false,
    checkpointRequired: false,
    traceFields: [],
    runtimeTrace: { enabled: false, logDir: '', eventTypes: [] },
  },
};

export const skill = createSkillFromModel(model);
```

`skillnomad.config.ts`：

```ts
import { defineConfig } from 'skillnomad';

export default defineConfig({
  skill: './skill.ts',
  outputDir: './dist/skill',
});
```

```bash
npm install -D tsx                    # TS 加载器（starter 模板同款）
npx tsx node_modules/skillnomad/dist/bin/cli.js build skillnomad.config.ts
```

> 为什么带 tsx：`skill.ts` 里 `import … from './src/steps/collect.js'` 是 TypeScript 的标准写法（`.js` 说明符指向编译产物），运行期由加载器解析回 `.ts` 源文件；tsx 就是干这个的。Node ≥ 22.18 的原生类型剥离（不带 tsx 直接 `npx skillnomad build …`）只认 `.ts` 说明符，工程里别混用两种。

## 构建产物：发布布局

`skillnomad build` 渲染出 `SKILL.md` 与 `steps/<NN>-<id>/step.md`；注册表里登记的随包文件由你的组装脚本按**派生路径**拷入输出目录，拼成完整的可发布 Agent Skill 包——发布路径始终由框架派生（`publishPath`），你不手写：

```text
dist/skill/
├── SKILL.md                       # 总览：调用方式、流程总览、步骤详情
├── steps/
│   ├── 00-collect/step.md         # 每步一组文件：<NN>-<步id>/step.md
│   └── 01-review/step.md
└── references/
    └── substitution-test.md       # skill 级共享文档（组装脚本拷入派生路径）
```

`step.md` 里「文件引用」表印的是**发布路径**（`references/substitution-test.md`），不是你的源路径——消费侧读到的引用永远指向包内实存文件；派生冲突、断链在构建期即红。布局细节见[发布布局](concepts/publish-layout)。

## 为什么是这样：共用规则应该是模块

当你的 skill 出现这些征兆：**步骤越来越多、步骤之间有依赖、需要并行抓取/分析、产物文件一堆、共享规则在多个步骤重复**——手写 markdown 维护它，顺序、编号、路径迟早漂移成一场事故。

skillnomad 为这个场景而生：你只声明事实，框架推导其余。

写 markdown skill 时，共用规则无法模块化：一段规则想被三个步骤共用，只能靠路径引用——既不是 markdown 里有的能力，又不符合代码哲学。

skillnomad 的做法：**共用规则是模块，步骤引用的是符号名，路径是构建期的派生物**。

## 不适合的场景

- 单步知识问答（无链序，链推导零收益）。
- 产物散在对话里、无从建模（无实体依赖）。
- 严格串行无分支（步骤内控制流无处安放）。
- 一切字段全靠人写（推导无对象）。

## 下一步

- 发布布局与角色派生 → [发布布局](concepts/publish-layout)
- 模块化导入的完整语义 → [模块抽象](concepts/modules)
- 被规则顶到了，想知道凭什么 → [为什么是这些限制](decisions)
- 范式在真实管线里改变了什么 → [实例：构建与定向优化](case-study)
- 类型参考 → [API 参考](../api/types)
