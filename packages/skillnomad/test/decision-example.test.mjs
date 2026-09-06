import assert from 'node:assert/strict';
import test from 'node:test';
import { renderStep } from '../dist/index.js';

// D33 示例分隔符：decision 示例块加 `isExample: true` 后渲染带示例区块标注；
// 缺席时与改前逐字一致（不变量：渲染零静默变化）。风格仿 renderstep-p1.test.mjs。

const decisionBase = {
  gateType: 'human_gate',
  title: '需求网确认',
  confirm: '确认需求网',
  metrics: [{ id: 'propositions', label: '命题', value: '10', detail: '示例' }],
  selection: { unit: '需求网命题', summary: '示例：10/10 已选', total: 10, selected: 10 },
  barrier_summary: '示例值——命题 10，年限 L2。',
};

const baseStep = {
  id: 'demo-step',
  title: '演示步骤',
  description: '演示描述',
  seq: 4,
  reads: [],
  writes: [],
  graph: { kind: 'seq', id: 'g', label: 'g', nodes: [] },
  barrier: {
    checkItems: ['覆盖数'],
    clarifyPrompt: '请确认。',
    onConfirm: 'continue',
    onReject: 'rollback',
  },
};

const order = { 'demo-step': 4 };

test('isExample: true 的 decision 渲染含示例标注（metrics/selection/barrier_summary 三处）', () => {
  const md = renderStep({ ...baseStep, decisionSummary: { ...decisionBase, isExample: true } }, order);
  assert.match(md, /示例值——以下为历史运行示例/);
  assert.match(md, /metrics（示例）/);
  assert.match(md, /selection（示例）/);
  assert.match(md, /【示例】/);
});

test('isExample 缺席时渲染与改前逐字一致（零静默变化）', () => {
  const md = renderStep({ ...baseStep, decisionSummary: { ...decisionBase } }, order);
  assert.doesNotMatch(md, /示例值——以下为历史运行示例/);
  assert.doesNotMatch(md, /metrics（示例）/);
  assert.doesNotMatch(md, /selection（示例）/);
  assert.doesNotMatch(md, /【示例】/);
  assert.match(md, /- metrics: 命题=10/);
  assert.match(md, /> 示例值——命题 10，年限 L2。/);
});
