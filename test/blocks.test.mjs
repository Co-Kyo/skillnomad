import assert from 'node:assert/strict';
import test from 'node:test';
import { Registry, doc } from 'methodblocks';
import { blockModule } from '../dist/index.js';

// P2 适配器：块集 → SourceModule（内容源）。判据归 methodblocks，接入归框架。

function reg() {
    return new Registry()
        .target('goal', '目标：把这件事按方法做完，给出可复核的结论。')
        .useMethod('steps', '动作：\n1. 先定两个口径。\n2. 再取三处证据。', '适用于可公开对照的场景')
        .example('sample', '例子：上次那单——A 处 3 分钟、B 处 5 分钟；结论取 A。', 'steps');
}
const body = [{ target: 'goal' }, { useMethod: 'steps' }, { example: 'sample' }];

test('blockModule：render 与 doc(registry, body) 逐字一致', () => {
    const m = blockModule({ id: 'm1', registry: reg(), body });
    assert.equal(m.id, 'm1');
    assert.equal(m.kind, 'data');
    assert.equal(m.version, undefined);
    assert.equal(m.render(), doc(reg(), body));
});

test('blockModule：kind/version 可覆盖（未给 version 不落键）', () => {
    const m = blockModule({ id: 'm2', kind: 'method', version: '0.1.0', registry: reg(), body });
    assert.equal(m.kind, 'method');
    assert.equal(m.version, '0.1.0');
    assert.deepEqual(Object.keys(m).sort(), ['id', 'kind', 'render', 'version']);
});
