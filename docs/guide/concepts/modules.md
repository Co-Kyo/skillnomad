# 概念：模块抽象（8.15）

> 从「文件路径引用」到「模块符号引用」——内容模块的归属与可见性由**声明层**决定，路径只是渲染载体。

## 模块是什么

一个 skill 里的可复用内容有两类：

| 类型 | 归属 | 谁可以引用 |
| :--- | :--- | :--- |
| **SkillModule（skill 级）** | 整个 skill | 所有步骤（共享规则，如替代测试、信源分级）|
| **StepModule（step 级）** | 单个步骤 | 只有归属步骤（步骤私有资产）|

## 注册表与校验

模块在 `contracts` 注册表中登记：

```ts
export const contracts = [
  { id: 'substitution-test', kind: 'policy', path: 'assets/common/substitution-test.md', scope: 'skill' },
  { id: 'barrier-check', kind: 'policy', path: 'assets/01-brainstorm/barrier-check.md', scope: 'step', step: 'brainstorm' },
];
```

构建期由 `validateModuleUsage` 校验两条：

- **V1 角色 × 归属一致性**：`as: 'contract'` 的引用必须指向 skill 级条目
- **V2 私有可见性**：step 级模块被跨步引用 → 构建期报错，**不会静默放行**

> 8.15 之前这是「路径启发式」校验（路径重复/前缀猜测），8.15 升级为**声明式判定**——归属写在注册表里，校验查表而非猜路径。

## 符号名引用（不是路径）

步骤引用模块用**符号名**：

```ts
.reads({ ...modules.substitutionTest, as: 'rule' })   // ✅ 符号名
// ❌ 不用：reads({ path: 'assets/common/substitution-test.md' })
```

路径只存在于 `modules` 表（或产物实体）——8.16 之后连 `{workDir}` 字面量都从步骤层消失了。
