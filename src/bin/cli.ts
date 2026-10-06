#!/usr/bin/env node

import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { buildPipeline } from '../index.js';
import type { BuildDiagnostic, SkillnomadConfig } from '../index.js';
import { checkNodeVersion } from '../cli/node-version.js';

async function main() {
    const tooOld = checkNodeVersion();
    if (tooOld) {
        console.error(tooOld);
        process.exit(1);
    }

    const args = process.argv.slice(2);
    const command = args[0];

    if (command === 'validate') {
        // validate 子命令：实现见 ../cli/run-validate.ts（原独立校验包并入，现为子命令）
        await import('../cli/run-validate.js');
        return;
    }

    if (command === 'init') {
        // init 子命令：实现见 ../cli/run-init.ts（从内置模板起一个可构建项目）
        await import('../cli/run-init.js');
        return;
    }

    if (command !== 'build') {
        console.error('Usage: skillnomad <build|validate|init> [argument]');
        console.error('  build: skillnomad build [config-file] (defaults to skillnomad.config.ts in cwd)');
        console.error('  validate: skillnomad validate <path-to-pipeline-file>');
        console.error('  init: skillnomad init [dir] (create a starter skill project)');
        process.exit(1);
    }

    const cwd = process.cwd();
    const configFile = resolve(cwd, args[1] || 'skillnomad.config.ts');

    if (!existsSync(configFile)) {
        console.error(`Config file not found: ${configFile}`);
        process.exit(1);
    }

    // Import config (use file:// URL for Windows compat)
    const configUrl = pathToFileURL(configFile).href;
    const config: SkillnomadConfig = (await import(configUrl)).default;

    // Resolve skill path relative to config file's directory
    const skillPath = resolve(dirname(configFile), config.skill);

    if (!existsSync(skillPath)) {
        console.error(`Skill file not found: ${skillPath} (from config.skill: "${config.skill}")`);
        process.exit(1);
    }

    // Import skill definition (must export `skill` from createSkill())
    const skillUrl = pathToFileURL(skillPath).href;
    const mod = await import(skillUrl);

    if (!mod.skill || !mod.skill.steps) {
        console.error(`Skill file must export \`skill\` (created via createSkillFromModel())`);
        process.exit(1);
    }

    const { name, title, description, api, steps, contracts } = mod.skill;

    // Merge meta: skill's defaults + config overrides
    const meta = {
        name,
        title,
        description,
        api,
        ...(config.meta || {}),
    };

    // 打印职责归 CLI：库只返回/抛出结构化诊断，不打印（0.3.0 起）。
    // 失败路径＝buildPipeline 抛 BuildFailureError：先补打已采集的诊断再原样上抛
    // （main 的 catch 印汇总行，退出码语义不变）；成功路径按旧体验分两段打印。
    let result;
    try {
        result = buildPipeline({
            steps,
            outputDir: config.outputDir,
            meta,
            registry: contracts,
            markrefs: config.markrefs,
            modules: config.modules,
            structure: config.structure,
            shipAssets: config.shipAssets === true,
        });
    } catch (err) {
        const collected = (err as { diagnostics?: BuildDiagnostic[] }).diagnostics;
        if (collected) printDiagnostics(collected);
        throw err;
    }
    // 校验期计数（markrefs／structure）→ 通过句 → 步序 → 渲染与搬运逐件 → 完成句
    printDiagnostics(result.diagnostics, ['markrefs', 'structure']);
    console.log('Validation passed ✓');
    console.log('\nStep order resolved:');
    for (const step of result.pipeline.steps) {
        console.log(`  ${String(step.seq).padStart(2, '0')}: ${step.id} — ${step.title}`);
    }
    console.log(`\nRendering to ${config.outputDir}:`);
    printDiagnostics(result.diagnostics, ['validation', 'publish', 'shipAssets', 'danglingRefs', 'alignReport']);
    console.log(`\nDone. ${result.files.length} files written.`);
}

/** 逐条打印诊断（error→stderr，note→stdout）；onlySources 限定本轮打印的来源族。 */
function printDiagnostics(diagnostics: BuildDiagnostic[], onlySources?: string[]): void {
    for (const d of diagnostics) {
        if (onlySources && !onlySources.includes(d.source)) continue;
        const line = `  ${d.severity === 'error' ? '✗' : '·'}${d.site ? ` ${d.site}` : ''} ${d.message}`;
        if (d.severity === 'error') console.error(line);
        else console.log(line);
    }
}

main().catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
});
