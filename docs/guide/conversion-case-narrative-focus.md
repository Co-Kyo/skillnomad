# 对照案例 · narrative-focus 转化（第二案例，2026-09-06）

> before：纯 markdown skill（SKILL.md 87 行 + references 3 文件），双模式流程靠文字约束执行。
> after：skillnomad 管道（单步骤 + branch 双模式 + map 并行标注 + barrier 用户检查点），构建期校验，产物 7 文件。
> 位置：上游仓 `port/skillnomad` 分支（github.com/Co-Kyo/narrative-focus-skill，分支 `57e4f6a`）。

| 转化前（markdown） | 转化后（skillnomad 声明） |
|---|---|
| 双模式流程写在 SKILL.md 正文，靠模型自觉遵守 | `branch('mode-select', 条件, Mode1-map, Mode2-task)` 构建期定形 |
| 共享规则（替代测试）在 references/ 靠路径引用 | `assets/common/` + `contracts` 注册表，构建期校验引用一致性 |
| 用户检查点靠正文 ⚠️ 提示 | `barrier: {checkItems, clarifyPrompt, onConfirm, onReject}` 渲染为 Barrier 章节 |
| 中间产物（标注表/检测报告/修正记录/二次校验）无契约 | `entities` 4 条声明 + `refOf` 符号名引用，步骤层零路径字面量 |
| 语义忠实 | 双模式分支/检查点 Barrier/角色标签 A-T-C 全部在位（presence 核验通过） |


