import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// P1 E2E：真实 CLI 跑最小 skill 源的 md-deps 校验——缺引用必须让构建失败（"拦不住＝没做成"）。
// 夹具为纯 ESM（不经 tsx），模式用 env 切换：ok / missing-target / missing-key / dup-path / drift。

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');
const appDir = join(here, 'fixtures', 'md-deps-app');
const cli = join(pkgRoot, 'dist', 'bin', 'cli.js');
const outDir = join(appDir, 'out');

function build(mode, strict = false) {
  const result = spawnSync(process.execPath, [cli, 'build', 'skillnomad.config.mjs'], {
    cwd: appDir,
    encoding: 'utf8',
    env: { ...process.env, MD_DEPS_MODE: mode, MD_DEPS_STRICT: strict ? '1' : '' },
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

test('ok：引用目标存在 + 模板路径跳过 → 构建通过，报告计数', () => {
  const run = build('ok');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /md-deps：2 条引用（1 条判存在性，1 条模板跳过）/);
  assert.match(run.stdout, /Validation passed ✓/);
});

test('missing-target：引用目标不存在 → 构建失败，诊断带 file:line 与 ruleId', () => {
  const run = build('missing-target');
  assert.equal(run.status, 1);
  assert.match(run.stderr, /missing-target/);
  assert.match(run.stderr, /skill\.mjs:\d+/);
  assert.match(run.stderr, /Validation failed with \d+ error\(s\)/);
});

test('missing-key：名字不在键表 → 构建失败', () => {
  const run = build('missing-key');
  assert.equal(run.status, 1);
  assert.match(run.stderr, /missing-key/);
  assert.match(run.stderr, /名字不在表中：alpha/);
});

test('duplicate-path：同 scope 两名同路径 → 默认打印不拦；strict 下拦', () => {
  const loose = build('dup-path');
  assert.equal(loose.status, 0, loose.stderr);
  assert.match(loose.stdout, /duplicate-path/);

  const strict = build('dup-path', true);
  assert.equal(strict.status, 1);
  assert.match(strict.stderr, /duplicate-path/);
});

test('drift：名字→键表路径 与 本地路径不一致 → 构建失败（宿主级问题）', () => {
  const run = build('drift');
  assert.equal(run.status, 1);
  assert.match(run.stderr, /名字与本地路径不一致/);
});

test('off：不配 mdDeps → 旧行为不变（无 md-deps 行，构建通过）', () => {
  const run = build('off');
  assert.equal(run.status, 0, run.stderr);
  assert.doesNotMatch(run.stdout, /md-deps：/);
  assert.match(run.stdout, /Validation passed ✓/);
});

test.after(() => {
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
});
