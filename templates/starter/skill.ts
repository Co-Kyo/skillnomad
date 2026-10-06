import type { SkillSourceModel } from 'skillnomad';
import { createSkillFromModel } from 'skillnomad';
import { collect } from './src/steps/collect.ts';
import { review } from './src/steps/review.ts';

const model: SkillSourceModel = {
    meta: {
        name: 'my-skill',
        title: '我的技能',
        description: '两步线性链最小模板：收集 → 复核。',
        phases: [
            { name: '收集', stepIds: ['collect'], description: '收集并标注' },
            { name: '复核', stepIds: ['review'], description: '复核标注结果' },
        ],
    },
    steps: [collect, review],
    contracts: [],
    // policies 全缺省＝策略全关／禁用——新用户不必填写框架历史。
};

export const skill = createSkillFromModel(model);
