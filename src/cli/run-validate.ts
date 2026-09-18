#!/usr/bin/env node

// skillnomad validate —— 管线完整性校验子命令（原独立校验包并入，现为子命令）。
// 用法：skillnomad validate <path-to-pipeline-file>
// 管线文件须默认导出 StepDefinition 数组（或具名导出 steps）。

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validatePipeline } from '../cli/validate.js';

const filePath = process.argv[3];

if (!filePath) {
    console.error('Usage: skillnomad validate <path-to-pipeline-file>');
    process.exit(1);
}

const absPath = resolve(process.cwd(), filePath);

console.log(`skillnomad validate`);
console.log(`Validating: ${absPath}\n`);

try {
    const mod = await import(pathToFileURL(absPath).href);
    const steps = mod.default || mod.steps;

    if (!steps || !Array.isArray(steps)) {
        console.error('Pipeline file must export an array of StepDefinitions as default or named export `steps`.');
        process.exit(1);
    }

    const report = validatePipeline(steps);

    if (report.errors.length > 0) {
        console.error(`❌ ${report.errors.length} error(s):`);
        for (const err of report.errors) {
            console.error(`  [${err.stepId}] ${err.field}: ${err.message}`);
        }
    }

    if (report.warnings.length > 0) {
        console.warn(`\n⚠️  ${report.warnings.length} warning(s):`);
        for (const warn of report.warnings) {
            console.warn(`  [${warn.stepId}] ${warn.field}: ${warn.message}`);
        }
    }

    if (report.pipeline) {
        console.log(`\n✅ Pipeline is valid. Step order:`);
        for (const step of report.pipeline.steps) {
            console.log(`  ${String(step.seq).padStart(2, '0')}: ${step.id} — ${step.title}`);
        }
    }

    process.exit(report.passed ? 0 : 1);
} catch (e) {
    console.error(`\n❌ Failed to load or validate pipeline:`);
    console.error(`  ${(e as Error).message}`);
    process.exit(1);
}
