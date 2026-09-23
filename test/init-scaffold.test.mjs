// skillnomad init：脚手架的三条判据——建得出、拦得住、建完真能构建。
//
// 为什么单开一片：init 的失败形态是「给作者一个跑不起来的第一次」——文件漏了、占位名没换净、
// 包名不合法装不上依赖、目标目录非空被覆盖。这些都在第一次跑通时暴露，必须有门。
// 构建那条用 node_modules 自指链接跑通（不联网），证明模板与当前源码确实可构建。
import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const cli = join(pkgRoot, 'dist', 'bin', 'cli.js');
const FRAMEWORK_VERSION = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf-8')).version;
const TEMPLATE_FILES = [
    'package.json', 'skill.ts', 'skillnomad.config.ts', 'tsconfig.json',
    'src/steps/collect.ts', 'src/steps/review.ts', 'assets/common/shared-rule.md',
];

function runInit(target) {
    return spawnSync(process.execPath, [cli, 'init', target], { encoding: 'utf8' });
}

/** 起一个临时父目录（用完即删），把路径交给 fn。 */
function withScratch(fn) {
    const root = mkdtempSync(join(tmpdir(), 'skillnomad-init-'));
    try {
        return fn(root);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
}

test('init：建出模板全部文件，占位名换净、依赖钉到当前版本', () => {
    withScratch((root) => {
        const proj = join(root, 'my-first-skill');
        const run = runInit(proj);
        assert.equal(run.status, 0, run.stderr);
        assert.match(run.stdout, /建好 7 个文件/);

        for (const rel of TEMPLATE_FILES) {
            assert.ok(existsSync(join(proj, rel)), `缺文件 ${rel}`);
        }
        const pkg = JSON.parse(readFileSync(join(proj, 'package.json'), 'utf-8'));
        assert.equal(pkg.name, 'my-first-skill', '包名应取目录名');
        assert.equal(pkg.dependencies.skillnomad, FRAMEWORK_VERSION, '依赖须钉死当前版本（禁 ^ ~）');
        assert.match(readFileSync(join(proj, 'skill.ts'), 'utf-8'), /name: 'my-first-skill'/, 'meta.name 须同步');

        // 模板占位名不得有任何残留
        for (const rel of TEMPLATE_FILES) {
            assert.ok(!readFileSync(join(proj, rel), 'utf-8').includes('my-skill'), `占位名残留：${rel}`);
        }
    });
});

test('init：生成的项目真的可构建（自指链接，不联网）', () => {
    withScratch((root) => {
        const proj = join(root, 'buildable-skill');
        assert.equal(runInit(proj).status, 0);

        // 把包名指向本仓（等价于消费者装到的那份包），从而离线验证模板可构建。
        // 另链一个 typescript 进去，并刻意不提供任何 @types——下面 typecheck 那条
        // 断言的正是「模板不需要 @types 也能过类型门」。
        mkdirSync(join(proj, 'node_modules'), { recursive: true });
        symlinkSync(pkgRoot, join(proj, 'node_modules', 'skillnomad'), 'dir');
        symlinkSync(join(pkgRoot, 'node_modules', 'typescript'), join(proj, 'node_modules', 'typescript'), 'dir');

        const build = spawnSync(process.execPath, [cli, 'build', 'skillnomad.config.ts'], { cwd: proj, encoding: 'utf8' });
        assert.equal(build.status, 0, build.stderr + build.stdout);
        assert.match(build.stdout, /00: collect/);
        assert.match(build.stdout, /01: review/);
        assert.ok(existsSync(join(proj, 'dist', 'skill', 'SKILL.md')), '应产出 SKILL.md');
        assert.ok(existsSync(join(proj, 'dist', 'skill', 'steps', '01-review', 'step.md')), '应产出每步执行文件');

        // 模板声明的两个脚本都要真成立：typecheck 依赖 tsconfig 与 devDeps 自洽
        // （本轮把 @types/node 与 types:[node] 从模板移除，此处即其唯一机器背书）
        const tsc = spawnSync(join(pkgRoot, 'node_modules', '.bin', 'tsc'), ['-p', 'tsconfig.json'], { cwd: proj, encoding: 'utf8' });
        assert.equal(tsc.status, 0, '模板 typecheck 应通过：' + tsc.stdout + tsc.stderr);
    });
});

test('init：目标目录非空即拒绝，且不改动已有文件', () => {
    withScratch((root) => {
        const keep = join(root, 'occupied', 'KEEP.md');
        mkdirSync(dirname(keep), { recursive: true });
        writeFileSync(keep, 'original\n', 'utf-8');

        const run = runInit(join(root, 'occupied'));
        assert.equal(run.status, 1, '非空目录应拒绝');
        assert.match(run.stderr, /目标目录非空/);
        assert.equal(readFileSync(keep, 'utf-8'), 'original\n', '已有文件不得被动');
        assert.ok(!existsSync(join(root, 'occupied', 'skill.ts')), '不得写入任何模板文件');
    });
});

test('init：目录名净化成合法包名（前导点号与非法字符不致生成装不上的包）', () => {
    withScratch((root) => {
        const dir = join(root, '.weird_name');
        const run = runInit(dir);
        assert.equal(run.status, 0, run.stderr);
        const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
        assert.equal(pkg.name, 'weird-name', '前导点号须去掉、下划线须转连字符');
        assert.match(pkg.name, /^[a-z0-9][a-z0-9.~-]*$/, '结果必须是合法 npm 包名');
        assert.match(readFileSync(join(dir, 'skill.ts'), 'utf-8'), /name: 'weird-name'/, 'meta.name 与包名同源');
    });
});

test('init：目录名转不出任何合法项目名即拒绝（不得落盘）', () => {
    withScratch((root) => {
        const dir = join(root, '中文');
        const run = runInit(dir);
        assert.equal(run.status, 1, '全非 ASCII 的目录名转不出包名');
        assert.match(run.stderr, /不能用作项目名/);
        assert.ok(!existsSync(join(dir, 'package.json')), '拒绝即不得落盘');
    });
});
