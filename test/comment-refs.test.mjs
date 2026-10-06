import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// 注释名实存门：注释里点名的导出若不存在，自动拦：
// src 注释里用反引号点名的标识符（函数/类型/字段），必须能在本仓源码符号表解析到；
// 解析不到＝注释指认了不存在的架构（本门立前一日，本仓刚清掉一例「用于 feedback 定位」
// ——句法通顺而功能从未存在，纯词表拦不住这种形态）。
// 豁免（MODE_NAMES，逐个给理由；新增须改本文件＝有意留痕）：
//   · `refOf` —— 注释原文自称"用户侧 helper（`refOf` 模式）"，指消费者仓的写法惯例，非本仓符号。
//   · `do`    —— 控制流 kind 的枚举取值（`kind: 'do'`），非声明标识符。
// 退役词表类检查按作者裁**不在此门**：留作发布前人工审计的召回清单。

// `doAction` —— 注释原文指消费者仓 step-parts.ts 的同名 helper（惯用法收编的"第二现场"证据），非本仓符号。
const MODE_NAMES = new Set(['refOf', 'do', 'doAction']);
// 语言字面量与通用类型词
const LITERALS = new Set([
    'null', 'undefined', 'true', 'false', 'NaN', 'this',
    'string', 'number', 'boolean', 'object', 'any', 'never', 'unknown', 'void',
]);
// 外部实体（文件名/工具/运行时），不是代码符号
const EXTERNAL = new Set(['package.json', 'skill.json', 'tsconfig', 'npm', 'node', 'process']);

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

function collectTsFiles(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === 'dist') continue;
        const full = join(dir, e.name);
        if (e.isDirectory()) collectTsFiles(full, out);
        else if (e.name.endsWith('.ts')) out.push(full);
    }
    return out;
}

function buildSymbolTable(files) {
    const idents = new Set();
    const add = (m) => m && idents.add(m);
    for (const f of files) {
        const src = readFileSync(f, 'utf-8');
        for (const m of src.matchAll(/\b(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z_]\w*)/g)) add(m[1]);
        for (const m of src.matchAll(/^\s*([A-Za-z_]\w*)\??\s*[:(]/gm)) add(m[1]); // 对象字面量键/接口成员
        for (const m of src.matchAll(/\b([A-Za-z_]\w*)\s*\(/g)) add(m[1]); // 调用位（函数/方法名）
        for (const m of src.matchAll(/\.([A-Za-z_]\w*)\b/g)) add(m[1]); // 属性访问
        for (const m of src.matchAll(/\(([^)]*)\)\s*(?::[^={]+)?[{=>]/g)) {
            // 函数/箭头参数名（含解构浅层首词）
            for (const part of m[1].split(',')) {
                const name = part.trim().replace(/^[{[]\s*/, '').replace(/[=?:].*$/, '').trim();
                const mm = name.match(/^([A-Za-z_]\w*)/);
                if (mm) add(mm[1]);
            }
        }
    }
    return idents;
}

test('注释名实存门：src 注释反引号点名的标识符必须在本仓符号表实存', () => {
    const files = collectTsFiles(srcRoot);
    assert.ok(files.length > 10, '符号表采集异常（src 文件数过少）');
    const symbols = buildSymbolTable(files);
    const unresolved = [];
    for (const f of files) {
        const lines = readFileSync(f, 'utf-8').split('\n');
        lines.forEach((line, i) => {
            if (!/^\s*(\/\/|\*|\/\*)/.test(line)) return; // 只审注释行
            for (const m of line.matchAll(/`([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)`/g)) {
                const whole = m[1];
                const segs = whole.split('.');
                if (MODE_NAMES.has(whole) || LITERALS.has(whole) || EXTERNAL.has(whole)) continue;
                if (segs.some(s => symbols.has(s))) continue;
                unresolved.push(`${whole.replace(srcRoot + '/', '')}:${i + 1} \`${whole}\``.replace(/.*src\//, 'src/'));
            }
        });
    }
    assert.deepEqual(unresolved, [], `注释点名无实存（注释漂移）：\n${unresolved.join('\n')}`);
});
