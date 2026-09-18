import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPipeline, renderStep } from '../dist/index.js';
import { task } from '../dist/types/index.js';

// D35 全链路 · 模块附录 e2e：模块 render() → 引用步骤的「模块附录」（双路径）＋引用表标注。
// 内容源是 render()，路径只是逻辑标识——不落盘、不读盘。
// 注：完整路径（无正文步骤）无法过 align 报告（要求 body），故走 renderStep 直调覆盖。

const META = { name: 'appendix-e2e', description: 'D35 module appendix e2e' };
const CONTRACT_PATH = 'assets/common/mod.md';
const REGISTRY = [
    { id: 'mod-a-contract', kind: 'data', path: CONTRACT_PATH, description: '模块 A', scope: 'skill', module: 'mod-a' },
];
const MODULES = [
    { id: 'mod-a', kind: 'data', version: '0.1.0', render: () => 'MODULE-RENDERED-CONTENT-A' },
];
const barrier = { checkItems: ['ok'], clarifyPrompt: '继续？', onConfirm: 'continue', onReject: 'rollback' };

const stepA = {
    id: 'a',
    title: 'A',
    description: '带正文步骤（早返路径）',
    body: 'do a',
    graph: task({ id: 'a-task', label: 'A', type: 'agent', body: 'do a' }),
    reads: [{ path: CONTRACT_PATH, as: 'contract', description: '模块 A 契约' }],
    writes: [{ path: '{workDir}/a.md', description: 'a 产物' }],
    barrier,
};

test('模块附录：早返路径（build 全链）渲染附录＋契约引用标注', () => {
    const out = mkdtempSync(join(tmpdir(), 'skillnomad-appendix-'));
    try {
        buildPipeline([stepA], out, META, REGISTRY, undefined, MODULES);
        const md = readFileSync(join(out, 'steps', '00-a', 'step.md'), 'utf8');
        assert.match(md, /^## 模块附录$/m);
        assert.ok(md.includes('MODULE-RENDERED-CONTENT-A'));
        assert.ok(md.includes('<!-- module:mod-a -->'));
        assert.ok(md.includes('（见附录：模块 `mod-a`）'));
        assert.ok(!existsSync(join(out, CONTRACT_PATH)), '模块内容应来自 render()，不落路径文件');
    } finally {
        rmSync(out, { recursive: true, force: true });
    }
});

test('模块附录：完整路径（renderStep 直调）同样渲染＋文件引用表标注', () => {
    const stepB = {
        id: 'b',
        seq: 2,
        title: 'B',
        description: '无正文步骤（完整路径）',
        dependsOn: 'a',
        graph: task({ id: 'b-task', label: 'B', type: 'agent', body: 'do b' }),
        reads: [{ path: CONTRACT_PATH, description: '模块 A 读取' }],
        writes: [{ path: '{workDir}/b.md', description: 'b 产物' }],
        barrier,
    };
    const md = renderStep(stepB, { a: 0, b: 1 }, { registry: REGISTRY, contents: { 'mod-a': 'MODULE-RENDERED-CONTENT-A' } });
    assert.match(md, /^## 模块附录$/m);
    assert.ok(md.includes('MODULE-RENDERED-CONTENT-A'));
    assert.ok(md.includes('| 读取 | （见附录：模块 `mod-a`） | 模块 A 读取 |'));
});

test('模块空内容：标注与附录同进退（不指向不存在的正本）', () => {
    const out = mkdtempSync(join(tmpdir(), 'skillnomad-appendix-'));
    try {
        const emptyModules = [{ id: 'mod-a', kind: 'data', render: () => '' }];
        buildPipeline([stepA], out, META, REGISTRY, undefined, emptyModules);
        const md = readFileSync(join(out, 'steps', '00-a', 'step.md'), 'utf8');
        assert.ok(!md.includes('模块附录'));
        assert.ok(!md.includes('（见附录：模块'));
    } finally {
        rmSync(out, { recursive: true, force: true });
    }
});

test('模块缺席：产物不含模块附录（旧行为逐字不变）', () => {
    const out = mkdtempSync(join(tmpdir(), 'skillnomad-appendix-'));
    try {
        const registryNoModule = [{ id: 'c-plain', kind: 'data', path: CONTRACT_PATH, description: '普通条目', scope: 'skill' }];
        const stepPlain = { ...stepA, reads: [{ path: CONTRACT_PATH, description: '普通读取' }] };
        buildPipeline([stepPlain], out, META, registryNoModule);
        const md = readFileSync(join(out, 'steps', '00-a', 'step.md'), 'utf8');
        assert.ok(!md.includes('模块附录'));
        assert.ok(!md.includes('（见附录：模块'));
    } finally {
        rmSync(out, { recursive: true, force: true });
    }
});
