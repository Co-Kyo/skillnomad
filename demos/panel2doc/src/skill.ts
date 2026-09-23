import type { SkillSourceModel } from 'skillnomad';
import { createSkillFromModel } from 'skillnomad';
import { contracts } from './contracts.js';
import { steps } from './steps.js';

// 装配：meta ＋ 步骤 ＋ 契约登记，走同一条构建路径。
// 手写版 SKILL.md 开头的 frontmatter（name/description）在这里变成类型字段。
const model: SkillSourceModel = {
    meta: {
        name: 'panel2doc',
        title: '角色面板讨论 → 决策文档',
        description: '对有争议的技术决策做三方角色讨论，再按四段标准写成能直接拍板的决策文档',
        frontmatterDescription: '当需要对一个有争议的技术决策做出面板式讨论、并把它变成一份能直接发给负责人拍板的决策文档时使用。用户说「组织几个角色讨论一下再出文档」「帮我出个结论」「写成决策文档」时也走这个 skill。',
        callExamples: [],
        params: [],
        phases: [],
    },
    steps,
    contracts,
    policies: {
        contextIsolation: false,
        reuseByFileExistence: false,
        checkpointRequired: false,
        traceFields: [],
        runtimeTrace: { enabled: false, logDir: '', eventTypes: [] },
    },
};

export const skill = createSkillFromModel(model);
