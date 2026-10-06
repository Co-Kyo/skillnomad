import assert from 'node:assert/strict';
import test from 'node:test';
import { createSkillFromModel } from '../dist/index.js';

// 缺省化锁（0.3.0）：policies／contracts／meta.callExamples／params／phases
// 全部缺席时，装配结果与"显式全关／空"逐字段一致——新用户不写框架历史，行为不变。

const step = () => ({
    id: 'a',
    title: 'A',
    summary: '第一步',
    instruction: { wish: '产出可被断言的结果。' },
    flow: { kind: 'do', task: { id: 'a-t', label: 'A', actor: 'agent', content: '做。' } },
    reads: [],
    writes: [{ path: '{workDir}/a.md', description: 'a' }],
    checkpoint: { checkItems: [{ label: '做完？', informational: true }], clarifyPrompt: '继续？', onConfirm: 'continue', onReject: 'rollback' },
});

const baseModel = () => ({ meta: { name: 'm', title: 'M', description: 'd' }, steps: [step()] });

test('全缺省装配＝显式全关等价（行为级）', () => {
    const bare = createSkillFromModel(baseModel());
    const explicit = createSkillFromModel({
        ...baseModel(),
        contracts: [],
        policies: {
            runtimeTrace: { enabled: false, logDir: '', eventTypes: [] },
        },
    });
    // 行为等价而非形状相等：缺省路径 runtimeTrace＝undefined，显式路径＝禁用对象；
    // 渲染器读 `?.enabled`（index.ts:777），两者都渲不出「运行记录」章＝语义一致。
    for (const [b, e] of zip(bare.steps, explicit.steps)) {
        assert.equal(Boolean(b.runtimeTrace?.enabled), Boolean(e.runtimeTrace?.enabled));
    }
    assert.deepEqual({ ...bare, steps: bare.steps.map(stripTrace) }, { ...explicit, steps: explicit.steps.map(stripTrace) },
        '除 runtimeTrace 形状差外逐字段一致');
});
const zip = (a, b) => a.map((x, i) => [x, b[i]]);
const stripTrace = (s) => ({ ...s, runtimeTrace: undefined });

test('缺省面：contracts 空数组、api 三数组空、runtimeTrace 未开', () => {
    const s = createSkillFromModel(baseModel());
    assert.deepEqual(s.contracts, []);
    assert.deepEqual(s.api.callExamples, []);
    assert.deepEqual(s.api.params, []);
    assert.deepEqual(s.api.phases, []);
    for (const st of s.steps) assert.equal(st.runtimeTrace?.enabled, undefined);
});
