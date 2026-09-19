---
layout: home

hero:
  name: skillnomad
  text: 为长流程管道型 skill 开发而生
  tagline: 把 Markdown skill 的抽象写进代码——声明事实，框架推导其余：顺序、编号、区间、产物路径、发布布局，全部由框架从你的声明派生。
  actions:
    - theme: brand
      text: 快速上手
      link: /guide/quickstart
    - theme: alt
      text: 核心契约
      link: /guide/contract

features:
  - title: TypeScript 优先
    details: TypeScript 编写，类型定义随包发布——step builder 的补全与编译期报错，就是第一层文档。
  - title: 一个包承载全部
    details: npm install skillnomad -D 一条命令。step builder、类型、校验、发布布局、内容包装载器，全在这一个包里。
  - title: 模块抽象
    details: 内容模块用符号名注册引用，归属由声明层决定（SkillModule / StepModule），路径只是渲染载体。
  - title: 产物路径投射
    details: 路径是业务顶层的投射物——实体声明 + 用户侧 refOf helper，步骤层零路径字面量。
  - title: 发布布局派生
    details: 消费者只声明角色（skill 级 / step 级归属），框架派生发布路径：steps/<NN>-<id>/ 与 references/、assets/，布局错了构建即红。
---


## 生成之后，你的 skill 怎么活得下去

如果你不打算从零手写 skill——AI 帮你生成之后的事，从这一段开始。

## 你要做什么，从哪读起

| 你现在的任务 | 读这页 | 读完你得到 |
| :--- | :--- | :--- |
| 判断值不值得上框架 | [为什么需要 skillnomad](guide/why) | 适合/不适合的判据＋一个实测案例 |
| 跑通第一个管道 | [快速上手](guide/quickstart) | 一个可构建的示例工程 |
| 把存量 markdown skill 迁进来 | [转化手册](guide/conversion) | 六步操作清单 |
| 写得更准、调运行时表现 | [调优指南](guide/tuning) | 权重与案例的手法 |
| 发布成标准 skill 包 | [发布布局](guide/concepts/publish-layout) | 角色→路径的派生规则 |
| 查某个 API 的签名与字段 | [API 导览](api/types) | 按任务分组的完整参考 |
| 想知道"为什么这样设计" | [设计裁定与不走的路](guide/decisions) | 每条边界的事故与触发条件 |
| 想看范式在真实长管线里的样子 | [案例交代](guide/case-study) | 源码结构、逐步评估回路、可复算数字 |

![skillnomad 顶层叙事：AI 负责写得出来，我们负责活得下去](/svg/hero-narrative.svg)

<script setup>
import { withBase } from 'vitepress'
</script>

<p style="text-align:center;margin-top:6px">
  <a :href="withBase('/guide/why')">为什么需要 skillnomad →</a>
</p>
