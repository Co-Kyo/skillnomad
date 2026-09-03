首个稳定版 · 可信度里程碑：0.1.0 只承诺「默认安装即可用」，契约冻结在 1.0（0.x minor 仍可破坏）。M1-M5 五项指标全部达标，beta.9 之后无行为变化（validate CLI Windows 修复除外）。

> **定位**：0.1.0 不是功能里程碑，是**可信度里程碑**——五项指标全部是「兑现已说过的话」，没有新增功能。semver 口径：0.x 的 minor 即可包含破坏性变更；本版承诺仅「默认安装即可用」，**契约冻结发生在 1.0**（`0.2.0` 起仍可破坏性变更）。

**五项指标（M1-M5）全部达标**：

- **M1 安装面**：四包 + release-manifest 统一 0.1.0；`latest` dist-tag 自本版起首次指向正式版（此前停留 beta.1，默认安装落后 8 个版本）
- **M2 契约对账**：`contract.md` 12 条公开承诺逐条对账全绿（框架 45 测试 case + `skillnomad-validate` 独立入口实测）
- **M3 悬空清零**：第二用例 narrative-focus-port 归位（纳入版本控制）并升级至本版本
- **M4 形态反证**：`SourceRef.ref` 由第二用例以 **ref 声明模式**落地（`{ ref: 'name' }` + 领域 resolver），框架未解析防护正反用例 4/4 通过；与 sp-skill 的实体常量模式互为反证
- **M5 变更出口**：README 冻结点表述修正，升级风险判断口径唯一

**相对 v0.1.0-beta.9 的代码差异（诚实口径）**：

- fix(validate)：CLI 动态 import 改用 `pathToFileURL`——Windows 下裸绝对路径报 `protocol 'c:'`（与主包 CLI 同法）
- types 注释口径清理（移除内部裁定编号）
- 版本号统一 0.1.0

从 beta.9 升级无行为变化（validate CLI 修复除外）；从更早版本升级请逐条查阅 beta.1 → beta.9 各节。