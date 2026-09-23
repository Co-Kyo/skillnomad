# demos

一个 demo 一个目录，各自独立：自带 `package.json`，就地 `npm install` 就能跑，不依赖仓内其他位置。
demo 消费的 skillnomad 与 npm 发布版同版本——和外部作者拿到的是同一环境。

| demo | 这个 skill 管什么场景 | 这个 demo 演示什么 |
| --- | --- | --- |
| [panel2doc](./panel2doc/) | 多视角讨论并输出报告：三个角色的 subagent 并行讨论同一个问题，收敛成分歧表，再按四段标准写成决策文档 | skillnomad 的最小两步链：并行扇出与收敛（`.parallel`）、跨步骤数据传递（上一步 `writes` ＝ 下一步 `reads`）、随包文档（contract 登记 → 发布路径由框架派生）、每步检查点（`.checkpoint`） |

## 跑任意一个 demo

```bash
cd demos/panel2doc
npm install
npm run build       # 框架构建 → ./out/
npm run assemble    # 组装发布包 → ./release/（本 demo 特有的一步）
npm run typecheck   # 类型门
```

产物不入库（`out/`、`release/`、`node_modules/` 均在 `.gitignore`）。
每个 demo 目录内的 README 讲它自己的细节：panel2doc 那份附带**同一 skill 两种写法**的逐行对照。
