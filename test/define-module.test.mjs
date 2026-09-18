import assert from 'node:assert/strict';
import test from 'node:test';
import { defineModule } from '../dist/index.js';
import { validateModules } from '../dist/check/validators.js';

// D35 W2：V4 模块注册表合法性（id 唯一＋deps 环）；引用一致性随 W4 首刀来。
test('V4 正例：空表＋合法表 → 无错误', () => {
    assert.deepEqual(validateModules([]), []);
    assert.deepEqual(validateModules([{ id: 'scheduling-policy', kind: 'data', render: () => '' }]), []);
});

test('V4a 反例：重复 id 即红', () => {
    const errs = validateModules([
        { id: 'm', kind: 'data', render: () => '' },
        { id: 'm', kind: 'action', render: () => '' },
    ]);
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /重复/);
});

test('V4b 反例：deps 环即红', () => {
    const errs = validateModules([
        { id: 'a', kind: 'data', deps: ['b'], render: () => '' },
        { id: 'b', kind: 'data', deps: ['a'], render: () => '' },
    ]);
    assert.equal(errs.length, 1);
    assert.match(errs[0].message, /依赖环/);
});

test('defineModule 原样返回（装配入口与 step 并列）', () => {
    const m = { id: 'scheduling-policy', kind: 'data', render: () => 'W=5' };
    assert.deepEqual(defineModule(m), m);
});

test('W3 正例：模块附录缺席整段省略', async () => {
    const { renderModulesAppendix } = await import('../dist/index.js');
    assert.equal(renderModulesAppendix([], {}), '');
    assert.equal(renderModulesAppendix([{ id: 'x', kind: 'data', path: 'p', description: '', scope: 'skill' }], {}), '');
});

test('W3 正例：模块附录查表拼装', async () => {
    const { renderModulesAppendix } = await import('../dist/index.js');
    const md = renderModulesAppendix(
        [{ id: 'sched', kind: 'data', path: 'p', description: '', scope: 'skill', module: 'scheduling-policy' }],
        { 'scheduling-policy': 'W=5' },
    );
    assert.match(md, /^## 模块附录$/m);
    assert.ok(md.includes('W=5'));
    assert.ok(md.includes('<!-- module:scheduling-policy -->'));
});
