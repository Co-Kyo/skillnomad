import assert from 'node:assert/strict';
import test from 'node:test';
import { createSkill, task } from '../dist/index.js';

// D29 缺陷2 回归：双装配路径行为对齐。
// 修复前 createSkill 直装配不转 checkpoint→barrier（与 createSkillFromModel 不一致），
// 用户检查点在直装配下静默失效。修复后两条路径行为一致。

const stepWithCheckpoint = {
  id: 'review',
  title: '复核',
  description: '复核标注',
  graph: task({ id: 'review-do', label: '复核', type: 'agent', body: '复核标注。' }),
  reads: [],
  writes: [{ path: '{workDir}/.meta/reviewed.md', description: '复核结果', required: true }],
  checkpoint: {
    checkItems: ['覆盖数', '用户确认'],
    clarifyPrompt: '请确认检测报告。',
    onConfirm: 'continue',
    onReject: 'rollback',
  },
};

test('createSkill 直装配：checkpoint 转换为运行时 barrier', () => {
  const skill = createSkill({
    name: 'demo',
    title: '演示',
    description: '演示',
    steps: [stepWithCheckpoint],
  });
  assert.ok(skill.steps[0].barrier, 'barrier 未生成');
  assert.equal(skill.steps[0].barrier.clarifyPrompt, '请确认检测报告。');
  assert.deepEqual(skill.steps[0].barrier.checkItems, ['覆盖数', '用户确认']);
});

test('createSkill 直装配：已有 barrier 时不覆盖', () => {
  const skill = createSkill({
    name: 'demo',
    title: '演示',
    description: '演示',
    steps: [{
      ...stepWithCheckpoint,
      barrier: { checkItems: ['既有'], clarifyPrompt: '既有 barrier', onConfirm: 'continue', onReject: 'rollback' },
    }],
  });
  assert.equal(skill.steps[0].barrier.clarifyPrompt, '既有 barrier');
});

test('createSkill 直装配：无 checkpoint 时行为不变', () => {
  const { checkpoint, ...bare } = stepWithCheckpoint;
  const skill = createSkill({
    name: 'demo',
    title: '演示',
    description: '演示',
    steps: [bare],
  });
  assert.equal(skill.steps[0].barrier, undefined);
  assert.equal(skill.steps[0].id, 'review');
});
