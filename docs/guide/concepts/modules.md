# 概念：模块抽象

> **写给谁**：共享规则开始被多个步骤重复引用的作者。刚上手先看[快速上手](../quickstart)。

> 从「文件路径引用」到「模块符号引用」——内容模块的归属与可见性由**声明层**决定，路径只是渲染载体。

## 模块是什么

一个 skill 里的可复用内容有两类：

| 类型 | 归属 | 谁可以引用 |
| :--- | :--- | :--- |
| **SkillModule（skill 级）** | 整个 skill | 所有步骤（共享规则，如替代测试、信源分级）|
| **StepModule（step 级）** | 单个步骤 | 只有归属步骤（步骤私有资产）|

## 注册表与校验

模块在 `contracts` 注册表中登记。除归属（`scope`）外，这条登记还是**发布布局的角色声明**——源路径放哪自由，发布位置由框架按角色派生（见[发布布局](publish-layout)）：

```ts
export const contracts = [
  { id: 'substitution-test', kind: 'policy', path: 'src/rules/substitution-test.md', scope: 'skill' },
  { id: 'barrier-check', kind: 'policy', path: 'src/brainstorm/barrier-check.md', scope: 'step', step: 'brainstorm' },
];
```

构建期校验两条：

- **V1 角色 × 归属一致性**：`as: 'contract'` 的引用必须指向 skill 级条目
- **V2 私有可见性**：step 级模块被跨步引用 → 构建期报错，**不会静默放行**

## 符号名引用（不是路径）

步骤引用模块用**符号名**：

```ts
.reads({ ...modules.substitutionTest, as: 'rule' })   // ✅ 符号名
// ❌ 不用：在步骤里手写发布路径（references/…／assets/… 是派生物）
```

路径只存在于 `modules` 表（或产物实体）——实体投射之后连 `{workDir}` 字面量都从步骤层消失了。

## 下一步

- 模块怎么进发布物 → [发布布局](publish-layout)
- 内容包（声明式模块）→ [官方工具组合](../toolchain) · [API 导览](../../api/types)
