// ============================================================
// markrefs — Markdown 依赖解析与校验（最小核心）
// ------------------------------------------------------------
// 只对 markdown 负责：不做业务语义判断。
// 名字与 scope 对 markrefs 都是不透明字符串；位置只以 file[:line[:col]] 表达。
// 输入是声明式引用（RefDecl）与注入式名字表（KeyMap），核心不解析任何载体。
// ============================================================

/**
 * 诊断级别：
 * - 'error' 默认即拦（missing-key / missing-target / duplicate-key 同 scope / duplicate-decl）
 * - 'warn'  仅 --strict 下拦（如跨 scope 覆盖）
 * - 'info' / 'ignore' 只报告／完全静默
 */
export type Severity = 'error' | 'warn' | 'info' | 'ignore';

export type RuleId =
  | 'missing-key'
  | 'missing-target'
  | 'duplicate-key'
  | 'duplicate-path'
  | 'duplicate-decl';

/** 名字表条目（名字→路径）。scope 是不透明命名空间；缺省 'default'。 */
export interface KeyEntry {
    name: string;
    path: string;
    scope?: string;
    /** 声明位置：file[:line[:col]]（供重复声明类诊断回指） */
    site?: string;
}

/** 注入式名字表。entries 为列表而非映射：重复声明必须可表达，才能被检出。 */
export interface KeyMap {
    entries: KeyEntry[];
}

/** 声明式引用：由消费者从其载体（代码或文档）抽取后传入。 */
export interface RefDecl {
    /** 声明位置：file[:line[:col]] */
    site: string;
    /** 名字（查 KeyMap）；与 path 二选一 */
    name?: string;
    /** 直接路径（不查表） */
    path?: string;
    /** '#' 后的片段（P0 只透传，不校验语义） */
    fragment?: string;
    /** 动态拼接（如取自某处 .path 的取值） */
    dynamic?: boolean;
    /** 通配实例化：显式实例列表（P0 不解析通配表达式） */
    wildcard?: { instances: string[] };
}

export interface Resolved {
    path: string;
    fragment?: string;
    key?: string;
}

export interface Diagnostic {
    ruleId: RuleId;
    severity: Severity;
    /** 位置：file[:line[:col]]（键表类诊断回指 KeyEntry.site 或其所属文件） */
    site: string;
    message: string;
}

/** 文件存在性由调用方注入（fixture 目录／真实仓），核心不碰 fs 实现。 */
export interface Io {
    exists(path: string): boolean;
}

export interface ValidateOptions {
    /** 键表来源文件名（键表类诊断的兜底 site）；缺省 'keys.json' */
    keysSource?: string;
}

const DEFAULT_SCOPE = 'default';

export function isDiagnostic(value: unknown): value is Diagnostic {
    return (
        typeof value === 'object' &&
    value !== null &&
    'ruleId' in value &&
    'severity' in value &&
    'site' in value &&
    'message' in value
    );
}

/** 是否阻断构建：error 一律阻断；strict 下 warn 也阻断。退出码由调用方定。 */
export function isBlocking(diagnostic: Diagnostic, strict = false): boolean {
    return diagnostic.severity === 'error' || (strict && diagnostic.severity === 'warn');
}

function scopeOf(entry: KeyEntry): string {
    return entry.scope ?? DEFAULT_SCOPE;
}

function findEntry(ref: RefDecl, keys: KeyMap): KeyEntry | undefined {
    const list = keys.entries.filter((e) => e.name === ref.name);
    if (list.length === 0) return undefined;
    // 优先默认 scope；否则按声明顺序取首个命中（跨 scope 的歧义由 duplicate-key 报出）
    return list.find((e) => scopeOf(e) === DEFAULT_SCOPE) ?? list[0];
}

/**
 * 名字→路径：唯一权威入口。
 * 通配形态展开为多条；其余形态返回单条。名字不在表中返回 missing-key 诊断。
 */
export function resolve(
    ref: RefDecl,
    keys: KeyMap,
): Resolved | Resolved[] | Diagnostic {
    if (ref.wildcard) {
        return ref.wildcard.instances.map((path) => ({
            path,
            fragment: ref.fragment,
        }));
    }
    if (typeof ref.path === 'string') {
        return { path: ref.path, fragment: ref.fragment };
    }
    if (typeof ref.name === 'string') {
        const entry = findEntry(ref, keys);
        if (!entry) {
            return {
                ruleId: 'missing-key',
                severity: 'error',
                site: ref.site,
                message: `名字不在表中：${ref.name}`,
            };
        }
        return { path: entry.path, fragment: ref.fragment, key: entry.name };
    }
    // 既无 name 也无 path：按缺表处理（消费者侧应保证二选一）
    return {
        ruleId: 'missing-key',
        severity: 'error',
        site: ref.site,
        message: '引用既未给名字也未给路径',
    };
}

/** 引用的"输出模式"决策字段。P0 恒为 'ref'：内联策略在分发收编时接入，此处不做拼接。 */
export function mode(_ref: RefDecl, _keys: KeyMap): 'inline' | 'ref' {
    return 'ref';
}

function fileOf(site: string): string {
    const idx = site.indexOf(':');
    return idx === -1 ? site : site.slice(0, idx);
}

function keyDiagnostics(keys: KeyMap, keysSource: string): Diagnostic[] {
    const out: Diagnostic[] = [];
    const byName = new Map<string, KeyEntry[]>();
    const byScopeAll = new Map<string, KeyEntry[]>();
    for (const entry of keys.entries) {
        const list = byName.get(entry.name);
        if (list) list.push(entry);
        else byName.set(entry.name, [entry]);

        const scope = scopeOf(entry);
        const scoped = byScopeAll.get(scope);
        if (scoped) scoped.push(entry);
        else byScopeAll.set(scope, [entry]);
    }
    for (const [, list] of byName) {
        const byScope = new Map<string, KeyEntry[]>();
        for (const entry of list) {
            const scope = scopeOf(entry);
            const same = byScope.get(scope);
            if (same) same.push(entry);
            else byScope.set(scope, [entry]);
        }
        for (const [scope, entries] of byScope) {
            if (entries.length > 1) {
                out.push({
                    ruleId: 'duplicate-key',
                    severity: 'error',
                    site: entries[1].site ?? keysSource,
                    message: `同一 scope 内名字重复声明：${entries[0].name}（scope=${scope}，共 ${entries.length} 条）`,
                });
            }
        }
        if (byScope.size > 1) {
            out.push({
                ruleId: 'duplicate-key',
                severity: 'warn',
                site: list[0].site ?? keysSource,
                message: `同名键跨 scope 覆盖：${list[0].name}（scope=${[...byScope.keys()].join(' / ')}）`,
            });
        }
    }
    // 同 scope 内两个名字登记同一路径＝同一条依赖被重复定义（跨 scope 视为别名，不报）。
    for (const [scope, entries] of byScopeAll) {
        const byPath = new Map<string, KeyEntry[]>();
        for (const entry of entries) {
            const list = byPath.get(entry.path);
            if (list) list.push(entry);
            else byPath.set(entry.path, [entry]);
        }
        for (const [path, list] of byPath) {
            const names = [...new Set(list.map((e) => e.name))];
            if (names.length > 1) {
                out.push({
                    ruleId: 'duplicate-path',
                    severity: 'warn',
                    site: list[1].site ?? keysSource,
                    message: `同一 scope 内两个名字登记同一路径：${path}（${names.join(' / ')}，scope=${scope}）`,
                });
            }
        }
    }
    return out;
}

/**
 * 两项校验 + 重复声明/定义：
 * - missing-key / missing-target（error）
 * - duplicate-key（同 scope＝error；跨 scope＝warn）
 * - duplicate-path（同 scope 内两个名字登记同一路径＝warn；跨 scope 视为别名不报）
 * - duplicate-decl（同一声明源文件内、同一 path#fragment 两次＝error）
 */
export function validate(
    refs: RefDecl[],
    keys: KeyMap,
    io: Io,
    options: ValidateOptions = {},
): Diagnostic[] {
    const keysSource = options.keysSource ?? 'keys.json';
    const out: Diagnostic[] = keyDiagnostics(keys, keysSource);
    const seenInFile = new Map<string, string>();

    for (const ref of refs) {
        const resolved = resolve(ref, keys);
        if (isDiagnostic(resolved)) {
            out.push(resolved);
            continue;
        }
        const list = Array.isArray(resolved) ? resolved : [resolved];
        for (const item of list) {
            if (!io.exists(item.path)) {
                out.push({
                    ruleId: 'missing-target',
                    severity: 'error',
                    site: ref.site,
                    message: `引用目标不存在：${item.path}`,
                });
            }
            const target = item.fragment ? `${item.path}#${item.fragment}` : item.path;
            const seenKey = `${fileOf(ref.site)}|${target}`;
            const previous = seenInFile.get(seenKey);
            if (previous) {
                out.push({
                    ruleId: 'duplicate-decl',
                    severity: 'error',
                    site: ref.site,
                    message: `同一声明源内重复声明：${target}（另一处：${previous}）`,
                });
            } else {
                seenInFile.set(seenKey, ref.site);
            }
        }
    }
    return out;
}
