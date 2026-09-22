import assert from 'node:assert/strict';
import test from 'node:test';
import { renderStep } from '../dist/index.js';

// 回归：flow 树里 .map() 的 over 输入必须出现在「文件引用」表——
// 以派生行形态（作者不在 reads 双写）。去重按剥 #fragment 的基路径比对 reads∪writes；
// 派生行保留完整 over 形态（worker 取用的就是那个切片）。

const baseStep = {
    id: 'demo-step',
    title: '演示步骤',
    description: '演示描述',
    seq: 4,
    reads: [],
    writes: [],
    graph: { kind: 'seq', id: 'g', label: 'g', nodes: [] },
};

const mapNode = (items) => ({
    kind: 'map',
    id: 'm1',
    label: '滚动窗口',
    items,
    worker: { kind: 'task', task: { id: 'w', label: 'worker', type: 'agent', verb: 'generate', body: 'b' } },
    maxConcurrency: 5,
});

const order = { 'demo-step': 4 };

test('map 输入未进 reads：派生行出现且标注来源', () => {
    const md = renderStep(
        { ...baseStep, graph: mapNode('{workDir}/.meta/requirement-web.json#propositions') },
        order,
    );
    assert.match(md, /\| 读取 \| `\{workDir\}\/\.meta\/requirement-web\.json`（#propositions） \| 滚动窗口（map 输入，派生） \|/);
});

test('map 输入已在 reads：不重复派生（去重按基路径）', () => {
    const md = renderStep({
        ...baseStep,
        reads: [{ path: '{workDir}/.meta/requirement-web.json', description: '需求网' }],
        graph: mapNode('{workDir}/.meta/requirement-web.json#propositions'),
    }, order);
    assert.doesNotMatch(md, /map 输入，派生/);
    assert.match(md, /\| 读取 \| `\{workDir\}\/\.meta\/requirement-web\.json` \| 需求网 \|/);
});

test('map 输入命中 writes：不派生（自己产出的切片不再列为读取）', () => {
    const md = renderStep({
        ...baseStep,
        writes: [{ path: '{workDir}/.meta/out.json', description: '产出' }],
        graph: mapNode('{workDir}/.meta/out.json#items'),
    }, order);
    assert.doesNotMatch(md, /map 输入，派生/);
});

test('无 map 的步骤：文件引用表逐字不变（零回归面）', () => {
    const withReads = {
        ...baseStep,
        reads: [{ path: 'assets/x.md', description: '共享规则' }],
        writes: [{ path: '{workDir}/.meta/y.json', description: '产出' }],
    };
    const md = renderStep(withReads, order);
    const table = md.match(/## 文件引用[\s\S]*?(?=\n## |\n$)/)[0].trim();
    const expected = [
        '## 文件引用',
        '',
        '| 类型 | 文件 | 说明 |',
        '|------|------|------|',
        '| 读取 | `assets/x.md` | 共享规则 |',
        '| 产出 | `{workDir}/.meta/y.json` | 产出 |',
    ].join('\n');
    assert.equal(table, expected);
});

test('嵌套 map（seq 内）：派生行同样出现（walkGraph 全树）', () => {
    const md = renderStep({
        ...baseStep,
        graph: {
            kind: 'seq', id: 's', label: 's',
            nodes: [{ kind: 'task', task: { id: 't', label: 't', type: 'agent', verb: 'parse', body: 'b' } }, mapNode('{workDir}/.meta/deep.json')],
        },
    }, order);
    assert.match(md, /\| 读取 \| `\{workDir\}\/\.meta\/deep\.json` \| 滚动窗口（map 输入，派生） \|/);
});
