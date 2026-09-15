import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPipeline } from '../dist/index.js';
import { task } from 'skillnomad-types';

// D35 全链路 · V4 接线：modules 注册表 → 构建期校验（id 唯一／deps 无环／引用在册）。
// 缺省参数＝旧行为逐字不变（向后兼容）。

const META = { name: 'module-wiring', description: 'D35 V4 wiring' };
const barrier = { checkItems: ['ok'], clarifyPrompt: '继续？', onConfirm: 'continue', onReject: 'rollback' };
const STEP = {
    id: 'a',
    title: 'A',
    description: '单步最小管线',
    body: 'do a',
    graph: task({ id: 'a-task', label: 'A', type: 'agent', body: 'do a' }),
    reads: [],
    writes: [{ path: '{workDir}/a.md', description: 'a 产物' }],
    barrier,
};

const mod = (id, deps) => ({ id, kind: 'data', render: () => '', ...(deps ? { deps } : {}) });

function build(modules, registry = []) {
    const out = mkdtempSync(join(tmpdir(), 'skillnomad-wiring-'));
    try {
        return buildPipeline([STEP], out, META, registry, undefined, modules);
    } finally {
        rmSync(out, { recursive: true, force: true });
    }
}

test('V4 接线：modules 缺席＝旧行为（向后兼容）', () => {
    assert.doesNotThrow(() => build(undefined));
});

test('V4 接线：合法注册表通过', () => {
    assert.doesNotThrow(() => build([mod('alpha'), mod('beta', ['alpha'])]));
});

test('V4 接线：重复 id 构建期红', () => {
    assert.throws(() => build([mod('dup'), mod('dup')]), /Validation failed with 1 error/);
});

test('V4 接线：deps 环构建期红', () => {
    assert.throws(() => build([mod('x', ['y']), mod('y', ['x'])]), /Validation failed with 1 error/);
});

test('V4c：注册表引用未登记模块 id 构建期红', () => {
    const registry = [{ id: 'c1', kind: 'data', path: 'p.md', description: '', scope: 'skill', module: 'nope' }];
    assert.throws(() => build([mod('other')], registry), /Validation failed with 1 error/);
});
