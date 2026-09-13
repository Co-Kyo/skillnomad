import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validate } from '../dist/index.js';

// 独立宿主证据（P1）：纯路径引用的 markdown 文档群——不依赖任何键表、不认业务概念。
// 真实文档宿主（remark/markdown-it 抽取）在 P2；此处证明"离开键表与框架也能用"。

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');
const fixtures = join(here, 'fixtures-docs');
const bin = join(pkgRoot, 'bin', 'markrefs.mjs');

const readJson = (file) => JSON.parse(readFileSync(join(fixtures, file), 'utf8'));
const io = { exists: (path) => existsSync(join(fixtures, path)) };
const emptyKeys = { entries: [] };

function cliRun(args) {
    const result = spawnSync(process.execPath, [bin, ...args], { cwd: fixtures, encoding: 'utf8' });
    return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

test('文档群：无键表、纯路径引用（含片段）全绿 → CLI 退 0', () => {
    assert.deepEqual(validate(readJson('refs.json').refs, emptyKeys, io), []);

    const run = cliRun(['check', '--keys', 'keys-empty.json', '--refs', 'refs.json']);
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /✓ 通过/);
});

test('文档群：一处路径不存在 → CLI 退 1 且指出 file:line（无键表也拦得住）', () => {
    const run = cliRun(['check', '--keys', 'keys-empty.json', '--refs', 'refs-broken.json']);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /docs\/guide\/setup\.md:21/);
    assert.match(run.stderr, /missing-target/);
});
