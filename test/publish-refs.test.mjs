// 发布布局：派生表（角色 → 发布路径）与「包内引用可解析」两件框架职责的锁。
// 为什么单开一片：这两条都是"消费者不写路径、框架派生并校验"的核心承诺，
// 出错的形态是静默断链（产物里有路径字样、包内却没有那个文件），必须有测试兜。
import assert from 'node:assert/strict';
import test from 'node:test';
import { PUBLISH_DIRS, STEP_ENTRY_FILE, checkPublishLayout, publishPath, scanDanglingRefs } from '../dist/index.js';

const seqOf = (id) => ({ alpha: 0, beta: 3 })[id];
const steps = [{ id: 'alpha', seq: 0 }, { id: 'beta', seq: 3 }];

test('publishPath:步自有 → steps/<NN>-<步id>/<文件名>（序号两位补零，与 step.md 同源）', () => {
    assert.equal(
        publishPath({ path: 'src/steps/beta/assets/schemas.md', scope: 'step', step: 'beta' }, seqOf),
        `${PUBLISH_DIRS.steps}/03-beta/schemas.md`,
    );
    assert.equal(
        publishPath({ path: 'assets/00-alpha/x.md', scope: 'step', step: 'alpha' }, seqOf),
        `${PUBLISH_DIRS.steps}/00-alpha/x.md`,
    );
});

test('publishPath:skill 级文档 → references/；数据文件 → assets/', () => {
    assert.equal(
        publishPath({ path: 'assets/common/ref-sources.md', scope: 'skill' }, seqOf),
        `${PUBLISH_DIRS.references}/ref-sources.md`,
    );
    assert.equal(
        publishPath({ path: 'assets/common/table.json', scope: 'skill' }, seqOf),
        `${PUBLISH_DIRS.assets}/table.json`,
    );
});

test('publishPath:归属步不在链上 → null（不猜路径）', () => {
    assert.equal(publishPath({ path: 'x/y.md', scope: 'step', step: 'ghost' }, seqOf), null);
    assert.equal(publishPath({ path: 'x/y.md', scope: 'step' }, seqOf), null);
});

test('checkPublishLayout:同名即红（不自动改名、不加序号）', () => {
    const d = checkPublishLayout(
        [
            { path: 'a/schemas.md', scope: 'step', step: 'alpha' },
            { path: 'b/schemas.md', scope: 'skill' },
            { path: 'c/schemas.md', scope: 'skill' },
        ],
        steps,
    );
    assert.equal(d.length, 1, `期望 1 条冲突，实得 ${JSON.stringify(d)}`);
    assert.match(d[0].message, /发布路径冲突/);
});

test('checkPublishLayout:保留名与归属步不存在各自报错', () => {
    const d = checkPublishLayout(
        [
            { path: 'a/step.md', scope: 'step', step: 'alpha' },
            { path: 'a/x.md', scope: 'step', step: 'ghost' },
        ],
        steps,
    );
    assert.equal(d.length, 2);
    assert.match(d.map((x) => x.message).join('\n'), /保留名/);
    assert.match(d.map((x) => x.message).join('\n'), /归属步不存在/);
});

test('checkPublishLayout:合法声明零诊断（每步 step.md 占位不算冲突）', () => {
    const d = checkPublishLayout(
        [
            { path: 'src/steps/alpha/assets/schemas.md', scope: 'step', step: 'alpha' },
            { path: 'assets/common/ref-sources.md', scope: 'skill' },
        ],
        steps,
    );
    assert.deepEqual(d, []);
});

test('scanDanglingRefs:老布局前缀与不存在目标即红', () => {
    const files = [
        { rel: 'steps/01-a/skip.md', content: '详见 `assets/00-a/schemas.md`\n域名表见 references/ref-sources.md' },
        { rel: 'references/p.md', content: '路由在 `processes/04-scan.md` 定义\n见 `src/steps/a/content.ts`' },
    ];
    const have = new Set(['references/ref-sources.md', 'steps/01-a/schemas.md']);
    const hits = scanDanglingRefs(files, (ref) => have.has(ref));
    assert.deepEqual(
        hits.map((h) => h.ref),
        ['assets/00-a/schemas.md', 'processes/04-scan.md', 'src/steps/a/content.ts'],
    );
});

test('scanDanglingRefs:运行期模板与「目录名+src」不误伤；解析得到的引用不报', () => {
    const files = [
        { rel: 'steps/02-b/step.md', content: '写 `{workDir}/.meta/x.json`；实验代码在 experiment/src/\n读 `steps/02-b/schemas.md` 与 `references/strategy-level.md`' },
    ];
    const have = new Set(['steps/02-b/schemas.md', 'references/strategy-level.md']);
    assert.deepEqual(scanDanglingRefs(files, (ref) => have.has(ref)), []);
});

test('scanDanglingRefs:行尾句点不误判（引用末尾的 . 与 / 会被削掉）', () => {
    const files = [{ rel: 'steps/01-a/step.md', content: 'See `steps/01-a/schemas.md`. And steps/01-a/.' }];
    const hits = scanDanglingRefs(files, (ref) => ref === 'steps/01-a/schemas.md' || ref === 'steps/01-a');
    assert.deepEqual(hits, []);
});

test('STEP_ENTRY_FILE 是步目录保留名（与派生表同源）', () => {
    assert.equal(STEP_ENTRY_FILE, 'step.md');
    assert.ok(
        !publishPath({ path: 'x/step.md', scope: 'skill' }, seqOf).startsWith(`${PUBLISH_DIRS.steps}/`),
        'skill 级不产生步目录（保留名只在步目录内生效）',
    );
});
