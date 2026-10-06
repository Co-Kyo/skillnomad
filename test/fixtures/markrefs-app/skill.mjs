// markrefs E2E 夹具：最小 skill 源（一处名字引用 + 一处模板路径引用）
import { step, createSkillFromModel } from 'skillnomad';
import { MODE, refOf, refPath } from './entities.mjs';

const extraWrites = MODE === 'missing-target' ? [refOf('ghost')] : [];

const one = step('one', '唯一步骤')
    .wish('产出可被 markrefs 解析的构建结果')
    .summary('最小 skill：一处名字引用 + 一处模板路径')
    .detail('夹具正文：读 docs/a.md，写出 trace。')
    .action('parse', 'one-action', '执行一步', '夹具动作正文：读 docs/a.md，写出 trace。')
    .checkpoint({ checkItems: [{ label: 'docs/a.md 已读', informational: true }, { label: 'trace 已写', informational: true }], clarifyPrompt: '请确认夹具结果。' })
    .writes(refOf('alpha'), refPath('{workDir}/.meta/trace.json'), ...extraWrites)
    .build();

export const skill = createSkillFromModel({
    meta: { name: 'markrefs-e2e', title: 'markrefs E2E 夹具', description: '构建期校验夹具' },
    steps: [one],
    contracts: [],
    policies: {
        runtimeTrace: { enabled: false, logDir: '', eventTypes: [] },
    },
});
