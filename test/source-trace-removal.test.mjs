import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPipeline } from '../dist/index.js';
import { taskNode } from '../dist/types/index.js';

// 防复活锁：sourceTrace 子系统已整件删除（无人消费的抽象；见 CHANGELOG 0.3.0 节）。
// 本测锁三事：对齐报告两文件不再出现该节/字段；公开导出面不含 trace 类型；
// output-manifest 的 sourceFile 字段维持原值（该文件逐字节不变＝消费侧零扰动）。

const META = { name: 'trace-removal', description: 'sourceTrace 删除回归' };
const BARRIER = { checkItems: [{ label: 'ok', informational: true }], clarifyPrompt: '继续？', onConfirm: 'continue', onReject: 'rollback' };

const STEP = {
    id: 'a',
    title: 'A',
    description: '单步最小管线',
    body: 'do a',
    graph: taskNode({ id: 'a-task', label: 'A', type: 'agent', body: 'do a' }),
    reads: [],
    writes: [{ path: '{workDir}/a.md', description: 'a 产物' }],
    barrier: BARRIER,
};

test('对齐报告不再含 Source Trace 节与 sourceTrace 字段', () => {
    const out = mkdtempSync(join(tmpdir(), 'skillnomad-trace-'));
    try {
        buildPipeline({ steps: [STEP], outputDir: out, meta: META });
        const md = readFileSync(join(out, 'align-report.md'), 'utf-8');
        const json = JSON.parse(readFileSync(join(out, 'align-report.json'), 'utf-8'));
        assert.ok(!md.includes('Source Trace'), 'align-report.md 仍出现 Source Trace 节');
        assert.ok(!('sourceTrace' in json), 'align-report.json 仍含 sourceTrace 字段');
        // 其余结构不受连坐：依赖图/检查表/文件节仍在
        assert.ok(md.includes('## Dependency Graph') && md.includes('## Checks') && md.includes('## Files'));
        const manifest = JSON.parse(readFileSync(join(out, 'output-manifest.json'), 'utf-8'));
        const entry = manifest.outputs.find(o => o.stepId === 'a');
        assert.equal(entry.sourceFile, 'skill.ts'); // 字段保留、恒值（与删除前逐字一致）
    } finally {
        rmSync(out, { recursive: true, force: true });
    }
});

test('公开类型面不再导出 trace 家族（dist 声明文本级锁）', () => {
    const dts = readFileSync(new URL('../dist/index.d.ts', import.meta.url), 'utf-8');
    const typesDts = readFileSync(new URL('../dist/types/index.d.ts', import.meta.url), 'utf-8');
    assert.ok(!dts.includes('SourceTrace') && !typesDts.includes('SourceTrace'),
        '类型面仍出现 SourceTrace 导出');
});
