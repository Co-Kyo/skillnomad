import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMdRefs, inspectMdDeps } from '../dist/index.js';

// 宿主侧适配层单测：site 捕获（跳包装层）+ 计数分层 + 宿主级问题（漂移/未接线）。

const here = dirname(fileURLToPath(import.meta.url));
const bridgeDir = join(here, 'fixtures', 'md-deps-bridge');
const selfLines = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
const lineOf = (marker) => selfLines.findIndex((line) => line.includes(marker)) + 1;

function helper(refs, name) {
    refs.ref(name, 'docs/a.md');
}

test('site 捕获：默认跳一层包装，落在 helper 的调用点（行号可核）', () => {
    const refs = createMdRefs();
    helper(refs, 'alpha'); // site-anchor-a
    helper(refs, 'beta'); // site-anchor-b

    const snapshot = refs.snapshot();
    assert.equal(snapshot.length, 2);
    assert.match(snapshot[0].site, new RegExp(`md-deps-bridge\\.test\\.mjs:${lineOf('site-anchor-a')}:\\d+$`));
    assert.match(snapshot[1].site, new RegExp(`md-deps-bridge\\.test\\.mjs:${lineOf('site-anchor-b')}:\\d+$`));
    assert.notEqual(snapshot[0].site, snapshot[1].site);

    const direct = createMdRefs({ siteDepth: 0 });
    direct.refPath('docs/a.md'); // site-anchor-c
    assert.match(direct.snapshot()[0].site, new RegExp(`:${lineOf('site-anchor-c')}:\\d+$`));
});

function inspect(overrides = {}) {
    const refs = createMdRefs();
    refs.ref('alpha', 'docs/a.md'); // 正常
    refs.ref('beta', 'docs/a.md'); // 键表说 docs/other.md → 宿主级漂移
    refs.ref('nope', 'docs/a.md'); // missing-key
    refs.refPath('docs/missing.md'); // missing-target
    refs.refPath('{workDir}/.meta/x.json'); // 模板路径 → 跳过存在性
    const keys = {
        entries: [
            { name: 'alpha', path: 'docs/a.md', scope: 'entity', site: 'keys' },
            { name: 'beta', path: 'docs/other.md', scope: 'entity', site: 'keys' },
            { name: 'alphaAlias', path: 'docs/a.md', scope: 'entity', site: 'keys' },
        ],
    };
    return inspectMdDeps({ keys, refs, ...overrides }, { cwd: bridgeDir });
}

test('inspectMdDeps：计数（判存在性/模板跳过）＋诊断＋宿主级问题分层', () => {
    const report = inspect();
    assert.deepEqual(report.counts, { total: 5, checked: 4, skipped: 1 });
    assert.deepEqual(
        report.diagnostics.map((diagnostic) => diagnostic.ruleId).sort(),
        ['duplicate-path', 'missing-key', 'missing-target'],
    );
    assert.equal(report.blocking.length, 2, '默认只拦 error：missing-key / missing-target');
    assert.equal(report.problems.length, 1);
    assert.match(report.problems[0], /名字与本地路径不一致：beta/);
});

test('strict：warn（duplicate-path）也计入阻断', () => {
    assert.equal(inspect({ strict: true }).blocking.length, 3);
});

test('键表已声明但零引用 → 宿主级问题（防静默未接线）', () => {
    const refs = createMdRefs();
    const report = inspectMdDeps(
        { keys: { entries: [{ name: 'alpha', path: 'docs/a.md' }] }, refs },
        { cwd: bridgeDir },
    );
    assert.equal(report.counts.total, 0);
    assert.match(report.problems.join('\n'), /未收集到引用/);
});
