// ============================================================
// markrefs CLI — check
// 用法：markrefs check --keys keys.json --refs refs.json [--strict] [--format text|json]
// 退出码：0＝无 error（strict 下无 warn）；1＝有 error（strict 下含 warn）；2＝用法/输入错误。
// ============================================================

import { existsSync, readFileSync } from 'node:fs';
import { isBlocking, validate, type Diagnostic, type KeyMap, type RefDecl } from './index.js';

const USAGE =
    'usage: markrefs check --keys <keys.json> --refs <refs.json> [--strict] [--format text|json]';

function fail(message: string): number {
    process.stderr.write(`markrefs: ${message}\n${USAGE}\n`);
    return 2;
}

function readJson(file: string): unknown {
    return JSON.parse(readFileSync(file, 'utf8'));
}

export function run(argv: string[]): number {
    if (argv[0] !== 'check') return fail('未知子命令');

    let keysFile: string | undefined;
    let refsFile: string | undefined;
    let strict = false;
    let format: 'text' | 'json' = 'text';

    for (let i = 1; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--keys') keysFile = argv[++i];
        else if (arg === '--refs') refsFile = argv[++i];
        else if (arg === '--strict') strict = true;
        else if (arg === '--format') {
            const value = argv[++i];
            if (value === 'text' || value === 'json') format = value;
            else return fail('--format 只能是 text 或 json');
        } else return fail(`未知参数：${arg}`);
    }
    if (!keysFile || !refsFile) return fail('缺少 --keys 或 --refs');

    let keys: KeyMap;
    let refs: RefDecl[];
    try {
        const rawKeys = readJson(keysFile) as KeyMap;
        const rawRefs = readJson(refsFile) as RefDecl[] | { refs: RefDecl[] };
        keys = rawKeys;
        refs = Array.isArray(rawRefs) ? rawRefs : rawRefs.refs;
    } catch (error) {
        return fail(`输入读取失败：${(error as Error).message}`);
    }
    if (!Array.isArray(keys?.entries)) return fail('keys.entries 必须是数组');
    if (!Array.isArray(refs)) return fail('refs 必须是数组（或 { refs: [...] }）');

    const diagnostics = validate(
        refs,
        keys,
        { exists: (path) => existsSync(path) },
        { keysSource: keysFile },
    );
    const blocking = diagnostics.filter((d) => isBlocking(d, strict));

    if (format === 'json') {
        process.stdout.write(`${JSON.stringify(diagnostics, null, 2)}\n`);
    } else {
        for (const diagnostic of diagnostics) {
            const line = `${diagnostic.site} ${diagnostic.ruleId} ${diagnostic.message}`;
            if (isBlocking(diagnostic, strict)) process.stderr.write(`${line}\n`);
            else process.stdout.write(`${line}\n`);
        }
    }

    if (blocking.length > 0) {
        if (format === 'text') {
            process.stderr.write(`✗ ${blocking.length} 处未通过（${strict ? 'strict' : 'default'}）\n`);
        }
        return 1;
    }
    if (format === 'text') process.stdout.write('✓ 通过\n');
    return 0;
}
