import { step } from 'skillnomad';

export const review = step('review', '复核')
    .wish('复核标注结果，给出一个能站得住的结论。')
    .target('T1', '复核结论已落盘')
    .target('T2', '结论明确可依据')
    .verify({ type: 'file-exists', ref: '{workDir}/review.md', description: '复核结论已落盘', target: 'T1' })
    .summary('复核标注结果')
    .dependsOn('collect')
    .action('parse', 'review-do', '复核', '复核标注结果。', undefined)
    .reads({ path: '{workDir}/.meta/labeled.json', description: '标注结果' })
    .writes({ path: '{workDir}/review.md', description: '复核结论' })
    .checkpoint({
        checkItems: [{ label: '复核结论是否明确', expect: '结论含过/不过判定与依据句', target: 'T2' }],
        clarifyPrompt: '复核完成，确认后结束。',
        onConfirm: 'continue',
        onReject: 'rollback',
    })
    .build();
