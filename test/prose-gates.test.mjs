import assert from 'node:assert/strict';
import test from 'node:test';
import { renderStep, scanMetaDiscourse, scanMarkerDuplication } from '../dist/index.js';

// 散文质量门回归（2026-09-19 产物散文审计后补）：扫描器行为与"判据由调用方给"分工。

const files = [
    { rel: 'steps/02-brainstorm/step.md', content: '正常行\n> 本节由构建期渲染生成，为执行用正本。\n- metrics（示例）: 命题（示例）=10\n' },
    { rel: 'SKILL.md', content: '干净文本，无命中。\n' },
];

test('scanMetaDiscourse：黑名单命中逐条报位（rel/line/token）', () => {
    const hits = scanMetaDiscourse(files, ['构建期渲染', '执行用正本']);
    assert.deepEqual(
        hits.map(h => `${h.rel}:${h.line}:${h.token}`),
        ['steps/02-brainstorm/step.md:2:构建期渲染', 'steps/02-brainstorm/step.md:2:执行用正本'],
    );
});

test('scanMetaDiscourse：空黑名单/空文本零命中', () => {
    assert.deepEqual(scanMetaDiscourse(files, []), []);
    assert.deepEqual(scanMetaDiscourse([{ rel: 'a', content: '' }], ['x']), []);
});

test('scanMarkerDuplication：同行 ≥2 次同标记报，1 次不报', () => {
    const hits = scanMarkerDuplication(files, ['（示例）']);
    assert.deepEqual(hits, [{ rel: 'steps/02-brainstorm/step.md', line: 3, token: '（示例）' }]);
});

test('scanMarkerDuplication：跨行累计不算（逐行判）', () => {
    const cross = [{ rel: 'x.md', content: 'a（示例）\nb（示例）\n' }];
    assert.deepEqual(scanMarkerDuplication(cross, ['（示例）']), []);
});

// 框架自家产物先过自家门（contract「承诺什么」第 2 条的证据）：
// 渲染器注入的全部话术不得命中元话语黑名单／标记叠加——否则框架自己就在制造违约。
test('框架渲染产物自证：注入文本过散文门', () => {
    const step = {
        id: 'demo-step',
        title: '演示步骤',
        description: '演示描述',
        seq: 4,
        reads: [{ path: 'src/rules/shared.md', description: '共享规则', as: 'contract' }],
        writes: [{ path: '{workDir}/.meta/out.json', description: '产出' }],
        graph: { kind: 'seq', id: 'g', label: 'g', nodes: [] },
        plugins: ['year-granularity'],
        barrier: { checkItems: ['覆盖数'], clarifyPrompt: '请确认。', onConfirm: 'continue', onReject: 'rollback' },
        decisionSummary: {
            gateType: 'human_gate',
            title: '需求网确认',
            isExample: true,
            metrics: [{ id: 'p', label: '命题（示例）', value: '10', detail: '示例' }],
            selection: { unit: '需求网命题', summary: '示例：10/10 已选', total: 10, selected: 10 },
            barrier_summary: '示例值——命题 10。',
        },
    };
    const order = { 'demo-step': 4 };
    const registry = [{ id: 'shared', kind: 'policy', path: 'src/rules/shared.md', description: '共享规则', scope: 'skill', module: 'shared-methods' }];
    const contents = { 'shared-methods': '# 共享方法论\n\n通用做法。' };
    const md = renderStep(step, order, { registry, contents, published: new Map() });
    const files = [{ rel: 'step.md', content: md }];
    // 黑名单＝调用方典型口径（构建过程话术）；框架注入文本不得命中
    const blacklist = ['构建期渲染', '构建时渲染', 'manifest 锁定', '版本随产物', '发布形态', '框架按角色派生'];
    assert.deepEqual(scanMetaDiscourse(files, blacklist), [], `框架注入命中元话语黑名单：${JSON.stringify(scanMetaDiscourse(files, blacklist))}`);
    // 标记叠加：行级"（示例）"撤除后，框架不再叠加；数据自带一层不算框架责任（调用方数据问题）
    const dupHits = scanMarkerDuplication(files, ['【示例】']);
    assert.deepEqual(dupHits, [], `框架注入命中标记叠加：${JSON.stringify(dupHits)}`);
});
