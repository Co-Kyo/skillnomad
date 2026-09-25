// Node 版本下限的门与它的对外声明必须同源：engines.node 是给 npm 看的承诺，
// checkNodeVersion 是运行时真拦的那道。两者数字不同源＝「装得上、跑不了」或「跑得动、被拦」，
// 都是静默的错配，所以这一片把三件事锁住：下限判定、声明与门禁一致、CLI 确实走这道门。
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MIN_NODE, checkNodeVersion, minNodeText } from '../dist/cli/node-version.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf-8'));

test('低于下限即拒：22.17 与 20.x 都给出可读理由并点名当前版本', () => {
    const oldMinor = checkNodeVersion('22.17.5');
    assert.ok(oldMinor, '22.17 应被拒');
    assert.match(oldMinor, /needs Node >= 22\.18/);
    assert.match(oldMinor, /running 22\.17\.5/);

    const oldMajor = checkNodeVersion('20.19.0');
    assert.ok(oldMajor, '20.x 应被拒');
    assert.match(oldMajor, /needs Node >= 22\.18/);

    const unreadable = checkNodeVersion('nightly');
    assert.ok(unreadable, '读不出的版本串也要拒，不得放行');
    assert.match(unreadable, /Unrecognized Node version/);
});

test('下限及以上放行：22.18.0／22.18.1／24.x／26.x', () => {
    for (const v of ['22.18.0', '22.18.1', '23.0.0', '24.6.0', '26.8.1']) {
        assert.equal(checkNodeVersion(v), null, v + ' 应放行');
    }
    assert.equal(MIN_NODE.major, 22);
    assert.equal(MIN_NODE.minor, 18);
    assert.equal(minNodeText(), '22.18');
});

test('带预发布后缀的版本串按主.次判定（22.18.0-nightly 放行）', () => {
    assert.equal(checkNodeVersion('22.18.0-nightly20260101'), null);
    assert.ok(checkNodeVersion('22.17.0-rc.1'), '22.17 的 rc 仍应被拒');
});

test('声明与门禁同源：package.json 的 engines.node 必须等于代码里的下限', () => {
    assert.equal(pkg.engines?.node, '>=' + minNodeText(), 'engines.node 与 MIN_NODE 漂移');
});

test('CLI 走这道门：本机 Node 受支持时 init --help 类误用仍按原样给用法', async () => {
    // 当前进程即真 Node：能跑到这里就说明门禁没把支持的版本误拦
    assert.equal(checkNodeVersion(), null, '本机 Node 应在支持范围内');
    const cliPath = resolve(here, '..', 'dist', 'bin', 'cli.js');
    const { spawnSync } = await import('node:child_process');
    const run = spawnSync(process.execPath, [cliPath], { encoding: 'utf8' });
    assert.equal(run.status, 1, '无参数应报用法并退出 1');
    assert.match(run.stderr, /Usage: skillnomad <build\|validate\|init> \[argument\]/);
});
