import { step } from 'skillnomad';

export const collect = step('collect', '收集与标注')
    .wish('收集并标注，产出一份可以直接交给复核的标注结果。')
    .target('T1', '标注结果已落盘')
    .target('T2', '标注逐条完整')
    .verify({ type: 'json-parse', ref: '{workDir}/.meta/labeled.json', description: '标注结果可解析', target: 'T1' })
    .summary('收集并标注')
    .action('parse', 'collect-do', '收集', '收集并标注。', undefined)
    .reads({ path: 'assets/common/shared-rule.md', description: '共享规则' })
    .writes({ path: '{workDir}/.meta/labeled.json', description: '标注结果' })
    .checkpoint({
        checkItems: [{ label: '标注结果是否完整', expect: '逐条核对标注文件，缺失即列名', target: 'T2' }],
        clarifyPrompt: '收集完成，确认后进入复核。',
        onConfirm: 'continue',
        onReject: 'rollback',
    })
    .build();
