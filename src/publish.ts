// ============================================================
// 发布布局：由「角色」派生「发布路径」（Agent Skills 官方词表 ＋ steps/ 扩展）
// ------------------------------------------------------------
// 官方标准（agentskills.io/specification）：SKILL.md ＋ references/（文档）＋
// assets/（静态资源：模板/图片/数据文件）＋ scripts/（可执行代码）＋ `...`（允许追加目录）。
// 本框架的扩展只有一条：长流程多步管线需要「每步一组文件」，即 steps/<NN>-<步id>/。
//
// 分工（谁定什么）：
//   消费者 —— ①哪个文件是资产（源位置，自由）；②它的角色（scope=skill|step，step 归属）
//   框架   —— 由角色派生发布位置；并校验（落根／保留名／唯一性／产物无源码形态路径）
// 消费者不写发布路径：路径是派生物，写错无处可改，漏改就会静默断链。
// ============================================================

import { basename, extname } from 'node:path';

/** 官方目录 ＋ 唯一扩展。 */
export const PUBLISH_DIRS = {
    steps: 'steps',
    references: 'references',
    assets: 'assets',
    scripts: 'scripts',
} as const;

/** 每步的执行文件名（steps/<NN>-<步id>/ 内的保留名）。 */
export const STEP_ENTRY_FILE = 'step.md';

/** 文档类扩展名 → references/；其余（数据文件、脚本等）→ assets/。 */
const DOC_EXTENSIONS = new Set(['.md', '.markdown']);

/** 一条「随包分发」的资产声明：源路径 ＋ 角色。 */
export interface PublishableAsset {
    /** 源路径（消费者自由决定文件放哪） */
    path: string;
    /** 角色：skill＝技能级共享；step＝某步自有 */
    scope: 'skill' | 'step';
    /** scope==='step' 时的归属步 id */
    step?: string;
}

/** 发布布局诊断（与既有校验同形：stepId／field／message）。 */
export interface PublishDiagnostic {
    stepId: string;
    field: string;
    message: string;
}

/**
 * 由角色派生发布路径。
 * - scope='step' → `steps/<NN>-<步id>/<文件名>`（NN 与 steps/<NN>-<步id>/step.md 同源，两位补零）
 * - scope='skill' → 文档进 `references/<文件名>`；数据文件进 `assets/<文件名>`
 * 返回 null 表示无法派生（归属步不存在），由 checkPublishLayout 报错。
 */
export function publishPath(
    asset: PublishableAsset,
    seqOf: (stepId: string) => number | undefined,
): string | null {
    const name = basename(asset.path);
    if (asset.scope === 'step') {
        if (!asset.step) return null;
        const seq = seqOf(asset.step);
        if (seq === undefined) return null;
        return `${PUBLISH_DIRS.steps}/${String(seq).padStart(2, '0')}-${asset.step}/${name}`;
    }
    const ext = extname(name).toLowerCase();
    return DOC_EXTENSIONS.has(ext)
        ? `${PUBLISH_DIRS.references}/${name}`
        : `${PUBLISH_DIRS.assets}/${name}`;
}

/** 校验：① 归属步存在；② 保留名未被占用；③ 派生目标全局唯一（重名即红，不自动改名）。 */
export function checkPublishLayout(
    assets: readonly PublishableAsset[],
    steps: readonly { id: string; seq: number }[],
): PublishDiagnostic[] {
    const seqOf = (id: string): number | undefined => steps.find((s) => s.id === id)?.seq;
    const diagnostics: PublishDiagnostic[] = [];
    const targets = new Map<string, string>(); // 派生目标 → 首个来源

    // 每步执行文件占位（保留目标：steps/<NN>-<步id>/step.md）
    for (const step of steps) {
        targets.set(`${PUBLISH_DIRS.steps}/${String(step.seq).padStart(2, '0')}-${step.id}/${STEP_ENTRY_FILE}`, `步骤执行文件（${step.id}）`);
    }

    for (const asset of assets) {
        const owner = asset.scope === 'step' ? (asset.step ?? '(未知)') : '(skill)';
        if (asset.scope === 'step' && (!asset.step || seqOf(asset.step) === undefined)) {
            diagnostics.push({
                stepId: asset.step ?? '(publish)',
                field: 'publish.path',
                message: `资产归属步不存在：${asset.path}（scope='step' 但 step='${String(asset.step)}' 不在链上）`,
            });
            continue;
        }
        const target = publishPath(asset, seqOf);
        if (target === null) continue;

        if (basename(target) === STEP_ENTRY_FILE || basename(target).toUpperCase() === 'SKILL.MD') {
            diagnostics.push({
                stepId: owner,
                field: 'publish.path',
                message: `资产占用保留名：${asset.path} → ${target}（保留名：${STEP_ENTRY_FILE}／SKILL.md，请改名）`,
            });
            continue;
        }
        const first = targets.get(target);
        if (first !== undefined) {
            diagnostics.push({
                stepId: owner,
                field: 'publish.path',
                message: `发布路径冲突：${target} ← 已被 ${first} 占用，本资产为 ${asset.path}（同名即红：请改名，或用显式覆盖）`,
            });
            continue;
        }
        targets.set(target, asset.path);
    }
    return diagnostics;
}

/** 源码形态路径：以 `src/` 起始段的路径（`experiment/src/` 这类运行期路径不算）。 */
const SOURCE_PATH_RE = /(?<![\w./-])src\/[A-Za-z0-9_./*{}-]*/g;

// 引用前缀＝发布目录名（PUBLISH_DIRS）＋ 源码侧遗留名（历史布局：写了就是断链）
const REF_PREFIXES = [...Object.values(PUBLISH_DIRS), 'src', 'processes', 'plugins'];

/** 包内路径引用：以发布目录名起始、带文件段的路径（`steps/` 这类裸目录名不算）。 */
const PACKAGE_REF_RE = new RegExp(
    `(?<![\\w./{}-])((?:${REF_PREFIXES.join('|')})\\/[A-Za-z0-9_][A-Za-z0-9_./-]*)`,
    'g',
);

/** 校验 2b：随包文本里的包内路径引用必须能在包内解析。
 *  判据由调用方给（组装期＝磁盘实存；测试期＝派生目标集合），
 *  这样"包内自洽"这条规则只有一处定义，不缺读者。
 *  运行期模板（含 {}）与通配（含 *）不参与：它们不是路径，是模板。 */
export function scanDanglingRefs(
    files: readonly { rel: string; content: string }[],
    resolve: (ref: string) => boolean,
): { rel: string; line: number; ref: string }[] {
    const hits: { rel: string; line: number; ref: string }[] = [];
    for (const file of files) {
        file.content.split('\n').forEach((text, index) => {
            for (const match of text.matchAll(PACKAGE_REF_RE)) {
                const ref = match[1].replace(/[./]+$/, '');
                if (ref.includes('{') || ref.includes('*')) continue;
                if (!resolve(ref)) hits.push({ rel: file.rel, line: index + 1, ref });
            }
        });
    }
    return hits;
}

/**
 * 校验 1b：渲染产物文本里不得出现源码形态路径。
 * 结构化字段已在渲染期翻译成发布形态；这里专抓散文（内容域字符串）里手写的源码路径。
 */
export function scanSourcePaths(
    files: readonly { rel: string; content: string }[],
): { rel: string; line: number; snippet: string }[] {
    const hits: { rel: string; line: number; snippet: string }[] = [];
    for (const file of files) {
        file.content.split('\n').forEach((text, index) => {
            const match = text.match(SOURCE_PATH_RE);
            if (match) hits.push({ rel: file.rel, line: index + 1, snippet: match[0] });
        });
    }
    return hits;
}
