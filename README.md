# skillnomad

LLM 可执行 Markdown Skill 管线的打包工具：声明步骤与产出，构建成一份 agent 能照着做的产物。

## 安装

```bash
npm install -D skillnomad
```

**只需这一个包。** 类型、校验、构建全部在包内（`dist/types/`、`dist/check/`、`dist/compiler/`）；`skillnomad validate <pipeline-file>` 做管线完整性校验。另见 [官方工具组合](https://co-kyo.github.io/skillnomad/guide/toolchain.html)。

## 使用

```bash
npx skillnomad build skillnomad.config.ts
```

（裸跑需 Node ≥ 22.18；更早版本用 `npx tsx node_modules/skillnomad/dist/bin/cli.js build skillnomad.config.ts`）

`skillnomad build` 不带参数时，默认读当前目录下的 `skillnomad.config.ts`：

```ts
import { defineConfig } from 'skillnomad';

export default defineConfig({
  skill: './skill.ts',
  outputDir: './dist/skill',
});
```

## 可选：构建期 markdown 交叉引用校验

在配置里声明名字表与引用登记后，构建期会校验引用（名字在表、目标存在、重复声明），诊断直指调用点 `file:line`：

```ts
import { defineConfig, createRefs } from 'skillnomad';

const refs = createRefs();

export default defineConfig({
  skill: './skill.ts',
  outputDir: './dist/skill',
  markrefs: { keys: { entries: [{ name: 'guide', path: 'docs/guide.md' }] }, refs },
});
```

校验机制由独立项目 [markrefs](https://github.com/Co-Kyo/markrefs) 提供；本包只做接线，你只需依赖 `skillnomad`。

## 文档

- 快速上手：`docs/guide/quickstart.md`
- 契约与口径：https://co-kyo.github.io/skillnomad/guide/contract.html
- 完整文档站：https://co-kyo.github.io/skillnomad/

## License

MIT
