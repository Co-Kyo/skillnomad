---
layout: home

hero:
  name: skillnomad
  text: 让长流程 skill 的每个局部都可被单独审视
  tagline: 把一条长流程拆成依赖清晰、边界明确的局部——每个局部可独立扫描、独立优化、独立验证。声明事实，框架推导其余（顺序、编号、路径、发布布局），正是为了让拆分可靠到值得你逐块打磨。
  actions:
    - theme: brand
      text: 快速上手
      link: /guide/quickstart
    - theme: alt
      text: 核心契约
      link: /guide/contract

features:
  - title: 局部可扫描
    details: 依赖拆分后，每一步有独立产物切面（steps/<NN>-<id>/step.md）、每个内容包可一行命令取出正文——把整篇长文拆成你能逐块读、逐块评的单元。
  - title: 局部可定向优化
    details: 改一个局部的散文，重建后 diff 只落在这一步，其余逐字不变；改动可归因、可回退，优化才有落点。
  - title: 拆分由框架保证一致
    details: 声明事实，框架推导其余——顺序、编号、区间、产物路径、发布布局全部派生；拆分的边界由构建期校验守住，不会悄悄漂移。
  - title: 组装质量可机检
    details: 章节不缺、引用可解析、注入不矛盾、派生不错位——框架保证"呈现忠实于声明"。语义与散文的好坏由你用什么技术评决定，框架只负责让每个局部值得被评。
  - title: 一个包承载全部
    details: npm install skillnomad -D 一条命令。step builder、类型、校验、发布布局、内容包装载器，全在这一个包里。
---


## 生成之后，你的 skill 怎么活得下去

如果你不打算从零手写 skill——AI 帮你生成之后的事，从这一段开始。

活得下去，不只是不坏：是这条长流程被拆成依赖清晰、边界明确的局部之后，**每个局部你都能单独拿出来看、单独改、单独验**——质量优化才有落点。框架负责把拆分的一致性守住（组装质量），你用什么手段评局部的好坏（语义质量），是你的技术选择。

## 你要做什么，从哪读起

| 你现在的任务 | 读这页 | 读完你得到 |
| :--- | :--- | :--- |
| 判断值不值得上框架 | [为什么需要 skillnomad](guide/why) | 适合/不适合的判据＋一个实测案例 |
| 跑通第一个管道 | [快速上手](guide/quickstart) | 一个可构建的示例工程 |
| 把存量 markdown skill 迁进来 | [转化手册](guide/conversion) | 六步操作清单 |
| 对某一步做质量扫描与定向优化 | [案例交代](guide/case-study) | 最小评估回路的实跑操作 |
| 写得更准、调运行时表现 | [调优指南](guide/tuning) | 权重与案例的手法 |
| 发布成标准 skill 包 | [发布布局](guide/concepts/publish-layout) | 角色→路径的派生规则 |
| 查某个 API 的签名与字段 | [API 导览](api/types) | 按任务分组的完整参考 |
| 想知道"为什么这样设计" | [设计裁定与不走的路](guide/decisions) | 每条边界的事故与触发条件 |

![skillnomad 顶层叙事：AI 负责写得出来，我们负责活得下去](/svg/hero-narrative.svg)

<script setup>
import { withBase } from 'vitepress'
</script>

<p style="text-align:center;margin-top:6px">
  <a :href="withBase('/guide/why')">为什么需要 skillnomad →</a>
</p>
