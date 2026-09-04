import assert from 'node:assert/strict';
import test from 'node:test';
import { renderStep } from '../dist/index.js';

// P1 回归：renderStep 正文早返分支必须渲染四节声明
// （依赖 / 增量复用 / 降级协议 / 插件加载）。
// 早返前四节被静默丢失：11/11 带正文步骤的 reuse/plugins 声明在产物中零渲染。

const baseStep = {
  id: 'demo-step',
  title: '演示步骤',
  description: '演示描述',
  seq: 4,
  reads: [],
  writes: [],
  graph: { kind: 'seq', id: 'g', label: 'g', nodes: [] },
};

const fullDeclStep = {
  ...baseStep,
  body: '## 目标\n\n正文存在，触发早返分支。',
  dependsOn: 'prev-step',
  reuse: [{ checkFile: '{workDir}/out.md', skipDescription: '产物已存在' }],
  degrade: { maxRetries: 2, onDegrade: 'continue' },
  plugins: ['year-granularity'],
};

const order = { 'demo-step': 4, 'prev-step': 3 };

test('早返分支：reuse/plugins/degrade/dependsOn 四节必有渲染', () => {
  const md = renderStep(fullDeclStep, order);
  assert.match(md, /^## 依赖$/m);
  assert.match(md, /`prev-step`/);
  assert.match(md, /^## 增量复用$/m);
  assert.match(md, /产物已存在/);
  assert.match(md, /^## 降级协议$/m);
  assert.match(md, /最大重试次数：2/);
  assert.match(md, /^## 插件加载$/m);
  assert.match(md, /`year-granularity`/);
});

test('早返分支：无声明时四节整段省略（不输出空章节）', () => {
  const md = renderStep({ ...baseStep, body: '正文' }, order);
  assert.doesNotMatch(md, /^## 增量复用$/m);
  assert.doesNotMatch(md, /^## 降级协议$/m);
  assert.doesNotMatch(md, /^## 插件加载$/m);
});

test('早返分支：无 dependsOn 时依赖节渲染为"无"', () => {
  const md = renderStep({ ...baseStep, body: '正文' }, order);
  assert.match(md, /^## 依赖$/m);
  assert.match(md, /前置步骤：无/);
});

test('无正文分支：四节渲染与早返分支一致（同函数）', () => {
  const md = renderStep(fullDeclStepWithoutBody(), order);
  assert.match(md, /^## 依赖$/m);
  assert.match(md, /^## 增量复用$/m);
  assert.match(md, /^## 降级协议$/m);
  assert.match(md, /^## 插件加载$/m);
});

function fullDeclStepWithoutBody() {
  const { body, ...rest } = fullDeclStep;
  return rest;
}
