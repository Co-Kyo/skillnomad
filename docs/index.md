---
layout: home

hero:
  name: skillnomad
  text: 把 Markdown skill 的抽象写进代码
  tagline: 声明事实，框架推导其余 —— 顺序、编号、区间、调度策略、产物路径，全部由框架从你的声明派生。
  actions:
    - theme: brand
      text: 快速上手
      link: /guide/quickstart
    - theme: alt
      text: 类型参考
      link: /api/types

features:
  - title: 单包单源
    details: npm install skillnomad -D 一条命令。step builder、类型、校验统一从一个包出（8.17 API 表面收敛）。
  - title: 模块抽象
    details: 内容模块用符号名注册引用，归属由声明层决定（SkillModule / StepModule），路径只是渲染载体（8.15）。
  - title: 产物路径投射
    details: 路径是业务顶层的投射物——实体声明 + 概念引用，步骤层零路径字面量（8.16）。
  - title: 调度策略
    details: 并发 / 窗口 / 分批是 skill 级一等公民声明，步骤不再各自登记（8.13/8.14）。
---
