import type { SourceAction, SourceFlow, SourceStep } from 'skillnomad';
import { step } from 'skillnomad';
import { reportStandard } from './contracts.ts';

// 小 helper：把一个动作包成「执行一个任务」的流（与消费仓同款写法，不是框架能力）。
const task = (verb: 'infer' | 'merge' | 'generate', id: string, label: string, content: string): SourceFlow => ({
    kind: 'do',
    task: { id, label, verb, actor: 'agent', content } satisfies SourceAction,
});

// 三角色的共同交付要求（三处复用，只写一次；手写版是在三段 prompt 里各抄一遍的）。
const ROLE_ASK = [
    '读 {workDir}/.meta/panel/topic.md 的议题，独立作答，不要猜别人会怎么说。交回三样：',
    '1. 立场：迁 / 不迁 / 有条件迁（只能选一个，不接受「视情况而定」）',
    '2. 三条理由，每条一两句话，必须落到具体事情上',
    '3. 一个让对方让步的条件：「如果谁能满足 X，我就改立场」',
].join('\n');

const roleTask = (id: string, stance: string): SourceFlow =>
    task('infer', id, id, stance + '\n\n' + ROLE_ASK + '\n\n写入 {workDir}/.meta/panel/' + id + '.md');

// ---------------------------------------------------------------
// 第一步：三方角色讨论（对应手写版 SKILL.md 第 11-35 行）
// ---------------------------------------------------------------
export const stepPanel: SourceStep = step('panel', '三方角色讨论')
    .target('三个角色各自独立就议题表态，主持人汇总成一张分歧表；本步不下结论。')
    .summary('3 个 subagent 角色扮演（后端/产品/安全）独立讨论，主持人收口成分歧表')
    .reads({
        path: '{workDir}/.meta/panel/topic.md',
        description: '议题文本（默认为「内部 CLI 该不该从 HTTP 迁到 gRPC」；用户另给以用户为准）',
        required: true,
    })
    .parallel(
        'panel-round',
        '三角色并行表态',
        [
            roleTask('role-backend', '你是【资深后端工程师】，只从这个立场发言：关心性能与运维成本——流式、多路复用、代码生成、连接治理是你的语言，也会算 CI/CD、网关、监控、客户端升级这些账。'),
            roleTask('role-pm', '你是【产品经理】，只从这个立场发言：关心交付速度与用户感知——判断标准是「用户多久能拿到」「学习成本有没有变」「会不会拖掉这个季度的活」。'),
            roleTask('role-security', '你是【安全审查者】，只从这个立场发言：关心认证、审计与暴露面——mTLS、token 轮转、审计日志能否落到一条链上、proto 一变暴露面变没变。'),
        ],
        {
            gate: {
                rule: '三份立场齐备，或至多一份降级',
                onPass: 'converge',
                onFail: 'degrade',
            },
            converge: {
                id: 'panel-converge',
                label: 'panel-converge',
                verb: 'merge',
                actor: 'agent',
                content: [
                    '三份立场都回来后，你当主持人，只做整理、不下结论。',
                    '',
                    '产出一张四列分歧表：议题点 / 谁和谁分歧 / 分歧的实质 / 现状（已共识 或 仍分歧）。',
                    '',
                    '两条硬要求：',
                    '- 「分歧的实质」要往下挖一层。例：后端说性能更好、产品说用户感觉不到，实质不是性能数字，是「这个收益有没有人来验收」——写出这一层。',
                    '- 共识条目也要列，别只写吵的部分（它们是第二步「依据」的来源）。',
                    '',
                    '三份立场 + 分歧表写入 {workDir}/.meta/panel/disagreement-table.md',
                ].join('\n'),
                timeout: 5,
            } satisfies SourceAction,
        },
    )
    .writes({ path: '{workDir}/.meta/panel/disagreement-table.md', description: '三份立场 + 四列分歧表', required: true })
    .checkpoint({
        checkItems: ['三份立场是否齐全且各带三条理由', '每条立场是否都给了让步条件', '分歧表是否挖到实质层、共识条目是否列出'],
        clarifyPrompt: '面板讨论收口完成。确认分歧表质量后进入决策文档撰写。',
        onConfirm: 'continue',
        onReject: 'rollback',
    })
    .build();

// ---------------------------------------------------------------
// 第二步：按标准格式出文档（对应手写版 SKILL.md 第 37-50 行）
// ---------------------------------------------------------------
export const stepWriteDoc: SourceStep = step('write-doc', '撰写决策文档')
    .target('把第一步的分歧表按四段标准写成一份能直接发给负责人拍板的决策文档。')
    .summary('按四段标准输出决策文档；内容只从第一步产物取')
    .dependsOn('panel')
    .reads(
        { ...reportStandard, as: 'contract' },
        { path: '{workDir}/.meta/panel/disagreement-table.md', description: '三份立场与分歧表', required: true },
    )
    .action(
        'generate',
        'write-report',
        '撰写四段决策文档',
        [
            '按契约的四段标准写整篇文档，顺序不许调、不许加第五段。',
            '',
            '取材规则（不要引入自己的新观点）：',
            '- 结论：看多数立场，以及「有条件迁」的那几个条件；一句话说清做还是不做，括号里给置信度（判据见标准文件）。',
            '- 依据：逐条标来源角色（后端）（产品）（安全）；每条必须能追到分歧表里的原话，追不到就不要写。',
            '- 风险：反对意见里最有力的一条必须原样保留，不许省略、不许弱化、不许合并。',
            '- 待决：从「让步条件」和仍分歧的行翻译过来——谁定、什么时候之前定、定什么。',
            '',
            '写入 {workDir}/decision-report.md，文件名带上议题与日期；用户指定了位置就放那儿，并在回复里说明放在了哪。',
        ].join('\n'),
        5,
    )
    .writes({ path: '{workDir}/decision-report.md', description: '四段决策文档', required: true })
    .checkpoint({
        checkItems: ['四段齐不齐', '依据每条是否都能追到某个角色的原话', '最有力的那条反对意见是否原样活着'],
        clarifyPrompt: '决策文档已成稿。三项自查全过则交付，任一不过则回退补写。',
        onConfirm: 'continue',
        onReject: 'rollback',
    })
    .build();

export const steps = [stepPanel, stepWriteDoc];
