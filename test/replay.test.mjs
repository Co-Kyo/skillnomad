// 双构建重放：同一份源码构建两次，技能产物逐字节一致；align/manifest 家族除时钟与
// 由时钟派生的哈希外一致，且哈希链自洽。
//
// 口径（2026-09-22 实测）：`generated_at`／`Generated:` 取构建时刻，故"整目录逐字节相同"不成立；
// 成立的是——技能产物（SKILL.md／steps／decision-summary 等）逐字节相同，且每个 manifest 记录的
// 哈希都等于该文件的 sha256。此口径即 contract「内容可重放」可担保的范围。
import assert from 'node:assert/strict';
import { isAbsolute, join, relative } from 'node:path';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { Registry } from 'methodblocks';
import { blockModule, buildPipeline } from '../dist/index.js';
import { task } from '../dist/types/index.js';

const META = { name: 'replay-e2e', description: '双构建重放' };
const CONTRACT_PATH = 'assets/common/mod.md';
const BARRIER = { checkItems: ['ok'], clarifyPrompt: '继续？', onConfirm: 'continue', onReject: 'rollback' };

/** 带构建时刻的文件：跨构建只允许时钟与派生哈希不同。 */
const CLOCK_BEARING = [
    '.align/snapshot.json',
    'align-report.json',
    'align-report.md',
    'artifact-manifest.json',
    'output-manifest.json',
];

// 每次调用重新构造输入：模拟消费者从源码重建，而不是复用可能被改过的对象。
const registry = () => new Registry()
    .target('goal', '目标：把这件事按方法做完。')
    .useMethod('steps', '动作：\n1. 第一步。\n2. 第二步。')
    .example('sample', '例子：上次那单——A 处 3 分钟；结论取 A。', 'steps');

const body = () => [{ target: 'goal' }, { useMethod: 'steps' }, { example: 'sample' }];

const entries = () => [
    { id: 'c1', kind: 'data', path: CONTRACT_PATH, description: '模块 A', scope: 'skill', module: 'mod-a' },
];

const steps = () => [
    {
        id: 'a',
        title: 'A',
        description: '第一步',
        body: 'do a',
        graph: task({ id: 'a-task', label: 'A', type: 'agent', body: 'do a' }),
        reads: [{ path: CONTRACT_PATH, as: 'contract', description: '模块 A 契约' }],
        writes: [{ path: '{workDir}/a.md', description: 'a 产物' }],
        barrier: BARRIER,
    },
    {
        id: 'b',
        title: 'B',
        description: '第二步',
        body: 'do b',
        dependsOn: 'a',
        graph: task({ id: 'b-task', label: 'B', type: 'agent', body: 'do b' }),
        reads: [{ path: '{workDir}/a.md', as: 'a', description: 'a 产物' }],
        writes: [{ path: '{workDir}/b.md', description: 'b 产物' }],
        barrier: BARRIER,
    },
];

const modules = () => [blockModule({ id: 'mod-a', registry: registry(), body: body() })];

const rel = (root, file) => relative(root, isAbsolute(file) ? file : join(root, file));

/** 递归快照：相对路径 → 字节内容；非普通文件即失败。 */
function snapshot(root) {
    const files = new Map();
    const walk = (current) => {
        for (const entry of readdirSync(current, { withFileTypes: true })) {
            const full = join(current, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.isFile()) files.set(relative(root, full), readFileSync(full));
            else throw new Error(`产物出现非普通文件：${relative(root, full)}`);
        }
    };
    walk(root);
    return files;
}

/** 抹掉时钟与派生哈希后的可比形态。 */
const normalize = (buffer) => buffer.toString('utf8')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '<ts>')
    .replace(/\b[0-9a-f]{64}\b/g, '<sha256>');

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

function buildOnce() {
    const out = mkdtempSync(join(tmpdir(), 'skillnomad-replay-'));
    try {
        return { out, result: buildPipeline(steps(), out, META, entries(), undefined, modules()) };
    } catch (error) {
        rmSync(out, { recursive: true, force: true });
        throw error;
    }
}

test('双构建重放：技能产物逐字节一致，时钟家族仅时钟与派生哈希不同', () => {
    const first = buildOnce();
    const second = buildOnce();
    try {
        const a = snapshot(first.out);
        const b = snapshot(second.out);
        assert.ok(a.size > 0, '产物不应为空');
        assert.deepEqual([...a.keys()].sort(), [...b.keys()].sort(), '两次构建的文件集合应一致');

        const drifted = [];
        for (const [file, bytes] of a) {
            const other = b.get(file);
            if (CLOCK_BEARING.includes(file)) {
                if (normalize(bytes) !== normalize(other)) drifted.push(`${file}（时钟外仍有差异）`);
            } else if (!bytes.equals(other)) {
                drifted.push(`${file}（应逐字节一致）`);
            }
        }
        assert.deepEqual(drifted, [], '重放差异');

        assert.deepEqual(
            first.result.files.map((file) => rel(first.out, file)).sort(),
            second.result.files.map((file) => rel(second.out, file)).sort(),
            '返回的文件清单应一致',
        );
    } finally {
        rmSync(first.out, { recursive: true, force: true });
        rmSync(second.out, { recursive: true, force: true });
    }
});

test('双构建重放：manifest 记录的哈希等于该文件的 sha256（链自洽）', () => {
    const { out } = buildOnce();
    try {
        const artifact = JSON.parse(readFileSync(join(out, 'artifact-manifest.json'), 'utf8'));
        const snapshotJson = JSON.parse(readFileSync(join(out, '.align', 'snapshot.json'), 'utf8'));

        assert.ok(artifact.files.length > 0, 'artifact-manifest 应登记产物文件');
        for (const { file, hash } of artifact.files) {
            assert.equal(hash, sha256(readFileSync(join(out, file))), `artifact-manifest 记录的哈希与文件不符：${file}`);
        }
        for (const [file, hash] of Object.entries(snapshotJson)) {
            assert.equal(hash, sha256(readFileSync(join(out, file))), `snapshot 记录的哈希与文件不符：${file}`);
        }
    } finally {
        rmSync(out, { recursive: true, force: true });
    }
});
