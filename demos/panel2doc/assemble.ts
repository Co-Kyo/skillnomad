// 组装：框架构建的文本 ＋ 登记在册的随包文件 → 一个可分发的 skill 包。
//
// 为什么要这一步：框架构建产出呈现层（SKILL.md ＋ steps/ ＋ 清单），
// 正文引用的 references/ 原文件不在框架构建的搬运范围内——消费仓走的是同一条路
// （projects/sp-skill-dev/scripts/assemble-release.ts）。这里用框架公开的派生函数
// publishPath 算出发布路径：作者依然一个发布路径都不写。
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PUBLISH_DIRS, publishPath } from 'skillnomad';

import { contracts } from './src/contracts.ts';

const OUT = './release';   // 最终包（框架构建产物 ./out 的上层）

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// 1) 呈现层：框架构建的东西整体进包
cpSync('./out/SKILL.md', join(OUT, 'SKILL.md'));
cpSync(join('./out', PUBLISH_DIRS.steps), join(OUT, PUBLISH_DIRS.steps), { recursive: true });

// 2) 随包文件：发布路径由 publishPath 按角色派生
//    （本 demo 的契约都是 skill 级，publishPath 不需要步序号）
const seqOf = () => undefined;
for (const c of contracts) {
    const target = publishPath({ path: c.path, scope: c.scope }, seqOf);
    if (!target) throw new Error('无法派生发布路径：' + c.id);
    mkdirSync(dirname(join(OUT, target)), { recursive: true });
    cpSync(c.path, join(OUT, target));
    console.log('  ✓ ' + c.path + ' -> ' + target);
}

console.log('组装完成 → ' + OUT);
