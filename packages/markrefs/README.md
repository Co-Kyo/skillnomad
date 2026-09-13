# markrefs

Markdown 交叉引用解析与校验（最小核心）：名字→路径、目标存在性、重复声明。

独立项目：独立版本线、独立发版（`markrefs-v*` tag → `Release markrefs` 工作流）；skillnomad 是消费者之一，以 dependency 引用已发布版本。

**只对 markdown 负责**——不做业务语义判断：名字与 `scope` 对 markrefs 都是**不透明字符串**；位置只以 `file[:line[:col]]` 表达；输入是声明式引用（`RefDecl`）与注入式名字表（`KeyMap`），核心**不解析任何载体**（零运行时依赖）。

## 用法

```sh
markrefs check --keys keys.json --refs refs.json [--strict] [--format text|json]
```

- 退出码：`0`＝无 error（`--strict` 下无 warn）；`1`＝有 error（`--strict` 下含 warn）；`2`＝用法/输入错误。
- 输入：`keys.json` 为 `{ "entries": [{ "name", "path", "scope?", "site?" }] }`；`refs.json` 为 `{ "refs": [{ "site", "name?|path?", "fragment?", "dynamic?", "wildcard?" }] }`。

## 规则（P0）

| ruleId | 触发 | 级别 |
|---|---|---|
| `missing-key` | 引用的名字不在表中 | error |
| `missing-target` | 解析出的路径在文件系统不存在 | error |
| `duplicate-key` | 同一名字、同 scope 两条定义 | error（跨 scope＝warn） |
| `duplicate-path` | 同 scope 两名指向同一路径 | warn |
| `duplicate-decl` | 同一声明源文件内、同一 `path#fragment` 两次 | error |

片段（`#xxx`）在 P0 只透传；孤儿检查按"入口可达性＋豁免"留待后续阶段。

## 库用法

```ts
import { resolve, validate } from 'markrefs';

const keys = { entries: [{ name: 'alpha', path: 'docs/a.md' }] };
resolve({ site: 'src/x.ts:1', name: 'alpha' }, keys); // -> { path: 'docs/a.md', key: 'alpha' }

const diagnostics = validate(
  [{ site: 'src/x.ts:1', name: 'alpha' }],
  keys,
  { exists: () => true },
);
```
