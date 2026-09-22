# 版本线

> **写给谁**：准备升级或首次安装的人。当前该用什么 → 本页；为什么长成这样 → [为什么是这些限制](guide/decisions)。

> 当前版本：**0.2.3**（latest）。后续变更以 [CHANGELOG](https://github.com/Co-Kyo/skillnomad/releases) 实际发布为准，本文不预告未发布版本。

## 安装

```bash
npm install -D skillnomad
```

`skillnomad` 一个包承载全部：step builder、类型、校验、发布布局派生、内容包装载器、CLI（公开面清单由快照测试锁定，增删即构建红）。

## 框架形态（当前）

- **一个包**：所有公开能力从 `skillnomad` 导入。
- **一条写作路径**：`step()` 链式声明 ＋ `createSkillFromModel` 装配，别无二路。
- **零调度**：框架不承载调度策略；步骤内并行/分批/分支用 flow 声明（`.parallel()` / `.map()` / `.branch()` / `.loop()`），顶层步骤是线性链。
- **发布布局派生**：产物按 `steps/<NN>-<id>/step.md` 组织；随包文件按角色（skill 级 / step 级归属）派生到 `steps/`、`references/`、`assets/`、`scripts/`，消费侧不写发布路径。

## semver 口径

0.x 阶段：minor 即可包含破坏性变更；**契约冻结发生在 1.0**。升级风险逐条以 CHANGELOG 为准。
