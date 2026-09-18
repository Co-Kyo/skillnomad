// ============================================================
// tech-research — 极简完整 skill 示例（链式写作路径）
//
// 覆盖 4 种控制流：
//   .action()   — 单 Agent 任务
//   .seq()      — 顺序执行
//   .parallel() — 并行分支（扇出 + 收敛 + 质量门禁）
//   .map()      — 滚动窗口（对每条目执行同一 worker）
//
// 装配：createSkillFromModel（与消费仓同一条路）。
// ============================================================

import type {
    NextAction,
    SkillSourceModel,
    SourceAction,
    SourceFlow,
    SourceStep,
} from 'skillnomad';
import { createSkillFromModel, step } from 'skillnomad';

// 用户侧小 helper：动作 → 产物流（与消费仓 src/actions.ts 同款）
const agentAction = (
    verb: NextAction,
    id: string,
    label: string,
    content: string,
    timeout = 5,
): SourceAction => ({ id, label, verb, actor: 'agent', content, timeout });

const doAction = (
    verb: NextAction,
    id: string,
    label: string,
    content: string,
    timeout = 5,
): SourceFlow => ({ kind: 'do', task: agentAction(verb, id, label, content, timeout) });

// ---------------------------------------------------------------
// Step 00: 主题解析
// ---------------------------------------------------------------
const stepParse: SourceStep = step('topic-parse', '主题解析')
    .target('解析调研主题，生成 research-brief.json，确定研究范围和深度。')
    .summary('解析调研主题，生成调研框架（research-brief.json），确定研究范围和深度')
    .action('parse', 'parse', '主题解析', `你是调研框架构建者。解析用户输入的调研主题，提取：
- 核心技术关键词
- 研究维度（概念/实践/生态）
- 推荐深度级别

产出 {workDir}/.meta/research-brief.json`, undefined)
    .reads({ path: 'assets/topic-parse/schemas.md', description: 'research-brief 格式定义' })
    .writes({ path: '{workDir}/.meta/research-brief.json', description: '调研框架' })
    .checkpoint({
        checkItems: ['调研主题是否明确', '研究维度是否完整', '深度级别是否合理'],
        clarifyPrompt: '请确认调研框架。通过则开始多维度探索。',
        onConfirm: 'continue',
        onReject: 'rollback',
    })
    .build();

// ---------------------------------------------------------------
// Step 01: 多维度探索
// ---------------------------------------------------------------
const stepExplore: SourceStep = step('multi-dim-explore', '多维度探索')
    .target('并行探索文档、实践与生态三个维度，并由收敛者整合发现。')
    .summary('3 个维度 Agent 并行探索（文档、实践、生态）+ 收敛者整合')
    .dependsOn('topic-parse')
    .parallel(
        'explore-batch',
        '多维度并行探索',
        [
            doAction('search', 'explore-docs', 'explore-docs', '你是文档分析师。阅读 research-brief.json，搜索官方文档和规范。产出 {workDir}/.meta/docs-findings.json'),
            doAction('search', 'explore-practice', 'explore-practice', '你是实践分析师。阅读 research-brief.json，搜索最佳实践和常见陷阱。产出 {workDir}/.meta/practice-findings.json'),
            doAction('search', 'explore-ecosystem', 'explore-ecosystem', '你是生态分析师。阅读 research-brief.json，调研工具链和社区生态。产出 {workDir}/.meta/ecosystem-findings.json'),
        ],
        {
            gate: {
                rule: '3 agents completed or at most 1 degraded',
                onPass: 'converge',
                onFail: 'degrade',
            },
            converge: agentAction('merge', 'explore-converge', 'explore-integrator', '合并三个维度的发现：去重、交叉校验、分级。产出 {workDir}/.meta/consolidated-findings.json'),
        },
    )
    .reads({ path: '{workDir}/.meta/research-brief.json', description: '调研框架', required: true })
    .writes({ path: '{workDir}/.meta/consolidated-findings.json', description: '整合发现报告' })
    .checkpoint({
        checkItems: ['发现总数', 'P0 级发现数', '争议项数'],
        clarifyPrompt: '探索完成。确认发现质量后进入分类整理。',
        onConfirm: 'continue',
        onReject: 'rollback',
    })
    .build();

// ---------------------------------------------------------------
// Step 02: 分类整理（两阶段串行）
// ---------------------------------------------------------------
const stepOrganize: SourceStep = step('organize', '分类整理')
    .target('先对发现归类，再按学习路径排定优先级。')
    .summary('两阶段整理：先归类，再排优先级')
    .dependsOn('multi-dim-explore')
    .seq('organize-seq', '两阶段整理', [
        doAction('extract', 'organize-categorize', 'organize-categorize', `按技术领域归类发现：
- 基础概念 → "foundations"
- 工具/框架 → "tools"
- 模式/实践 → "patterns"
- 性能/优化 → "performance"

产出 {workDir}/.meta/categorized.json`, 3),
        doAction('assemble', 'organize-prioritize', 'organize-prioritize', `对每类内容按学习路径排序：
- 前置知识在前，进阶在后
- 常见场景在前，边缘场景在后

产出 {workDir}/.meta/organized.json`, 3),
    ])
    .reads({ path: '{workDir}/.meta/consolidated-findings.json', description: '整合发现', required: true })
    .writes({ path: '{workDir}/.meta/organized.json', description: '整理后的分类+排序结果' })
    .checkpoint({
        checkItems: ['分类数', '各类发现数', '排序合理性'],
        clarifyPrompt: '分类整理完成。确认后进入深度研究。',
        onConfirm: 'continue',
        onReject: 'rollback',
    })
    .build();

// ---------------------------------------------------------------
// Step 03: 深度研究（顺序 — 概念组 → 模式组）
// ---------------------------------------------------------------
const stepDeepDive: SourceStep = step('deep-dive', '深度研究')
    .target('对核心概念与实践模式进行依赖顺序驱动的深度研究。')
    .summary('核心概念研究 → 实践模式研究（后者依赖前者）')
    .dependsOn('organize')
    .seq('deep-dive-seq', '深度研究', [
        doAction('search', 'dive-concepts', 'dive-concepts', `你是核心概念研究员。深入研究 foundations 类的每条发现：
1. 查找权威资料
2. 解释原理和设计决策
3. 指出常见误解

产出 {workDir}/.meta/dive-concepts.json`),
        doAction('search', 'dive-patterns', 'dive-patterns', `你是实践模式研究员。深入研究 patterns 类的每条发现：
1. 基于核心概念分析模式原理
2. 给出代码示例
3. 对比不同方案的权衡

产出 {workDir}/.meta/dive-patterns.json`),
    ])
    .reads({ path: '{workDir}/.meta/organized.json', description: '整理结果', required: true })
    .writes(
        { path: '{workDir}/.meta/dive-concepts.json', description: '核心概念研究' },
        { path: '{workDir}/.meta/dive-patterns.json', description: '实践模式研究' },
    )
    .reuse(
        { ifExists: '{workDir}/.meta/dive-concepts.json', skipDescription: '核心概念研究已完成' },
        { ifExists: '{workDir}/.meta/dive-patterns.json', skipDescription: '实践模式研究已完成' },
    )
    .checkpoint({
        checkItems: ['核心概念发现数', '实践模式发现数', '依赖研究完整性'],
        clarifyPrompt: '深度研究完成。确认后进入报告生成。',
        onConfirm: 'continue',
        onReject: 'rollback',
    })
    .build();

// ---------------------------------------------------------------
// Step 04: 报告生成（Map — 对每个章节执行同一 worker）
// ---------------------------------------------------------------
const stepReport: SourceStep = step('report', '报告生成')
    .target('按章节逐个生成研究报告，并输出可独立阅读的 Markdown。')
    .summary('按章节逐个生成研究报告')
    .dependsOn('deep-dive')
    .map(
        'report-map',
        '章节报告生成',
        { path: '{workDir}/.meta/organized.json#categories' },
        doAction('generate', 'report-worker', 'report-{chapter}', `撰写报告章节 {chapter}。

基于深度研究成果：
1. 概述该章节内容
2. 选取核心发现展开
3. 指出实践建议
4. 标注争议和待确认点

产出 {workDir}/.meta/report/{chapter}.md`),
        3,
    )
    .reads(
        { path: '{workDir}/.meta/dive-concepts.json', description: '核心概念研究', required: true },
        { path: '{workDir}/.meta/dive-patterns.json', description: '实践模式研究', required: true },
    )
    .writes({ path: '{workDir}/.meta/report/{chapter}.md', description: '报告章节' })
    .reuse({ ifExists: '{workDir}/.meta/report/{chapter}.md', skipDescription: '报告章节已生成' })
    .checkpoint({
        checkItems: ['报告章节数', '每章主要内容', '完整性评估'],
        clarifyPrompt: '报告生成完成。请确认报告质量。通过则结束，拒绝则回退修正。',
        onConfirm: 'continue',
        onReject: 'rollback',
    })
    .build();

const model: SkillSourceModel = {
    meta: {
        name: 'tech-research',
        title: '前端技术调研',
        description: '针对一个前端技术主题，从探索到产出的完整调研流程',
        frontmatterDescription: '针对一个前端技术主题，从探索到产出的完整调研流程',
        callExamples: [],
        params: [],
        phases: [],
    },
    steps: [stepParse, stepExplore, stepOrganize, stepDeepDive, stepReport],
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
