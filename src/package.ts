// ============================================================
// 内容包装载器：让框架读懂"声明式包"（skill.json ＋ blocks ＋ compose）
//
// 分工：
//   本文件（框架）  —— 读清单、按名字取块、解析引用标记、拼装正文（组合本体）
//   写作块工具      —— 散文拆分结构自洽（引用缺席／母版对齐／双发布）
//   引用校验工具    —— 块名 → 路径的解析与存在性（组合的引用面）
//
// 包不需要自带可执行入口：包是"带清单的内容目录"，读懂它是编译器的职责。
// 本文件不认识业务词：块名／角色／文件路径都是包自己声明的不透明字符串。
// ============================================================

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

import { Registry, check, doc, type Diagnostic as BlockDiagnostic, type DocPart } from 'methodblocks';
import { isBlocking, validate as validateRefs, type Diagnostic as RefDiagnostic, type Io, type KeyMap, type RefDecl } from 'markrefs';

import type { SourceModule, SourceModuleKind } from './types/index.js';

/**
 * 包清单里的块声明。
 * @category 内容包
 */
export interface PackageBlockSpec {
    id: string;
    role: 'target' | 'useMethod' | 'example';
    file: string;
    whenToUse?: string;
}

/**
 * 包清单（`skill.json`）：标准符合性 ＋ 分级 ＋ 组合顺序 ＋ 块清单 ＋ 模块挂接。
 * @category 内容包
 */
export interface PackageManifest {
    /** 标准标识（如 skillnomad-skill-package/v1） */
    standard: string;
    /** 成熟度分级：incubating｜shared｜general */
    tier: string;
    method: { id: string; title: string };
    /** 正文组合顺序（块名列表） */
    compose: string[];
    blocks: PackageBlockSpec[];
    module: { id: string; kind: SourceModuleKind; version: string };
}

/**
 * 装载结果：清单 ＋ 组合好的正文 ＋ 供校验用的名字表与引用表。
 * @category 内容包
 */
export interface LoadedPackage {
    /** 包身份（来自 package.json —— 身份的唯一事实源） */
    name: string;
    version: string;
    manifest: PackageManifest;
    /** 组合后的正文（标记已解析成被引块标题） */
    body: string;
    /** 块注册表（写作块结构检查用） */
    registry: Registry;
    /** 组合声明的 DocPart 序列（写作块检查用） */
    parts: DocPart[];
    /** 名字表：块名 → 文件 */
    keys: KeyMap;
    /** 引用登记：组合声明 ＋ 块正文里的显式标记 */
    refs: RefDecl[];
}

/** 显式引用标记：`[[块名]]`。只有标记才是引用；裸提名字只是提到。 */
const REF_MARKER = /\[\[([^\]\s]+)\]\]/g;

function readText(dir: string, relative: string): string {
    return readFileSync(isAbsolute(relative) ? relative : join(dir, relative), 'utf8');
}

/**
 * 读清单与身份：`package.json`（身份）＋ `skill.json`（语义）。
 * @category 内容包
 */
export function readPackageManifest(dir: string): { name: string; version: string; manifest: PackageManifest } {
    const pkgPath = join(dir, 'package.json');
    const manifestPath = join(dir, 'skill.json');
    if (!existsSync(pkgPath)) throw new Error(`内容包缺少 package.json：${dir}`);
    if (!existsSync(manifestPath)) throw new Error(`内容包缺少 skill.json：${dir}`);
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { name?: string; version?: string };
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest;
    if (!pkg.name || !pkg.version) throw new Error(`内容包包名或版本缺失：${pkgPath}`);
    if (!manifest.standard || !manifest.tier) throw new Error(`内容包清单缺少 standard／tier：${manifestPath}`);
    if (!Array.isArray(manifest.blocks) || manifest.blocks.length === 0) throw new Error(`内容包清单未声明 blocks：${manifestPath}`);
    if (!Array.isArray(manifest.compose) || manifest.compose.length === 0) throw new Error(`内容包清单未声明 compose：${manifestPath}`);
    return { name: pkg.name, version: pkg.version, manifest };
}

/**
 * 装载内容包：清单 → 块注册表 → 名字表/引用表 → 组合正文（标记解析成被引块标题）。
 * @category 内容包
 */
export function loadPackage(dir: string): LoadedPackage {
    const { name, version, manifest } = readPackageManifest(dir);
    const byId = new Map(manifest.blocks.map((b) => [b.id, b]));

    const titleOf = (id: string): string => {
        const spec = byId.get(id);
        if (!spec) throw new Error(`内容包 ${name}：引用了未在清单声明的块 ${id}`);
        const heading = readText(dir, spec.file).match(/^#\s+(.+)$/m);
        return heading ? heading[1].trim() : id;
    };
    // 源里是标记，产物里是人话：入装前把 [[块名]] 解析成该块标题。
    const resolve = (text: string): string => text.replace(REF_MARKER, (_m, id: string) => `《${titleOf(id)}》`);

    const registry = new Registry();
    const parts: DocPart[] = [];
    for (const id of manifest.compose) {
        const spec = byId.get(id);
        if (!spec) throw new Error(`内容包 ${name}：compose 里的块 ${id} 未在清单声明`);
        const text = resolve(readText(dir, spec.file));
        if (spec.role === 'target') {
            registry.target(spec.id, text);
            parts.push({ target: spec.id });
        } else if (spec.role === 'useMethod') {
            registry.useMethod(spec.id, text, spec.whenToUse);
            parts.push({ useMethod: spec.id });
        } else {
            registry.example(spec.id, text);
            parts.push({ example: spec.id });
        }
    }

    const keys: KeyMap = {
        entries: manifest.blocks.map((b) => ({ name: b.id, path: b.file, site: 'skill.json' })),
    };
    const refs: RefDecl[] = [
        ...manifest.compose.map((id): RefDecl => ({ site: 'skill.json', name: id })),
        ...manifest.blocks.flatMap((spec): RefDecl[] =>
            [...readText(dir, spec.file).matchAll(REF_MARKER)].map((m) => ({ site: spec.file, name: m[1] })),
        ),
    ];

    return { name, version, manifest, body: doc(registry, parts), registry, parts, keys, refs };
}

/**
 * 内容包自检：拆分结构（写作块）＋ 组合引用面（引用校验）。
 * 前者判"散文拆得对不对"，后者判"拆出来的文档拼不拼得起来"。
 * @category 内容包
 */
export function checkPackage(dir: string): { structure: BlockDiagnostic[]; composition: RefDiagnostic[] } {
    const loaded = loadPackage(dir);
    const io: Io = { exists: (path) => existsSync(isAbsolute(path) ? path : join(dir, path)) };
    return {
        structure: check(loaded.registry, { body: loaded.parts }),
        composition: validateRefs(loaded.refs, loaded.keys, io, { keysSource: 'skill.json' }),
    };
}

/**
 * 阻断诊断（引用校验口径：error 必阻；strict 下 warn 也阻——此处用默认严格度）。
 * @category 内容包
 */
export function blockingPackageDiagnostics(dir: string): RefDiagnostic[] {
    return checkPackage(dir).composition.filter((d) => isBlocking(d));
}

/**
 * 内容包 → 模块对象：`render` 返回组合好的正文——构建期渲染进引用步骤的「模块附录」。
 * @category 内容包
 */
export function packageModule(dir: string): SourceModule {
    const loaded = loadPackage(dir);
    return {
        id: loaded.manifest.module.id,
        kind: loaded.manifest.module.kind,
        version: loaded.manifest.module.version,
        render: () => doc(loaded.registry, loaded.parts),
    };
}
