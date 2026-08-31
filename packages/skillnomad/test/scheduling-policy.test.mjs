import assert from 'node:assert/strict';
import test from 'node:test';
import { renderSkillMd } from '../dist/index.js';
import { validateSchedulingPolicy } from '../../skillnomad-common/dist/index.js';

// 最小 ResolvedPipeline（2 步，足够 renderSkillMd 遍历）
const pipeline = {
  name: 'demo',
  description: 'demo pipeline',
  steps: [
    { id: 's1', title: 'Step1', description: 'desc1', seq: 0, reads: [], writes: [{ path: '{workDir}/a.json', description: 'a' }], resolvedReads: [], resolvedWrites: [] },
    { id: 's2', title: 'Step2', description: 'desc2', seq: 1, reads: [], writes: [{ path: '{workDir}/b.json', description: 'b' }], resolvedReads: [], resolvedWrites: [] },
  ],
  stepOrder: { s1: 0, s2: 1 },
};

const baseMeta = {
  name: 'demo',
  title: 'Demo Skill',
  description: 'A demo skill',
  api: {},
};

test('渲染：有 schedulingPolicy 时输出「调度策略」公共章节', () => {
  const meta = {
    ...baseMeta,
    api: {
      ...baseMeta.api,
      schedulingPolicy: {
        concurrencyLimit: 5,
        windowBudget: { maxWindowSize: 4, inputChunkTokens: 6000, itemSummaryTokens: 500 },
        batchPolicy: { mode: 'rolling_window', maxBatchSize: 3, slotOccupancy: 1 },
      },
    },
  };
  const md = renderSkillMd(pipeline, meta);
  assert.match(md, /## 调度策略/);
  assert.match(md, /全局并发上限\*\*：5 个 Task Group/);
  assert.match(md, /批量并行|滚动窗口|拓扑分批/);
});

test('渲染：无 schedulingPolicy 时不输出「调度策略」章节', () => {
  const md = renderSkillMd(pipeline, baseMeta);
  assert.doesNotMatch(md, /## 调度策略/);
});

test('校验：合法 schedulingPolicy 无错误', () => {
  const errors = validateSchedulingPolicy({
    concurrencyLimit: 5,
    windowBudget: { maxWindowSize: 4, inputChunkTokens: 6000, itemSummaryTokens: 500 },
    batchPolicy: { mode: 'rolling_window', maxBatchSize: 3, slotOccupancy: 1 },
  });
  assert.equal(errors.length, 0);
});

test('校验：concurrencyLimit 缺失或非正整数时报错', () => {
  const e1 = validateSchedulingPolicy({ concurrencyLimit: 0 });
  assert.equal(e1.length, 1);
  assert.match(e1[0].message, /concurrencyLimit/);

  const e2 = validateSchedulingPolicy({ concurrencyLimit: 5.5 });
  assert.equal(e2.length, 1);
});

test('校验：batchPolicy.mode 非法时收紧', () => {
  const errors = validateSchedulingPolicy({ concurrencyLimit: 5, batchPolicy: { mode: 'evil' } });
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /mode must be one of/);
});
