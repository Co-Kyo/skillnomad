import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPipeline, BuildFailureError } from '../dist/index.js';
import { taskNode } from '../dist/types/index.js';

// 构建诊断返回值化：库只返回/抛出结构化诊断，不打印。
// 「组装质量可机检」自此是接口事实——程序化调用方（CI/编辑器）无需解析 stdout。

const META = { name: 'diagnostics', description: '诊断返回通道' };
const BARRIER = { checkItems: [{ label: 'ok', informational: true }], clarifyPrompt: '继续？', onConfirm: 'continue', onReject: 'rollback' };

const validStep = () => ({
    id: 'a',
    title: 'A',
    description: '合格步骤',
    body: 'do a',
    graph: taskNode({ id: 'a-task', label: 'A', type: 'agent', body: 'do a' }),
    reads: [],
    writes: [{ path: '{workDir}/a.md', description: 'a 产物' }],
    barrier: BARRIER,
});

test('成功构建：diagnostics 为结构化数组，库路径零 stdout 打印', (t) => {
    const out = mkdtempSync(join(tmpdir(), 'skillnomad-diag-'));
    const spies = [];
    const origLog = console.log;
    const origErr = console.error;
    console.log = (...a) => spies.push(['log', a.join(' ')]);
    console.error = (...a) => spies.push(['err', a.join(' ')]);
    try {
        const result = buildPipeline({ steps: [validStep()], outputDir: out, meta: META });
        assert.ok(Array.isArray(result.diagnostics));
        for (const d of result.diagnostics) {
            assert.ok(['error', 'note'].includes(d.severity), 'severity 枚举');
            assert.equal(typeof d.source, 'string');
            assert.equal(typeof d.message, 'string');
        }
    } finally {
        console.log = origLog;
        console.error = origErr;
        rmSync(out, { recursive: true, force: true });
    }
    assert.deepEqual(spies, [], 'buildPipeline 库路径不得直接打印（打印归调用方）');
});

test('失败构建：抛 BuildFailureError，汇总句形态不变且 err.diagnostics 携带逐条错误', () => {
    const out = mkdtempSync(join(tmpdir(), 'skillnomad-diag2-'));
    try {
        const broken = validStep();
        broken.writes = []; // 无产出 → validation 阶段必红（缺检查点走 align-report 阶段，非本测对象）
        assert.throws(
            () => buildPipeline({ steps: [broken], outputDir: out, meta: META }),
            (err) => {
                assert.ok(err instanceof BuildFailureError, '应为 BuildFailureError');
                assert.match(err.message, /^Validation failed with \d+ error\(s\)$/, '汇总句向后兼容');
                const errors = err.diagnostics.filter(d => d.severity === 'error');
                assert.ok(errors.length >= 1);
                const v = errors.find(d => d.source === 'validation');
                assert.ok(v, 'validation 族诊断在列');
                assert.match(v.site, /\[a\]/, 'site＝来源自身坐标（步骤定位）');
                return true;
            },
        );
    } finally {
        rmSync(out, { recursive: true, force: true });
    }
});
