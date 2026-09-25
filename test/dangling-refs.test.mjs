// 悬空引用检查（shipAssets 开启时随搬运运行）：包内 markdown 引用的包内路径必须实存。
//
// 失败形态是静默的：正文印着 references/x.md 而包里没那个文件，构建不报错，
// 运行那天 agent 安静缺料。检查把「缺料」从运行期提前到构建期。
// 扫描范围＝渲染＋搬运写出的全部 markdown（含作者随包文档）；
// 框架自产的机器报告在本检查之后才写出，不在扫描集。
// 不开 shipAssets＝检查不跑（零行为变化）。
import assert from 'node:assert/strict';
import test from 'node:test';
import { dirname, join, relative, sep } from 'node:path';
import { chdir, cwd } from 'node:process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { buildPipeline } from '../dist/index.js';
import { task } from '../dist/types/index.js';

const META = { name: 'dangle-gate', description: '悬空引用检查' };
const BARRIER = { checkItems: ['ok'], clarifyPrompt: '继续？', onConfirm: 'continue', onReject: 'rollback' };

const RULES = 'assets/common/rules.md';
const OWN = 'assets/step-a/schemas.md';

const SOURCES = {};
SOURCES[RULES] = '# 共享规则' + String.fromCharCode(10) + String.fromCharCode(10) + '只有一条。' + String.fromCharCode(10);
SOURCES[OWN] = '# 步自有' + String.fromCharCode(10) + String.fromCharCode(10) + '字段表。' + String.fromCharCode(10);

// 步正文引用一个在册资产（发布形态路径）——搬运后应可解析。
const steps = (extraBody) => [
    {
        id: 'a',
        title: 'A',
        description: '第一步',
        body: '先读 references/rules.md 再动手。' + (extraBody ?? ''),
        graph: task({ id: 'a-task', label: 'A', type: 'agent', body: 'do a' }),
        reads: [{ path: RULES, as: 'contract', description: '共享规则' }],
        writes: [{ path: '{workDir}/a.md', description: 'a 产物' }],
        barrier: BARRIER,
    },
];

const registry = () => [
    { id: 'rules', kind: 'policy', path: RULES, description: '共享规则', scope: 'skill' },
    { id: 'own', kind: 'schema', path: OWN, description: '步自有', scope: 'step', step: 'a' },
];

function withProject(fn) {
    const root = mkdtempSync(join(tmpdir(), 'skillnomad-dangle-'));
    const prev = cwd();
    try {
        for (const key of Object.keys(SOURCES)) {
            const full = join(root, key);
            mkdirSync(dirname(full), { recursive: true });
            writeFileSync(full, SOURCES[key], 'utf-8');
        }
        chdir(root);
        return fn(join(root, 'out'));
    } finally {
        chdir(prev);
        rmSync(root, { recursive: true, force: true });
    }
}

const build = (outDir, stepsArg, ship) =>
    buildPipeline(stepsArg, outDir, META, registry(), undefined, [], undefined, ship === true);

test('通过：正文引用的在册资产经搬运实存于包内', () => withProject((outDir) => {
    const { files } = build(outDir, steps(), true);
    const scanned = files.filter((f) => /\.(md|markdown)$/i.test(f));
    assert.ok(scanned.length >= 2, 'SKILL.md 与 step.md 都应在扫描集内');
    assert.ok(readFileSync(join(outDir, 'references', 'rules.md'), 'utf-8').includes('只有一条'));
}));

test('红：正文引用未随包的包内路径（文件没搬进来＝当场失败）', () => withProject((outDir) => {
    const broken = steps('另见 references/ghost.md。');
    assert.throws(
        () => build(outDir, broken, true),
        /Dangling refs check failed with 1 error/,
    );
}));

test('撤登记＋删 reads 但正文引用忘改：前置校验放行的悬空引用由此检查拦下', () => withProject((outDir) => {
    // 第一次构建：正常（在册＋reads＋正文引用一致）。
    build(outDir, steps(), true);
    // 作者撤下 rules：登记删了、reads 声明也删了——前置校验无从可查，
    // 但步正文里那句「references/rules.md」还留着，而搬运已把旧拷贝清掉。
    const orphaned = [{
        id: 'a',
        title: 'A',
        description: '第一步',
        body: '先读 references/rules.md 再动手。',
        graph: task({ id: 'a-task', label: 'A', type: 'agent', body: 'do a' }),
        reads: [],
        writes: [{ path: '{workDir}/a.md', description: 'a 产物' }],
        barrier: BARRIER,
    }];
    assert.throws(
        () => buildPipeline(orphaned, outDir, META, [], undefined, [], undefined, true),
        /Dangling refs check failed/,
    );
}));

test('作者随包文档里的悬空引用同样被扫（扫描范围＝全部 markdown，不止入口与步骤）', () => withProject((outDir) => {
    // 在册文档自身引用一个不存在的包内路径。
    const ghost = 'assets/common/ghost-note.md';
    writeFileSync(join(process.cwd(), ghost), '# 提示' + String.fromCharCode(10) + String.fromCharCode(10) + '参见 references/nowhere.md。' + String.fromCharCode(10), 'utf-8');
    const reg = [...registry(), { id: 'ghost', kind: 'policy', path: ghost, description: '随包提示', scope: 'skill' }];
    assert.throws(
        () => buildPipeline(steps(), outDir, META, reg, undefined, [], undefined, true),
        /Dangling refs check failed with 1 error/,
    );
}));

test('机器报告不被扫：扫描集＝渲染＋搬运的 markdown，报告在检查之后写出', () => withProject((outDir) => {
    // 捕获检查自报的扫描数：应＝渲染＋搬运的 markdown 数（SKILL.md＋step.md＋随包 md），
    // 不含检查之后才写出的 align-report.md。
    const logs = [];
    const orig = console.log;
    console.log = (...args) => { logs.push(args.join(' ')); orig(...args); };
    let result;
    try {
        result = build(outDir, steps(), true);
    } finally {
        console.log = orig;
    }
    const scannedCount = Number(logs.find((l) => /docs scanned/.test(l)).match(/\((\d+) docs scanned\)/)[1]);
    const mdInFiles = result.files.filter((f) => /\.(md|markdown)$/i.test(f));
    assert.equal(scannedCount, mdInFiles.length, '扫描数＝渲染＋搬运的 markdown 数');
    assert.ok(!mdInFiles.some((f) => /align-report/.test(f)), 'align-report 不在扫描集');
    // 报告确已写出且含引用形态（若入扫描集则每轮都在赌它不含断链形态：
    // 消费侧实测报告含 [steps/content] 式字段路径标记，检查器必命中而它不是文件）。
    assert.ok(readFileSync(join(outDir, 'align-report.md'), 'utf-8').includes('steps/'));
}));

test('不开 shipAssets＝检查不跑（正文引用缺失文件的构建照样成功）', () => withProject((outDir) => {
    const broken = steps('另见 references/ghost.md。');
    const { files } = build(outDir, broken, false);
    assert.ok(files.length > 0, '构建照常完成');
    assert.ok(!files.some((f) => f.split(sep).join('/').includes('ghost')), '未搬运任何东西');
}));
