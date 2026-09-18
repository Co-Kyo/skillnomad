import { step } from 'skillnomad';

export const collect = step('collect', '收集与标注')
    .target('收集并标注，产出标注结果。')
    .summary('收集并标注')
    .action('parse', 'collect-do', '收集', '收集并标注。', undefined)
    .reads({ path: 'assets/common/shared-rule.md', description: '共享规则' })
    .writes({ path: '{workDir}/.meta/labeled.json', description: '标注结果' })
    .checkpoint({
        checkItems: ['标注结果是否完整'],
        clarifyPrompt: '收集完成，确认后进入复核。',
        onConfirm: 'continue',
        onReject: 'rollback',
    })
    .build();
