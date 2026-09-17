import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Registry } from 'methodblocks';
import { blockModule, buildPipeline } from '../dist/index.js';
import { task } from '../dist/types/index.js';

// P2 结构校验（config.structure）：校验期跑 methodblocks check()，诊断计入失败汇总；
// 缺省不声明＝旧行为逐字不变。

const META = { name: 'structure-e2e', description: 'P2 structure hook' };
const CONTRACT_PATH = 'assets/common/mod.md';
const barrier = { checkItems: ['ok'], clarifyPrompt: '继续？', onConfirm: 'continue', onReject: 'rollback' };

function regClean() {
    return new Registry()
        .target('goal', '目标：把这件事按方法做完。')
        .useMethod('steps', '动作：\n1. 第一步。\n2. 第二步。')
        .example('sample', '例子：上次那单——A 处 3 分钟；结论取 A。', 'steps');
}
const cleanBody = [{ target: 'goal' }, { useMethod: 'steps' }, { example: 'sample' }];

const STEP = {
    id: 'a',
    title: 'A',
    description: '单步最小管线',
    body: 'do a',
    graph: task({ id: 'a-task', label: 'A', type: 'agent', body: 'do a' }),
    reads: [{ path: CONTRACT_PATH, as: 'contract', description: '模块 A 契约' }],
    writes: [{ path: '{workDir}/a.md', description: 'a 产物' }],
    barrier,
};
const REGISTRY_PLAIN = [
    { id: 'c1', kind: 'data', path: CONTRACT_PATH, description: '普通条目', scope: 'skill' },
];
const REGISTRY = [
    { id: 'c1', kind: 'data', path: CONTRACT_PATH, description: '模块 A', scope: 'skill', module: 'mod-a' },
];

function build({ modules, structure, registry = REGISTRY_PLAIN } = {}) {
    const out = mkdtempSync(join(tmpdir(), 'skillnomad-structure-'));
    try {
        return { out, result: buildPipeline([STEP], out, META, registry, undefined, modules, structure) };
    } catch (e) {
        rmSync(out, { recursive: true, force: true });
        throw e;
    }
}

test('结构校验：缺省不声明＝行为不变（通过）', () => {
    const { out } = build();
    rmSync(out, { recursive: true, force: true });
});

test('结构校验：干净块文档 → 通过', () => {
    const { out } = build({ structure: { docs: [{ id: 'doc-a', registry: regClean(), body: cleanBody }] } });
    rmSync(out, { recursive: true, force: true });
});

test('结构红：引用缺席 → 计入失败汇总（1 error）', () => {
    assert.throws(
        () => build({ structure: { docs: [{ id: 'doc-a', registry: regClean(), body: [{ target: 'ghost' }] }] } }),
        /Validation failed with 1 error/,
    );
});

test('结构红：同块双发布（references 与 body 撞）→ 1 error', () => {
    assert.throws(
        () => build({
            structure: {
                docs: [{ id: 'doc-a', registry: regClean(), body: cleanBody, references: [{ target: 'goal' }] }],
            },
        }),
        /Validation failed with 1 error/,
    );
});

test('组合：blockModule 模块进产物附录 ＋ 同一块集过结构校验（e2e）', () => {
    const { out } = build({
        modules: [blockModule({ id: 'mod-a', registry: regClean(), body: cleanBody })],
        structure: { docs: [{ id: 'doc-a', registry: regClean(), body: cleanBody }] },
        registry: REGISTRY,
    });
    try {
        const md = readFileSync(join(out, 'processes', '00-a.md'), 'utf8');
        assert.match(md, /^## 模块附录$/m);
        assert.ok(md.includes('目标：把这件事按方法做完。'));
        assert.ok(md.includes('<!-- module:mod-a -->'));
    } finally {
        rmSync(out, { recursive: true, force: true });
    }
});
