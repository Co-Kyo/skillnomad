// demo 配套门：仓内 demo（demos/panel2doc）必须始终能用当前源码构建，
// 且产物必须体现「一个 wish ＋ 多条 target ＋ 每条 target 有判据撑着」的形态。
//
// 为什么单开一片：demo 是框架仓内的验证件，但它此前不在 CI、也没有任何测试构建它，
// 于是它悄悄落后过两代（release/ 里躺着旧形态产物，无人发现）。本片就是那道缺失的守门。
//
// 离线可跑：demo 依赖 skillnomad 用 file:../.. 声明（指向框架根），
// CI 的 npm ci 会把 workspaces 外的 file: 依赖按链接装好；本测试自身直接调
// 本仓 dist/bin/cli.js 构建 demo，只依赖本仓 dist/ 已构建（CI 顺序 build → test 已保证）。
import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const cli = join(pkgRoot, 'dist', 'bin', 'cli.js');
const demoRoot = join(pkgRoot, 'demos', 'panel2doc');
const outRoot = join(demoRoot, 'out', 'steps');

function buildDemo() {
    return spawnSync(process.execPath, [cli, 'build', 'skillnomad.config.ts'], {
        cwd: demoRoot,
        encoding: 'utf8',
    });
}

/** 从 demo 声明里抽出「步骤 id → 该步声明的 target 文案」，作为产物对账的真相源。 */
function declaredTargets() {
    const src = readFileSync(join(demoRoot, 'src', 'steps.ts'), 'utf-8');
    const steps = [];
    // 每个 step(...) 块：抓 step('id', '…') 到下一个 step( 之前
    const blocks = src.split(/(?=\bstep\()/).slice(1);
    for (const block of blocks) {
        const idm = block.match(/step\(\s*'([^']+)'/);
        if (!idm) continue;
        const claims = [...block.matchAll(/\.target\(\s*'[^']*'\s*,\s*'([^']*)'/g)].map(m => m[1]);
        steps.push({ id: idm[1], claims });
    }
    return steps;
}

test('demo 配套：能用当前源码构建，产物落盘', () => {
    const run = buildDemo();
    assert.equal(run.status, 0, 'demo 构建失败：\n' + run.stderr + run.stdout);
    assert.match(run.stdout, /Done\. \d+ files written\./);
    assert.ok(existsSync(outRoot), 'demo 产物目录应存在');
});

test('demo 配套：每步产物都有「意图」章与「目标」章', () => {
    const run = buildDemo();
    assert.equal(run.status, 0, run.stderr);

    const dirs = readdirSync(outRoot);
    assert.ok(dirs.length >= 2, 'demo 至少应有 2 步');
    for (const dir of dirs) {
        const md = readFileSync(join(outRoot, dir, 'step.md'), 'utf-8');
        assert.ok(md.includes('## 意图'), `${dir} 缺「意图」章`);
        assert.ok(md.includes('## 目标'), `${dir} 缺「目标」章`);
    }
});

test('demo 配套：声明的每条 target 都进了产物，且每条都有判据撑着', () => {
    const run = buildDemo();
    assert.equal(run.status, 0, run.stderr);

    const declared = declaredTargets();
    assert.ok(declared.length >= 2, '应至少抽到 2 个步骤的声明');
    let totalTargets = 0;

    for (const { id, claims } of declared) {
        assert.ok(claims.length > 0, `${id} 未声明任何 target（模型要求至少一条）`);
        const dir = readdirSync(outRoot).find(d => d.endsWith(`-${id}`));
        assert.ok(dir, `产物里找不到步骤 ${id}`);
        const md = readFileSync(join(outRoot, dir, 'step.md'), 'utf-8');

        for (const claim of claims) {
            assert.ok(md.includes(claim), `${id} 声明的 target 未进产物：${claim}`);
        }
        totalTargets += claims.length;

        // 结构门：每个编号目标下必须至少有一行判据（机器判据或人工判据）
        const targetBlock = md.split('## 目标')[1]?.split(/\n## /)[0] ?? '';
        const numbered = targetBlock.split('\n').filter(l => /^\d+\.\s/.test(l));
        assert.equal(numbered.length, claims.length, `${id} 产物目标条数与声明不符`);
        for (const line of numbered) {
            assert.ok(line.trim().length > 0, `${id} 有空目标行`);
        }
        const evidence = targetBlock.split('\n').filter(l => l.trim().startsWith('- ') && l.includes('判据'));
        assert.ok(evidence.length >= numbered.length,
            `${id} 有目标没有判据撑着（判据行 ${evidence.length} < 目标 ${numbered.length}）`);
    }
    assert.ok(totalTargets >= 4, 'demo 全仓 target 总数应 ≥ 4（当前声明 6 条）');
});
