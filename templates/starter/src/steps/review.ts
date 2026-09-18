import { step } from 'skillnomad';

export const review = step('review', '复核')
    .target('复核标注结果，产出复核结论。')
    .summary('复核标注结果')
    .dependsOn('collect')
    .action('parse', 'review-do', '复核', '复核标注结果。', undefined)
    .reads({ path: '{workDir}/.meta/labeled.json', description: '标注结果' })
    .writes({ path: '{workDir}/review.md', description: '复核结论' })
    .checkpoint({
        checkItems: ['复核结论是否明确'],
        clarifyPrompt: '复核完成，确认后结束。',
        onConfirm: 'continue',
        onReject: 'rollback',
    })
    .build();
