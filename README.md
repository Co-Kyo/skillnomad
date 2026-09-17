# skillnomad

LLM 可执行 Markdown Skill 管线的打包工具：声明步骤与产出，构建成一份 agent 能照着做的产物。

## 安装

```bash
npm install -D skillnomad
```

**只需这一个包。** 类型、校验、构建全部在包内（`src/types/`、`src/check/`、`src/compiler/`）；`skillnomad validate <pipeline-file>` 做管线完整性校验。另见 `docs/guide/toolchain.md`（官方工具组合）。

## 使用

```bash
npx skillnomad build skillnomad.config.ts
```

`skillnomad.config.ts` 默认指向当前目录下的配置文件：

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

校验机制由独立项目 [markrefs](https://github.com/Co-Kyo/markrefs) 提供；主包只做接线，消费侧只依赖 `skillnomad`。

## 文档

- 快速上手：`docs/guide/quickstart.md`
- 契约与口径：`docs/guide/contract.md`
- 完整文档站：见仓库 `docs/`

## License

MIT
