import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isDiagnostic, mode, resolve, validate } from '../dist/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');
const fixtures = join(here, 'fixtures');
const bin = join(pkgRoot, 'bin', 'markrefs.mjs');

const readJson = (file) => JSON.parse(readFileSync(join(fixtures, file), 'utf8'));
const io = { exists: (path) => existsSync(join(fixtures, path)) };
const only = (diagnostics, ruleId) => diagnostics.filter((d) => d.ruleId === ruleId);

function cliRun(args) {
    const result = spawnSync(process.execPath, [bin, ...args], {
        cwd: fixtures,
        encoding: 'utf8',
    });
    return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

// ---------- 解析（六形态） ----------

test('① 对象直传：名字在表、目标存在 → 无诊断', () => {
    const keys = readJson('keys.json');
    const ref = { site: 'src/one.ts:10', name: 'alpha' };
    const resolved = resolve(ref, keys);
    assert.ok(!isDiagnostic(resolved));
    assert.equal(resolved.path, 'docs/a.md');
    assert.equal(resolved.key, 'alpha');
    assert.deepEqual(validate([ref], keys, io), []);
});

test('② .path 取值（dynamic）：与对象直传同解析', () => {
    const keys = readJson('keys.json');
    const resolved = resolve({ site: 'src/two.ts:4', name: 'alpha', dynamic: true }, keys);
    assert.ok(!isDiagnostic(resolved));
    assert.equal(resolved.path, 'docs/a.md');
});

test('③ 通配（显式实例列表）：逐实例展开，无诊断', () => {
    const keys = readJson('keys.json');
    const ref = { site: 'src/three.ts:4', wildcard: { instances: ['docs/a.md', 'docs/b.md'] } };
    const resolved = resolve(ref, keys);
    assert.ok(Array.isArray(resolved));
    assert.deepEqual(resolved.map((r) => r.path), ['docs/a.md', 'docs/b.md']);
    assert.deepEqual(validate([ref], keys, io), []);
});

test('④ 片段：解析带 fragment（P0 只透传）', () => {
    const keys = readJson('keys.json');
    const resolved = resolve({ site: 'src/three.ts:8', name: 'payload', fragment: 'capabilities' }, keys);
    assert.ok(!isDiagnostic(resolved));
    assert.equal(resolved.path, 'docs/data.json');
    assert.equal(resolved.fragment, 'capabilities');
});

test('⑤ 直查表：同对象直传；mode() 默认 ref', () => {
    const keys = readJson('keys.json');
    const ref = { site: 'src/four.ts:2', name: 'beta' };
    const resolved = resolve(ref, keys);
    assert.ok(!isDiagnostic(resolved));
    assert.equal(resolved.path, 'docs/b.md');
    assert.equal(mode(ref, keys), 'ref');
});

test('⑥ 裸路径：不查表、直通＋存在性', () => {
    const keys = readJson('keys.json');
    const ref = { site: 'src/four.ts:6', path: 'docs/data.json' };
    const resolved = resolve(ref, keys);
    assert.ok(!isDiagnostic(resolved));
    assert.equal(resolved.path, 'docs/data.json');
    assert.deepEqual(validate([ref], keys, io), []);
});

// ---------- 校验（两项 + 重复） ----------

test('⑦ missing-key：名字不在表中 → error', () => {
    const keys = readJson('keys.json');
    const diagnostics = validate(readJson('refs-missing-key.json').refs, keys, io);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].ruleId, 'missing-key');
    assert.equal(diagnostics[0].severity, 'error');
    assert.equal(diagnostics[0].site, 'src/one.ts:3');
});

test('⑧ missing-target：键在表、文件不存在 → error', () => {
    const keys = readJson('keys-missing-target.json');
    const diagnostics = validate(readJson('refs-missing-target.json').refs, keys, io);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].ruleId, 'missing-target');
    assert.equal(diagnostics[0].severity, 'error');
    assert.equal(diagnostics[0].site, 'src/one.ts:9');
});

test('⑨ duplicate-key 同 scope → error', () => {
    const keys = readJson('keys-dup-same-scope.json');
    const diagnostics = only(validate(readJson('refs-alpha.json').refs, keys, io), 'duplicate-key');
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].severity, 'error');
});

test('⑩ duplicate-key 跨 scope → warn', () => {
    const keys = readJson('keys-dup-cross-scope.json');
    const diagnostics = only(validate(readJson('refs-alpha.json').refs, keys, io), 'duplicate-key');
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].severity, 'warn');
});

test('⑪ duplicate-decl：同一声明源内同一目标两次 → error', () => {
    const keys = readJson('keys.json');
    const diagnostics = only(validate(readJson('refs-duplicate-decl.json').refs, keys, io), 'duplicate-decl');
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].severity, 'error');
    assert.equal(diagnostics[0].site, 'src/one.ts:9');
});

// ---------- 反向验证（"没做成"的定义） ----------

test('⑫ 造 missing-target → CLI 退 1 且指出 file:line', () => {
    const run = cliRun(['check', '--keys', 'keys-missing-target.json', '--refs', 'refs-missing-target.json']);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /src\/one\.ts:9/);
    assert.match(run.stderr, /missing-target/);
});

test('⑬ 造 duplicate-key（同 scope）→ CLI 退 1', () => {
    const run = cliRun(['check', '--keys', 'keys-dup-same-scope.json', '--refs', 'refs-alpha.json']);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /duplicate-key/);
});

test('⑭ 全绿 → 退 0；--strict 下 warn 变退 1', () => {
    const ok = cliRun(['check', '--keys', 'keys.json', '--refs', 'refs-ok.json']);
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /✓ 通过/);

    const loose = cliRun(['check', '--keys', 'keys-dup-cross-scope.json', '--refs', 'refs-alpha.json']);
    assert.equal(loose.status, 0, loose.stderr);

    const strict = cliRun(['check', '--keys', 'keys-dup-cross-scope.json', '--refs', 'refs-alpha.json', '--strict']);
    assert.equal(strict.status, 1);
});

// ---------- 边界不变量（机器可查） ----------

test('⑮ 公共 API 词汇自检：出现业务词即失败', () => {
    const forbidden = /(^|[^a-zA-Z])(step|skill|phase|checkpoint|pipeline|scenario|refOf|sourcemodule)([^a-zA-Z]|$)/i;
    const sources = readdirSync(join(pkgRoot, 'src')).map((f) => join(pkgRoot, 'src', f));
    sources.push(join(pkgRoot, 'dist', 'index.d.ts'));
    for (const file of sources) {
        const text = readFileSync(file, 'utf8');
        const hit = text.match(forbidden);
        assert.equal(hit, null, `${file} 含业务词：${hit?.[0]}`);
    }
});

// ---------- 清单自检（防用例腐烂） ----------

test('⑯ 每个 fixture 至少被本文件引用一次（防用例腐烂）', () => {
    const used = readFileSync(fileURLToPath(import.meta.url), 'utf8');
    for (const file of readdirSync(fixtures)) {
        if (file === 'docs') continue;
        assert.ok(used.includes(file), `fixture 未被使用：${file}`);
    }
    for (const file of readdirSync(join(fixtures, 'docs'))) {
        assert.ok(used.includes(file), `fixture 未被使用：docs/${file}`);
    }
});

// ---------- 增补（P1）：duplicate-path（同 scope 内两个名字登记同一路径） ----------

test('⑰ duplicate-path：同 scope 两名同路径 → warn；默认不拦、--strict 才拦', () => {
    const keys = readJson('keys-dup-path-same-scope.json');
    const diagnostics = only(validate(readJson('refs-alpha.json').refs, keys, io), 'duplicate-path');
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].severity, 'warn');
    assert.match(diagnostics[0].message, /alpha \/ alphaAlias/);

    const loose = cliRun(['check', '--keys', 'keys-dup-path-same-scope.json', '--refs', 'refs-alpha.json']);
    assert.equal(loose.status, 0, loose.stderr);

    const strict = cliRun(['check', '--keys', 'keys-dup-path-same-scope.json', '--refs', 'refs-alpha.json', '--strict']);
    assert.equal(strict.status, 1);
    assert.match(strict.stderr, /duplicate-path/);
});

test('⑱ duplicate-path：跨 scope 同名路径 → 视为别名，不报', () => {
    const keys = readJson('keys-dup-path-cross-scope.json');
    assert.deepEqual(validate(readJson('refs-alpha.json').refs, keys, io), []);
});
