// ============================================================
// markrefs 集成（宿主侧适配层）
// ------------------------------------------------------------
// 框架把两样数据交给 markrefs：调用方声明的键表（keys）与登记出来的引用（refs）；
// 构建期跑解析与校验，诊断并入构建失败汇总。
// 本文件不认识业务概念：名字与 scope 是不透明字符串，位置只以 file[:line[:col]] 表达。
// ============================================================

import { existsSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    isBlocking,
    isDiagnostic,
    resolve,
    validate,
    type Diagnostic,
    type Io,
    type KeyMap,
    type RefDecl,
} from 'markrefs';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
/**
 * 站内帧的两种坐标：模块所在目录（dist/*.js 发布形态），以及它的 src/dist 兄弟目录
 * （tsx + source map 会把栈帧还原成 src/*.ts）。只过滤这两处，不吞包内的 test/ 等目录。
 */
const FRAMEWORK_DIRS = [MODULE_DIR, join(dirname(MODULE_DIR), basename(MODULE_DIR) === 'src' ? 'dist' : 'src')];

/** 占位符路径（工作目录/序号/短名等在运行时才实例化）构建期不可判存在性，跳过并计数。 */
const PLACEHOLDER = /[{}*]/;

const isPlaceholder = (path: string): boolean => PLACEHOLDER.test(path);

export interface RefOptions {
    /** '#' 后片段（只透传，不解释语义） */
    fragment?: string;
    /** 显式位置 file:line；缺省由调用栈取 */
    site?: string;
}

/** 引用登记条：名字与本地路径都给，便于检出"表里路径与本地路径不一致"。 */
export interface MdRefRecord {
    site: string;
    name?: string;
    path?: string;
    localPath?: string;
    fragment?: string;
}

export interface Refs {
    /** 登记一条"名字→路径"引用（名字供解析，本地路径只用于一致性核对与渲染）。 */
    ref(name: string, localPath: string, options?: RefOptions): void;
    /** 登记一条直接路径引用（不查表）。 */
    refPath(path: string, options?: RefOptions): void;
    /** 快照（按 site|name|path|localPath|fragment 去重，顺序即登记顺序）。 */
    snapshot(): MdRefRecord[];
    /** 清空（测试用）。 */
    clear(): void;
}

export interface RefsOptions {
    /** 包装层数：默认 1（调用方 helper 包一层，site 取 helper 的调用点）。0＝登记点即调用点。 */
    siteDepth?: number;
}

/** @category 工具整合 */
export interface MarkrefsConfig {
    keys: KeyMap;
    refs: Refs;
    /** 严格模式：warn 也计入失败。 */
    strict?: boolean;
}

export interface RefsCounts {
    /** 登记条数 */
    total: number;
    /** 构建期判过存在性的引用数 */
    checked: number;
    /** 占位符路径、构建期跳过判断的引用数 */
    skipped: number;
}

export interface RefsReport {
    /** markrefs 诊断（未过滤级别） */
    diagnostics: Diagnostic[];
    /** 按其级别＋strict 判定为阻断的诊断 */
    blocking: Diagnostic[];
    /** 宿主级问题（名字与本地路径漂移、键表声明了却没有引用等）——一律阻断 */
    problems: string[];
    counts: RefsCounts;
}

/** @category 工具整合 */
export function createRefs(options: RefsOptions = {}): Refs {
    const siteDepth = options.siteDepth ?? 1;
    const records: MdRefRecord[] = [];
    const seen = new Set<string>();
    const push = (record: MdRefRecord): void => {
        const key = [
            record.site,
            record.name ?? '',
            record.path ?? '',
            record.localPath ?? '',
            record.fragment ?? '',
        ].join('|');
        if (seen.has(key)) return;
        seen.add(key);
        records.push(record);
    };
    const withFragment = (record: MdRefRecord, fragment?: string): MdRefRecord =>
        fragment ? { ...record, fragment } : record;

    return {
        ref(name, localPath, refOptions = {}) {
            const site = refOptions.site ?? captureSite(siteDepth);
            push(withFragment({ site, name, localPath }, refOptions.fragment));
        },
        refPath(path, refOptions = {}) {
            const site = refOptions.site ?? captureSite(siteDepth);
            push(withFragment({ site, path }, refOptions.fragment));
        },
        snapshot: () => records.map((record) => ({ ...record })),
        clear() {
            records.length = 0;
            seen.clear();
        },
    };
}

/**
 * 取调用点位置。站内帧（本包与 node_modules）一律跳过，再按 siteDepth 上跳包装层；
 * 上跳越界时回落到最内层可解析帧。栈不可解析时返回 'unknown'（由宿主决定如何处理）。
 * 注：按"包根"过滤而非仅 dist——tsx 的 source map 会把栈帧还原成 src/*.ts 坐标。
 */
function captureSite(siteDepth: number): string {
    const stack = new Error().stack ?? '';
    const frames: { file: string; line: string; column: string }[] = [];
    for (const line of stack.split('\n').slice(1)) {
        const match = line.match(/\(?([^()\s]+):(\d+):(\d+)\)?\s*$/);
        if (!match) continue;
        const file = toFilePath(match[1]);
        if (file.startsWith('node:') || file.includes(`${sep}node_modules${sep}`)) continue;
        if (FRAMEWORK_DIRS.some((dir) => file.startsWith(`${dir}${sep}`))) continue;
        frames.push({ file, line: match[2], column: match[3] });
    }
    const frame = frames[siteDepth] ?? frames[0];
    if (!frame) return 'unknown';
    const rel = relative(process.cwd(), frame.file);
    const file = rel && !rel.startsWith('..') ? rel.split(sep).join('/') : frame.file;
    return `${file}:${frame.line}:${frame.column}`;
}

/** 栈帧里的文件可能是 file:// URL（node ESM），统一成路径再比对。 */
function toFilePath(file: string): string {
    if (!file.startsWith('file://')) return file;
    try {
        return fileURLToPath(file);
    } catch {
        return file.slice('file://'.length);
    }
}

/**
 * 跑一遍 markrefs 校验：键表类 + 引用类诊断 + 宿主级问题 + 计数。
 * io 由本函数提供：占位符路径跳过存在性（构建期不可判），其余按 cwd 解析。
 * @category 工具整合
 */
export function inspectRefs(
    config: MarkrefsConfig,
    options: { cwd?: string; keysSource?: string } = {},
): RefsReport {
    const cwd = options.cwd ?? process.cwd();
    const strict = config.strict === true;
    const records = config.refs.snapshot();
    const problems: string[] = [];

    const declarations: RefDecl[] = records.map((record) => {
        const decl: RefDecl = { site: record.site };
        if (record.name !== undefined) decl.name = record.name;
        else decl.path = record.path ?? '';
        if (record.fragment) decl.fragment = record.fragment;
        return decl;
    });

    // 名字→键表路径 与 本地路径 漂移：本地路径只用于渲染与核对，不进解析（否则会绕过名字查表）。
    for (const record of records) {
        if (record.name === undefined || record.localPath === undefined) continue;
        const resolved = resolve({ site: record.site, name: record.name }, config.keys);
        if (isDiagnostic(resolved) || Array.isArray(resolved)) continue;
        if (resolved.path !== record.localPath) {
            problems.push(
        `${record.site} 名字与本地路径不一致：${record.name}（键表 ${resolved.path}，本地 ${record.localPath}）`,
            );
        }
    }
    if (config.keys.entries.length > 0 && records.length === 0) {
        problems.push('键表已声明但未收集到引用（检查调用方是否改走框架的引用登记）');
    }

    const io: Io = {
        exists: (path) => existsSync(isAbsolute(path) ? path : join(cwd, path)),
    };

    // 逐条分流：名字类错误照报；目标全是占位符的（构建期不可判）不交给校验，只计数。
    const counts: RefsCounts = { total: records.length, checked: 0, skipped: 0 };
    const checkable: RefDecl[] = [];
    for (const decl of declarations) {
        const resolved = resolve(decl, config.keys);
        if (isDiagnostic(resolved)) {
            counts.checked += 1;
            checkable.push(decl);
            continue;
        }
        const list = Array.isArray(resolved) ? resolved : [resolved];
        if (list.every((item) => isPlaceholder(item.path))) {
            counts.skipped += 1;
            continue;
        }
        counts.checked += 1;
        checkable.push(decl);
    }

    const diagnostics = validate(checkable, config.keys, io, {
        keysSource: options.keysSource ?? 'keys',
    });

    return {
        diagnostics,
        blocking: diagnostics.filter((diagnostic) => isBlocking(diagnostic, strict)),
        problems,
        counts,
    };
}
