import type { SkillSourceModel } from 'skillnomad';
import { createSkillFromModel } from 'skillnomad';
import { collect } from './src/steps/collect.ts';
import { review } from './src/steps/review.ts';

const model: SkillSourceModel = {
    meta: {
        name: 'my-skill',
        title: '我的技能',
        description: '两步线性链最小模板：收集 → 复核。',
        frontmatterDescription: '两步线性链最小模板：收集 → 复核。',
        callExamples: [],
        params: [],
        phases: [
            { name: '收集', stepIds: ['collect'], description: '收集并标注' },
            { name: '复核', stepIds: ['review'], description: '复核标注结果' },
        ],
    },
    steps: [collect, review],
    contracts: [],
    policies: {
        contextIsolation: false,
        reuseByFileExistence: false,
        checkpointRequired: false,
        traceFields: [],
        runtimeTrace: { enabled: false, logDir: '', eventTypes: [] },
    },
};

export const skill = createSkillFromModel(model);
