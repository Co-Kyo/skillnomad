// 随包资产搬运（config.shipAssets）：在册即拷、缺源文件即红、撤登记即清。
//
// 为什么单开一片：这条能力的失败形态全是静默的——产物里印着 references/x.md 而包里没有那个文件
// （漏发）；从 registry 撤下资产后旧拷贝还躺在包里（多发）；默认关与开启后产物不同却无人知晓。
// 各锁一条，外加「默认关＝与没有这条能力时同一形状」这条回归底线。
import assert from 'node:assert/strict';
import test from 'node:test';
import { dirname, join, relative, sep } from 'node:path';
import { chdir, cwd } from 'node:process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { buildPipeline } from '../dist/index.js';
import { task } from '../dist/types/index.js';

const META = { name: 'ship-e2e', description: '随包搬运' };
const BARRIER = { checkItems: ['ok'], clarifyPrompt: '继续？', onConfirm: 'continue', onReject: 'rollback' };

const RULES = 'assets/common/rules.md';
const TABLE = 'assets/common/table.json';
const OWN = 'assets/step-a/schemas.md';

const SOURCES = {};
SOURCES[RULES] = '# 共享规则' + String.fromCharCode(10) + String.fromCharCode(10) + '只有一条。' + String.fromCharCode(10);
SOURCES[TABLE] = '{ rows: 1 }' + String.fromCharCode(10);
SOURCES[OWN] = '# 步自有' + String.fromCharCode(10) + String.fromCharCode(10) + '字段表。' + String.fromCharCode(10);

const steps = () => [
    {
        id: 'a',
        title: 'A',
        description: '第一步',
        body: 'do a',
        graph: task({ id: 'a-task', label: 'A', type: 'agent', body: 'do a' }),
        reads: [{ path: RULES, as: 'contract', description: '共享规则' }],
        writes: [{ path: '{workDir}/a.md', description: 'a 产物' }],
        barrier: BARRIER,
    },
];

const fullRegistry = () => [
    { id: 'rules', kind: 'policy', path: RULES, description: '共享规则', scope: 'skill' },
    { id: 'table', kind: 'data', path: TABLE, description: '数据表', scope: 'skill' },
    { id: 'own', kind: 'schema', path: OWN, description: '步自有', scope: 'step', step: 'a' },
];

const SHIPPED = ['references/rules.md', 'assets/table.json', 'steps/00-a/schemas.md'];
const rel = (file) => file.split(sep).join('/');

function listFiles(root) {
    const out = [];
    const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.isFile()) out.push(rel(relative(root, full)));
        }
    };
    walk(root);
    return out.sort();
}

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

/** 在临时项目根里落盘源文件并切 cwd（源路径按 cwd 解析）；fn 拿到「跑一次构建」的回调。 */
function withProject(sources, fn) {
    const root = mkdtempSync(join(tmpdir(), 'skillnomad-ship-'));
    const prev = cwd();
    try {
        for (const key of Object.keys(sources)) {
            const full = join(root, key);
            mkdirSync(dirname(full), { recursive: true });
            writeFileSync(full, sources[key], 'utf-8');
        }
        chdir(root);
        const build = (registry, ship) => {
            buildPipeline(steps(), 'out', META, registry, undefined, [], undefined, ship === true);
            return join(root, 'out');
        };
        return fn(build);
    } finally {
        chdir(prev);
        rmSync(root, { recursive: true, force: true });
    }
}

test('默认关：在册资产不进输出目录——产物与没有这条能力时同一形状', () => {
    withProject(SOURCES, (build) => {
        const out = build(fullRegistry(), false);
        const files = listFiles(out);
        assert.ok(files.includes('SKILL.md'), '渲染文本照常产出');
        assert.ok(files.includes('steps/00-a/step.md'), '每步执行文件照常产出');
        const extra = files.filter((f) => f.startsWith('references/') || f.startsWith('assets/'));
        assert.deepEqual(extra, [], '缺省不搬运：输出目录不得出现随包文件');
    });
});

test('开启：按派生发布路径落位（skill 文档→references/、数据→assets/、步自有→steps/NN-步id/）', () => {
    withProject(SOURCES, (build) => {
        const out = build(fullRegistry(), true);
        const files = listFiles(out);
        for (const want of SHIPPED) {
            assert.ok(files.includes(want), '应拷入 ' + want + '，实际：' + files.join(' '));
        }
        const srcBytes = readFileSync(join(process.cwd(), RULES));
        assert.ok(readFileSync(join(out, 'references/rules.md')).equals(srcBytes), '拷入内容须与源文件逐字节相同');
        assert.equal(readFileSync(join(out, 'assets/table.json'), 'utf-8'), SOURCES[TABLE]);
    });
});

test('开启：拷入文件计入 artifact-manifest，且记录哈希等于该文件 sha256', () => {
    withProject(SOURCES, (build) => {
        const out = build(fullRegistry(), true);
        const manifest = JSON.parse(readFileSync(join(out, 'artifact-manifest.json'), 'utf-8'));
        const recorded = new Map(manifest.files.map((e) => [rel(e.file), e.hash]));
        for (const want of SHIPPED) {
            assert.ok(recorded.has(want), want + ' 应进产物清单');
            assert.equal(recorded.get(want), sha256(readFileSync(join(out, want))), '哈希须与该文件自洽');
        }
    });
});

test('在册但盘上没有源文件 → 构建失败（拦下静默漏发）', () => {
    const only = {};
    only[RULES] = SOURCES[RULES];
    withProject(only, (build) => {
        assert.throws(
            () => build(fullRegistry(), true),
            /Validation failed with 2 error/,
            '缺两条源文件应计入失败汇总',
        );
    });
});

test('从 registry 撤下资产 → 重跑后包内不留旧拷贝（拦下静默多发）', () => {
    withProject(SOURCES, (build) => {
        const out = build(fullRegistry(), true);
        assert.ok(statSync(join(out, 'assets/table.json')).isFile(), '首轮应拷入');
        const second = build(fullRegistry().filter((e) => e.id !== 'table'), true);
        assert.equal(second, out, '同一输出目录才算重跑');
        assert.ok(!listFiles(out).includes('assets/table.json'), '撤登记后旧拷贝必须清掉');
        assert.ok(listFiles(out).includes('references/rules.md'), '仍在册的资产不受影响');
    });
});

test('重放：两次独立构建（含搬运）文件集合一致、内容逐字节一致（时钟家族除时钟外一致）', () => {
    const once = () => withProject(SOURCES, (build) => {
        const out = build(fullRegistry(), true);
        const map = {};
        for (const f of listFiles(out)) map[f] = readFileSync(join(out, f)).toString('utf-8');
        return map;
    });
    const a = once();
    const b = once();
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), '文件集合应一致');
    const clock = new Set(['.align/snapshot.json', 'align-report.json', 'align-report.md', 'artifact-manifest.json', 'output-manifest.json']);
    const strip = (s) => s.replace(/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z/g, '<ts>').replace(/[0-9a-f]{64}/g, '<sha>');
    for (const f of Object.keys(a)) {
        if (clock.has(f)) assert.equal(strip(a[f]), strip(b[f]), f + ' 时钟外不得有差异');
        else assert.equal(a[f], b[f], f + ' 应逐字节一致');
    }
});
