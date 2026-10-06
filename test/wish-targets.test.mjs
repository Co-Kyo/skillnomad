import assert from 'node:assert/strict';
import test from 'node:test';
import { createSkillFromModel } from '../dist/index.js';
import { inspectTargetStructure } from '../dist/check/validators.js';

// wish/target 模型：一个 wish（1 条）派生多条 target（N 条），每条 target 由判据支撑。
// 本测锁两件事：①产物形状（意图章＋目标章＋判据归组＋未归属判据仍进校验清单）；
// ②结构体检（口号／孤儿／悬空／id 重复机检得到）。

const mkStep = (over = {}) => ({
    id: 'a',
    title: 'A',
    summary: '第一步',
    instruction: {
        wish: '把这件事按方法做完。',
        targets: [
            { id: 'T1', claim: '产出物已落盘' },
            { id: 'T2', claim: '产出物自洽' },
        ],
        validation: [
            { type: 'file-exists', ref: '{workDir}/out.json', description: '产出物在', target: 'T1' },
            { type: 'json-parse', ref: '{workDir}/out.json', description: '可解析', target: 'T1' },
            { type: 'field', description: '引用自洽', target: 'T2' },
        ],
        inputs: [], actions: [], outputs: [], exceptions: [],
    },
    checkpoint: {
        checkItems: [{ label: '人看一眼', expect: '判据在这儿', target: 'T2' }],
        clarifyPrompt: '确认？', onConfirm: 'continue', onReject: 'rollback',
    },
    flow: { kind: 'do', task: { id: 'a-t', label: 'A', actor: 'agent', content: '做。' } },
    reads: [], writes: [], purpose: '把这件事按方法做完。',
    ...over,
});

test('产物：意图章 + 目标章，判据按 target 归组', () => {
    const body = createSkillFromModel({ meta: { name: 'x', description: 'd' }, steps: [mkStep()] }).steps[0].body;
    assert.match(body, /## 意图\n\n把这件事按方法做完。/);
    assert.match(body, /## 目标/);
    assert.match(body, /1\. 产出物已落盘/);
    assert.match(body, /2\. 产出物自洽/);
    // 判据挂在各自 target 下
    assert.match(body, /1\. 产出物已落盘\n   - 机器判据：\[file-exists\][^\n]*产出物在\n   - 机器判据：\[json-parse\][^\n]*可解析/);
    assert.match(body, /2\. 产出物自洽\n   - 机器判据：\[field\][^\n]*引用自洽\n   - 人工判据：人看一眼（期望：判据在这儿）/);
});

test('未归属的判据不被吞：仍渲染进「校验清单」；归属了的不重复列', () => {
    const st = mkStep();
    st.instruction.validation.push({ type: 'command', description: '没归属的判据' });
    const body = createSkillFromModel({ meta: { name: 'x', description: 'd' }, steps: [st] }).steps[0].body;
    const checklist = body.split('## 校验清单')[1].split('## ')[0];
    assert.match(checklist, /没归属的判据/);
    assert.doesNotMatch(checklist, /产出物在/);   // 已归属的不再进清单
});

test('体检：目标没有判据＝口号，机检得到且判为硬失败', () => {
    const st = mkStep();
    st.instruction.validation = [];
    st.checkpoint.checkItems = [];
    const notes = inspectTargetStructure([st]);
    const slogans = notes.filter(n => n.code === 'T-SLOGAN');
    assert.equal(slogans.length, 2);
    assert.ok(slogans.every(n => n.blocking), '口号必须判为硬失败');
});

test('装配期 fail-closed：写了目标却没判据，构建直接红，且报错说人话不带内部代号', () => {
    const st = mkStep();
    st.instruction.validation = [];
    st.checkpoint.checkItems = [];
    assert.throws(
        () => createSkillFromModel({ meta: { name: 'x', description: 'd' }, steps: [st] }),
        (e) => {
            assert.match(e.message, /口号/);
            assert.match(e.message, /产出物已落盘/);          // 点名是哪条目标
            assert.doesNotMatch(e.message, /T-SLOGAN/);       // 内部代号不得出现
            return true;
        },
    );
});

test('装配期：判据没挂目标只提示不拦（仍能构建）', () => {
    const st = mkStep();
    st.instruction.validation.push({ type: 'command', description: '没归属的判据' });
    const notes = inspectTargetStructure([st]);
    const orphans = notes.filter(n => n.code === 'T-ORPHAN');
    assert.equal(orphans.length, 1);
    assert.equal(orphans[0].blocking, false, '孤儿不该拦构建');
    assert.doesNotThrow(() => createSkillFromModel({ meta: { name: 'x', description: 'd' }, steps: [st] }));
});

test('体检：孤儿（判据无归属）与悬空（挂到不存在的 target）机检得到', () => {
    const st = mkStep();
    st.instruction.validation = [{ type: 'field', description: '孤儿判据' },
        { type: 'field', description: '悬空判据', target: 'T9' }];
    const notes = inspectTargetStructure([st]);
    assert.equal(notes.filter(n => n.code === 'T-ORPHAN').length, 1);
    assert.equal(notes.filter(n => n.code === 'T-DANGLING').length, 1);
    assert.ok(notes.filter(n => n.code === 'T-DANGLING').every(n => n.blocking));
});

test('体检：target id 重复机检得到', () => {
    const st = mkStep();
    st.instruction.targets = [{ id: 'T1', claim: '甲' }, { id: 'T1', claim: '乙' }];
    const notes = inspectTargetStructure([st]);
    assert.ok(notes.filter(n => n.code === 'T-DUPID').length >= 1); // 语义层逐 id 报告（同一 id 冲突对每条出现各报一次）
});

test('体检：没写 targets 的步骤（存量声明）一条提示都不出', () => {
    const st = mkStep();
    delete st.instruction.targets;
    assert.deepEqual(inspectTargetStructure([st]), []);
});
