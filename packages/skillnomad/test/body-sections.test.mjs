import assert from 'node:assert/strict';
import test from 'node:test';
import { validateBodySections } from '../dist/index.js';

// B1 body 三段分块（联调薄校验）：只认结构标记，不认散文内容。
// 含"搜法"即须含"判据："与"参照"；不含"搜法"直接放行。
const step = (id, bodies) => ({
  id,
  graph: { kind: 'seq', id: `${id}-chain`, label: id, nodes: bodies.map((body, i) => ({ kind: 'task', task: { id: `${id}-t${i}`, label: 't', type: 'agent', body } })) },
});

test('B1 正例：无搜法 body 直接放行', () => {
  assert.deepEqual(validateBodySections([step('s', ['你是文档分析师。产出 findings.json'])]), []);
});

test('B1 正例：搜法＋判据＋参照三段齐 → 无错误', () => {
  const body = '你是文档分析师。\n\n搜法：\n1. 去向\n\n判据：HIT／MISS／KEEP\n\n参照知识面三例';
  assert.deepEqual(validateBodySections([step('s', [body])]), []);
});

test('B1 反例：含搜法缺判据即红', () => {
  const body = '你是文档分析师。\n\n搜法：\n1. 去向\n\n参照知识面三例';
  const errs = validateBodySections([step('s', [body])]);
  assert.equal(errs.length, 1);
  assert.match(errs[0].message, /缺"判据/);
});

test('B1 反例：含搜法缺参照即红', () => {
  const body = '你是文档分析师。\n\n搜法：\n1. 去向\n\n判据：HIT／MISS／KEEP';
  const errs = validateBodySections([step('s', [body])]);
  assert.equal(errs.length, 1);
  assert.match(errs[0].message, /缺"参照/);
});
