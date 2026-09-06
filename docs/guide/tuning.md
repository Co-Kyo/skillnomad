# 调优指南（权重经验与案例）

> 适用：已跑通[转化手册](conversion)的进阶者——skill 能跑，但运行时表现不佳（顺序漂移、门禁松紧不对、格式无人参照）时回来查。
> 新手先去[快速上手](quickstart)；"别做什么"去[顶层引导与反模式](anti-patterns)。
> 口径声明：位置/篇幅权重均为经验法则（首尾显著高于中间，非单调；细节须结构化，堆字数反稀释注意力），非机制断言；权重断言须挂实测证据（改前改后产物 diff 或测试）。

## 两方向总览

| 方向 | 何时用 | 在 skillnomad 里调什么 |
|---|---|---|
| 调权重 | 行为漂移（顺序/密度/门禁松紧不对） | `detail`/`section`/`taskTemplate` 顺序与篇幅、`verify` 条数 |
| 加案例 | 缺格式参照（agent 不知道输出长什么样） | decision 示例、`taskTemplate` 内示例、schema 示例值、barrier 文案 |

## 调权重三手法

### 手法 1——section 调用顺序即渲染顺序

`section()` 按调用序写入（`builder.ts`），框架按序渲染 `## 节名`。把最希望 agent 优先读到的约束 section 调到 `.detail()` 后第一位；大 Schema 节沉底。

### 手法 2——篇幅差异即权重差异

`taskTemplate`/`detail` 原样渲染，行数≈产物篇幅。收敛者模板 27 行天然重于维度模板 6 行；要降权就拆小节或删例，要加权就加行——别堆字数，细节须结构化。

### 手法 3——verify 条数即严格程度

`verify()` 逐条渲染为"校验清单"，`onFail` 渲染为"失败处理"。加一条 `verify.field(...)` 既加清单一行篇幅，也加运行时一道门；收紧门禁优先加 verify，不在正文里喊话。

## 加案例四槽位

案例只写进内容模块一处，步骤符号引用；要共享的案例上收 skill 级模块，私有案例留在步骤内。

| 槽位 | 实例 |
|---|---|
| taskTemplate 内示例/枚举值 | 字段清单、读取清单、拦截词表 |
| schema 示例值 | JSON 块示例值、`schemas.md` 完整示例节 |
| barrier 文案 | checkItems＋clarifyPrompt 即行为样本 |
| doAction 内容 | flow 内动作文本样本 |

## isExample 端到端实例

decision 示例块加 `isExample: true`（类型层语义单真相源）→ 渲染分支加示例区块标注（md＋JSON manifest 双路径透传）→ 消费侧"（示例）"字样降级保留。缺席（undefined/false）即事实，产物逐字不变。

## 不写清单

- Judge/EDD 另立项（语义层评估，非本指南范围）。
- 权重断言无实测证据的不写（手段红线）。
