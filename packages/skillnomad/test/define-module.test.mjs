import assert from 'node:assert/strict';
import test from 'node:test';
import { defineModule } from '../dist/index.js';
import { validateModules } from '../../skillnomad-common/dist/index.js';

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

test('W4 动词：windowWidth/slotsFor/batchesFor 计算与配错即红', async () => {
    const s = await import('../../skillnomad-common/dist/scheduling.js');
    assert.equal(s.windowWidth(10, 5), 5);
    assert.equal(s.windowWidth(3, 5), 3);
    assert.equal(s.windowWidth(0, 5), 0);
    assert.throws(() => s.windowWidth(10, 0), /正整数/);
    assert.equal(s.slotsFor(1, 2), 2);
    assert.equal(s.batchesFor(7, 5), 2);
    assert.equal(s.batchesFor(0, 5), 0);
});

test('W4 动词：labelFor 缺变量即红', async () => {
    const s = await import('../../skillnomad-common/dist/scheduling.js');
    assert.equal(s.labelFor('search-{batch_id}', { batch_id: 'B1' }), 'search-B1');
    assert.throws(() => s.labelFor('search-{batch_id}', {}), /缺变量/);
});

test('W4 组合子：rollingWindow 首发＋排队＋占2槽', async () => {
    const s = await import('../../skillnomad-common/dist/scheduling.js');
    assert.deepEqual(s.rollingWindow(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 5).start, ['a', 'b', 'c', 'd', 'e']);
    assert.deepEqual(s.rollingWindow(['p1', 'p2', 'p3'], 5, 2).start, ['p1', 'p2']);
    assert.deepEqual(s.batchParallel(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 5).batches, [['a', 'b', 'c', 'd', 'e'], ['f', 'g']]);
});

test('W4 渲染：renderBinding(scan) 单节可写文档', async () => {
    const s = await import('../../skillnomad-common/dist/scheduling.js');
    const md = s.renderBinding({ stepId: 'scan', mode: 'rolling_window', taskGroup: '1 个命题批次 = 1 个 agent' });
    assert.match(md, /^### scan（滚动窗口）$/m);
    assert.ok(md.includes('1 个命题批次'));
    assert.ok(!md.includes('，1 槽/任务，1 槽/任务'));
});

test('W4 渲染：renderModuleDoc 全节由函数派生', async () => {
    const s = await import('../../skillnomad-common/dist/scheduling.js');
    const md = s.renderModuleDoc();
    assert.match(md, /^## 调度策略/m);
    assert.ok(md.includes('批量并行') && md.includes('滚动窗口') && md.includes('拓扑分批'));
});

test('W4 解耦：调度模块代码零业务引用（无状态原子化）', async () => {
    // 门禁语义留调度，校验内容参数化：模块代码不得出现业务字面量
    // （dimension/capability_id/overview 归各业务 step 的 verify.field；JSON 解析由调用方传谓词）。
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../../skillnomad-common/src/scheduling.ts', import.meta.url), 'utf-8');
    const code = src.split('\n').filter((l) => {
        const t = l.trim();
        return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    }).join('\n');
    for (const w of ['dimension', 'capability_id', 'overview', 'json.load', 'JSON.parse', 'expected_file']) {
        assert.ok(!code.includes(w), `调度模块代码含业务引用: ${w}`);
    }
    // id 槽位名保留（existence/json/fields），行为已参数化（when 串写明调用方传入）。
    const s = await import('../../skillnomad-common/dist/scheduling.js');
    assert.deepEqual(s.PROACTIVE_CHECK_IDS, ['existence', 'json', 'fields']);
    assert.ok(s.proactiveChecks().every((c) => c.onFail === 'pending-retry'));
});
