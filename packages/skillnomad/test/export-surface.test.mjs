import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

// 导出面快照门：主包公开面 ＝ 作者面 ＋ 构建 API（含内容包装载器）。任一增删即红，须显式改本清单。
// 任一新增/删除即红——要改清单必须显式改本文件（把有意的 API 变更记录在此）。
const AUTHORING_VALUES = [
    'step', 'defineModule', 'createSkill',
    'task', 'seq', 'parallel', 'mapNode', 'branch', 'loop',
    'createSkillFromModel', 'defineConfig', 'createRefs',
    'SCHEDULING', 'renderBinding', 'renderModuleDoc',
];
const AUTHORING_TYPES = [
    'StepDefinition', 'SkillSourceModel', 'NextAction',
    'SourceStep', 'SourceRef', 'SourceAction', 'SourceFlow', 'SourceContract',
    'SourcePolicies', 'SourceSchedulingPolicy', 'SourceFailRule', 'SourceVerifyRule',
    'SourceCheckpoint', 'SourceModule', 'KeyMap',
    'SkillMeta', 'SkillnomadConfig', 'MarkrefsConfig',
    'BlockModuleInput', 'StructureConfig', 'StructureDocSpec',
    'PackageManifest', 'PackageBlockSpec', 'LoadedPackage',
];
const BUILD_VALUES = [
    'blockModule',
    // 内容包装载器（声明式包）：读清单 → 组合 → 模块对象；包不再需要自带可执行入口
    'readPackageManifest', 'loadPackage', 'checkPackage', 'blockingPackageDiagnostics', 'packageModule',
    'resolveStepRefs', 'inspectRefs', 'renderModulesAppendix',
    'renderStep', 'renderSkillMd', 'renderPipelineState', 'renderPipeline',
    'writeAlignReport', 'buildPipeline',
];
const APPROVED = new Set([...AUTHORING_VALUES, ...AUTHORING_TYPES, ...BUILD_VALUES]);

test('导出面快照：主包公开导出必须与获批清单一致（新增/删除即红）', () => {
    const dtsPath = fileURLToPath(new URL('../dist/index.d.ts', import.meta.url));
    const program = ts.createProgram([dtsPath], {
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        module: ts.ModuleKind.NodeNext,
        skipLibCheck: true,
    });
    const checker = program.getTypeChecker();
    const sf = program.getSourceFile(dtsPath);
    assert.ok(sf, 'dist/index.d.ts 不存在——请先 npm run build');
    const mod = checker.getSymbolAtLocation(sf);
    const names = checker.getExportsOfModule(mod).map((s) => s.getName()).sort();
    const extra = names.filter((n) => !APPROVED.has(n));
    const missing = [...APPROVED].filter((n) => !names.includes(n)).sort();
    assert.deepEqual(extra, [], `新增未获批导出（IR 重新泄漏？）：${extra.join(', ')}`);
    assert.deepEqual(missing, [], `获批导出缺失：${missing.join(', ')}`);
    assert.equal(names.length, APPROVED.size, '导出总数变化');
});
