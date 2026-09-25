# skillnomad

把声明在 TypeScript 里的长流程 skill 构建成 agent 能照着做的产物：步骤、产出与随包文件由你声明，顺序、编号、路径、发布布局由框架推导；依赖管理覆盖到产物文本——开启 `shipAssets` 随包搬运后，正文引用的文件，构建验证它真的在包里。

## 安装

```bash
npm install -D skillnomad
```

**只需这一个包。** 类型、校验、构建全部在包内（`dist/types/`、`dist/check/`、`dist/compiler/`）；`skillnomad validate <pipeline-file>` 做管线完整性校验。另见 [官方工具组合](https://co-kyo.github.io/skillnomad/guide/toolchain.html)。

## 使用

```bash
npx skillnomad build skillnomad.config.ts
```

（需 Node ≥ 22.18；CLI 启动时检查版本，不满足会说明当前版本与要求）

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
