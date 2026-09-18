// 内容包装载器测试（声明式包：框架读懂 skill.json ＋ blocks ＋ compose）
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    blockingPackageDiagnostics,
    checkPackage,
    loadPackage,
    packageModule,
    readPackageManifest,
} from '../dist/index.js';

const FIXTURE = fileURLToPath(new URL('./fixtures/package-basic', import.meta.url));

/** 复制夹具到临时目录（破坏性用例不改夹具本体）。 */
function copyFixture() {
    const dir = mkdtempSync(join(tmpdir(), 'skillnomad-pkg-'));
    cpSync(FIXTURE, dir, { recursive: true });
    return dir;
}

test('装载：身份取自 package.json，语义取自 skill.json', () => {
    const { name, version, manifest } = readPackageManifest(FIXTURE);
    assert.equal(name, '@fixture/demo-method');
    assert.equal(version, '0.1.0');
    assert.equal(manifest.standard, 'skillnomad-skill-package/v1');
    assert.equal(manifest.tier, 'incubating');
    assert.deepEqual(manifest.compose, ['demo-when', 'demo-how']);
});

test('组合：正文按 compose 顺序拼装，标记解析成被引块标题', () => {
    const loaded = loadPackage(FIXTURE);
    assert.deepEqual(loaded.parts, [{ target: 'demo-when' }, { useMethod: 'demo-how' }]);
    assert.ok(loaded.body.startsWith('# 适用'), '首块应为 compose 第一位');
    assert.ok(loaded.body.includes('# 做法'), '次块应随后');
    assert.ok(!loaded.body.includes('[['), '产物不得残留引用标记');
    assert.ok(loaded.body.includes('《适用》'), '标记应解析成被引块标题');
});

test('组合：块名 → 路径的引用全部可解析（名字表＋引用登记）', () => {
    const loaded = loadPackage(FIXTURE);
    const { composition } = checkPackage(FIXTURE);
    assert.deepEqual(blockingPackageDiagnostics(FIXTURE), []);
    assert.ok(loaded.refs.length >= loaded.manifest.compose.length, '组合声明应逐条登记');
    assert.deepEqual(composition.filter((d) => d.ruleId === 'missing-key'), []);
});

test('模块对象：render 返回组合正文，身份取清单的 module 声明', () => {
    const mod = packageModule(FIXTURE);
    assert.equal(mod.id, 'demo-methods');
    assert.equal(mod.kind, 'method');
    assert.equal(mod.version, '0.1.0');
    assert.equal(mod.render(), loadPackage(FIXTURE).body);
});

test('反例：引用了未声明的块 → 装载即抛错（不静默）', () => {
    const dir = copyFixture();
    try {
        writeFileSync(join(dir, 'blocks/how.md'), '# 做法\n\n见 [[demo-ghost]]。\n');
        assert.throws(() => loadPackage(dir), /未在清单声明的块 demo-ghost/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('反例：块文件缺失 → 引用校验报 missing-target', () => {
    const dir = copyFixture();
    try {
        rmSync(join(dir, 'blocks/when.md'));
        assert.throws(() => loadPackage(dir), /ENOENT|no such file/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('反例：清单缺 standard／tier → 装载即拒', () => {
    const dir = copyFixture();
    try {
        writeFileSync(join(dir, 'skill.json'), JSON.stringify({ method: {}, compose: ['a'], blocks: [] }));
        assert.throws(() => readPackageManifest(dir), /standard／tier/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('反例：裸提名字不建立引用（只有 [[ ]] 才是引用）', () => {
    const dir = copyFixture();
    try {
        writeFileSync(join(dir, 'blocks/how.md'), '# 做法\n\n这里只是提到 demo-when 这个名字。\n');
        const loaded = loadPackage(dir);
        const markerRefs = loaded.refs.filter((r) => r.site === 'blocks/how.md');
        assert.deepEqual(markerRefs, [], '裸提名字不应产生引用登记');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
