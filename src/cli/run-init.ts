#!/usr/bin/env node

// skillnomad init —— 从内置模板起一个可构建的 skill 项目。
// 用法：skillnomad init [目录名]（缺省当前目录）
//
// 模板＝本包 templates/starter；拷贝时做两处替换：项目名（包名与 meta.name）与
// skillnomad 依赖版本（钉到当前运行版本，与「一律固定版本号」口径一致）。
// 目标目录非空即拒绝：脚手架不覆盖已有文件。

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const target = resolve(process.cwd(), process.argv[3] ?? '.');
const templateRoot = fileURLToPath(new URL('../../templates/starter', import.meta.url));
const pkgRoot = fileURLToPath(new URL('../..', import.meta.url));
const FRAMEWORK_VERSION: string = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf-8')).version;

/** 模板里的占位项目名——package.json 与 meta.name 两处同源，一起替换。 */
const TEMPLATE_NAME = 'my-skill';

function listFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...listFiles(full));
        else if (entry.isFile()) out.push(full);
    }
    return out;
}

function fail(message: string): never {
    console.error(`skillnomad init: ${message}`);
    process.exit(1);
}

if (!existsSync(templateRoot)) fail(`bundled template not found at ${templateRoot} - reinstall skillnomad`);

const existing = existsSync(target) ? readdirSync(target) : [];
if (existing.length > 0) fail(`target directory is not empty, refusing to write: ${target} (${existing.length} existing entries)`);

const projectName = basename(target);
const packageName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9.~-]+/g, '-')
    .replace(/^[._-]+/, '')
    .replace(/-+$/g, '');
// npm 包名规则：以字母或数字起头，仅含小写字母/数字/.-_，长度 1–214。
if (!/^[a-z0-9][a-z0-9.~-]*$/.test(packageName) || packageName.length > 214) {
    fail(`directory name "${projectName}" cannot be used as the project name - use a directory name starting with a letter or digit`);
}

mkdirSync(target, { recursive: true });
const written: string[] = [];

for (const file of listFiles(templateRoot)) {
    const rel = file.slice(templateRoot.length + 1);
    const dest = join(target, rel);
    mkdirSync(resolve(dest, '..'), { recursive: true });
    if (rel === 'package.json') {
        const pkg = JSON.parse(readFileSync(file, 'utf-8'));
        pkg.name = packageName;
        pkg.dependencies = { ...pkg.dependencies, skillnomad: FRAMEWORK_VERSION };
        writeFileSync(dest, `${JSON.stringify(pkg, null, 4)}\n`, 'utf-8');
    } else if (statSync(file).isFile() && /\.(ts|md)$/.test(rel)) {
        writeFileSync(dest, readFileSync(file, 'utf-8').split(TEMPLATE_NAME).join(packageName), 'utf-8');
    } else {
        cpSync(file, dest);
    }
    written.push(rel.split(/[\\/]/).join('/'));
}

written.sort();
console.log(`skillnomad init: created ${written.length} files`);
for (const rel of written) console.log(`  ✓ ${rel}`);
console.log('\nNext steps:');
console.log(`  cd ${process.argv[3] ?? '.'}`);
console.log(`  npm install`);
console.log(`  npm run build`);
