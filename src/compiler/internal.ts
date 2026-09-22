import type {
    ControlNode,
    TaskNode,
    SeqNode,
    ParallelNode,
    MapNode,
    BranchNode,
    LoopNode,
    TaskDef,
    BarrierDef,
    StepDefinition,
    FileRef,
    ResolvedStep,
    ResolvedPipeline,
    PipelineState,
    PipelineStateManager,
    StepState,
    StepStatus,
    SourceContract,
} from '../types/index.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// skillnomad/compiler —— Compiler 内部件：派生、遍历、模板解析。
// 本包与 validate 命令可用；不进作者面快照，不写文档，不承诺稳定。

/** 链终止标记（末步的下一跳）。 */
export const CHAIN_TERMINAL = 'done';

export function resolveBuildTimeVars(
    template: string,
    vars: Record<string, string>,
): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        if (vars[key] !== undefined) return vars[key];
        throw new Error(`Unresolved build-time variable: {{${key}}}`);
    });
}

export function resolveRuntimeVars(
    template: string,
    vars: Record<string, string>,
): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => {
        if (vars[key] !== undefined) return vars[key];
        return `{${key}}`;
    });
}

export function resolveFileRef(
    ref: FileRef,
    buildVars: Record<string, string>,
): string {
    return resolveBuildTimeVars(ref.path, buildVars);
}

// ---------------------------------------------------------------
// Validation
// ---------------------------------------------------------------

export function resolveChain(
    steps: Array<{ id: string; dependsOn?: string }>,
): string[] | null {
    if (steps.length === 0) return [];

    const ids = new Set(steps.map(s => s.id));

    // 入度 = 是否声明了真实存在的前驱（单值，最多 1）
    const indegree = new Map<string, number>(steps.map(s => [s.id, 0]));
    for (const step of steps) {
        if (step.dependsOn && ids.has(step.dependsOn)) indegree.set(step.id, (indegree.get(step.id) ?? 0) + 1);
    }
    const roots = steps.filter(s => (indegree.get(s.id) ?? 0) === 0).map(s => s.id);
    if (roots.length !== 1) return null; // 链不唯一 → 不猜测

    // 前驱 → 后继
    const successorOf = new Map<string, string>();
    for (const step of steps) {
        if (step.dependsOn) successorOf.set(step.dependsOn, step.id);
    }

    const chain: string[] = [];
    const seen = new Set<string>();
    let cursor: string | undefined = roots[0];
    while (cursor && !seen.has(cursor)) {
        seen.add(cursor);
        chain.push(cursor);
        cursor = successorOf.get(cursor);
    }

    // 未走完说明有环或断链 —— 同样不猜测
    return chain.length === steps.length ? chain : null;
}

/**
 * 由步骤声明推导线性链的**下一跳映射**。
 *
 * `next` 是派生值：开发者声明了 `dependsOn`（或什么都不声明而由链序决定）之后，
 * 下一步是谁应该由框架算出来，而不是让人再抄一遍。
 *
 * 只需 `id` 与 `dependsOn`，不依赖完整模型，
 * 因此可以在渲染步骤正文之前调用。
 *
 * - 末步的下一跳为终止标记 `CHAIN_TERMINAL`；
 * - 若链不唯一（多个起点）或不成链，返回空对象——此时不猜测，
 *   交由 `validateStepChain()` 报错说明原因。
 */
export function deriveChainNext(
    steps: Array<{ id: string; dependsOn?: string }>,
): Record<string, string> {
    const nextOf: Record<string, string> = {};
    const chain = resolveChain(steps);
    if (!chain) return nextOf;

    for (let i = 0; i < chain.length; i++) {
        nextOf[chain[i]] = chain[i + 1] ?? CHAIN_TERMINAL;
    }
    return nextOf;
}

/**
 * 由步骤声明推导**链起点**，即负责 pipeline 初始化的步骤。
 *
 * `initStepId` 是派生值：链已经声明了谁没有前驱，
 * 「第一步是谁」不该再由人抄一遍字面量。
 *
 * 链不成立时返回 `undefined`——不猜测，交由 `validateStepChain()` 说明原因。
 */
export function deriveInitStepId(
    steps: Array<{ id: string; dependsOn?: string }>,
): string | undefined {
    const chain = resolveChain(steps);
    return chain && chain.length > 0 ? chain[0] : undefined;
}

// ---------------------------------------------------------------
// Phase intervals（派生：阶段边界与流程总览由框架算，不要求手写）
// ---------------------------------------------------------------

/** 一个阶段在链上的边界——全部由「阶段意图 + 链序」推导，无一手写。 */
export interface PhaseInterval {
    /** 阶段名（开发者声明的事实） */
    name: string;
    /** 该阶段在链上的起止序号（派生） */
    startSeq: number;
    endSeq: number;
    /** 该阶段包含的步骤 id，按链序排列（派生） */
    stepIds: string[];
    /** 区间标注，如 `(00)` / `(04-06)`（派生，可直接渲染） */
    label: string;
}

/** `(04-06)`；单步阶段简写为 `(04)`。序号两位补零，与 processes 文件名一致。 */
export function formatInterval(startSeq: number, endSeq: number): string {
    const nn = (n: number) => String(n).padStart(2, '0');
    return startSeq === endSeq ? `(${nn(startSeq)})` : `(${nn(startSeq)}-${nn(endSeq)})`;
}

/**
 * 由「阶段包含哪些步骤」+ 链序，推导每个阶段的**边界与区间标注**。
 *
 * 开发者只声明意图（`phases[].stepIds`），不声明下标；
 * 「第几步到第几步」是顺序的副产物，属于框架。
 *
 * 链不成立、或某个阶段引用了链外的步骤时返回 `[]`——不猜测，
 * 诊断交给 `validatePhaseCoverage()`。
 */
export function derivePhaseIntervals(
    steps: Array<{ id: string; dependsOn?: string }>,
    phases: Array<{ name: string; stepIds: string[] }>,
): PhaseInterval[] {
    if (phases.length === 0) return [];
    const chain = resolveChain(steps);
    if (!chain) return [];

    const seqOf = new Map(chain.map((id, i) => [id, i]));

    const intervals: PhaseInterval[] = [];
    for (const phase of phases) {
    // 只要声明里有一步不在链上，整段边界都不可信 → 不产出
        if (phase.stepIds.some(id => !seqOf.has(id))) return [];

        const seqs = phase.stepIds.map(id => seqOf.get(id)!).sort((a, b) => a - b);
        const startSeq = seqs[0];
        const endSeq = seqs[seqs.length - 1];
        intervals.push({
            name: phase.name,
            startSeq,
            endSeq,
            stepIds: seqs.map(seq => chain[seq]),
            label: formatInterval(startSeq, endSeq),
        });
    }
    return intervals;
}

/** 阶段之间的连接符，同时用于总览图与列宽计算。 */
const PHASE_ARROW = ' → ';

/**
 * 按东亚宽度规则计算显示宽度：CJK 与全角占两列，其余占一列。
 * 对齐必须按显示宽度算，否则中文阶段名下方的标注会整体偏移。
 */
function displayWidth(text: string): number {
    let width = 0;
    for (const ch of text) {
        const cp = ch.codePointAt(0) ?? 0;
        const wide =
            (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0x303e) ||
      (cp >= 0x3041 && cp <= 0x33ff) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0xa000 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe30 && cp <= 0xfe6f) ||
      (cp >= 0xff00 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6) ||
      (cp >= 0x20000 && cp <= 0x3fffd);
        width += wide ? 2 : 1;
    }
    return width;
}

/**
 * 由阶段区间推导**流程总览**（两行：阶段名一行，区间标注一行）。
 *
 * `flowOverview` 是派生值：开发者声明了阶段意图之后，
 * 「第几步到第几步」应该由框架算出来，而不是让人再抄一遍并对齐空格。
 *
 * 开发者仍可用 `meta.flowOverview` 覆盖——布局属于表达，框架不垄断，
 * 只是不再**要求**手写。
 *
 * 无法推导时返回 `undefined`（此时渲染器回落到纯箭头图）。
 */
export function deriveFlowOverview(
    steps: Array<{ id: string; dependsOn?: string }>,
    phases: Array<{ name: string; stepIds: string[] }>,
): string | undefined {
    const intervals = derivePhaseIntervals(steps, phases);
    if (intervals.length === 0) return undefined;

    const line1 = intervals.map(p => p.name).join(PHASE_ARROW);
    const arrowWidth = displayWidth(PHASE_ARROW);

    // 第二行：把每个区间标注居中排在其阶段名下方。
    // 标注比阶段名宽时（常见于多步阶段）会自然向左溢出，
    // 再用 `minCol` 保证相邻标注之间至少留一列，避免粘连。
    const placed: Array<{ at: number; label: string }> = [];
    let nameCol = 0;
    let minCol = 0;
    for (const p of intervals) {
        const nameWidth = displayWidth(p.name);
        const labelWidth = displayWidth(p.label);
        const centered = nameCol + Math.max(0, Math.floor((nameWidth - labelWidth) / 2));
        const at = Math.max(centered, minCol);
        placed.push({ at, label: p.label });
        minCol = at + labelWidth + 1;
        nameCol += nameWidth + arrowWidth;
    }

    let line2 = '';
    for (const { at, label } of placed) {
        if (at > line2.length) line2 += ' '.repeat(at - line2.length);
        line2 += label;
    }

    return `${line1}\n${line2}`;
}

/**
 * 校验「阶段意图」是否能安全地作为派生来源。
 *
 * 阶段是派生阶段边界与流程总览的唯一输入，因此它必须满足：
 * 引用的步骤存在、覆盖链上每一步且不重叠、每段连续、声明顺序与链序一致。
 * 任一条件不满足就报错——因为此时框架算出来的区间标注是不可信的。
 */
export function resolveStepOrder(steps: StepDefinition[]): ResolvedPipeline {
    const idToStep = new Map(steps.map(s => [s.id, s]));
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const step of steps) {
        adj.set(step.id, []);
        inDegree.set(step.id, 0);
    }
    for (const step of steps) {
        if (step.dependsOn) {
            adj.get(step.dependsOn)?.push(step.id);
            inDegree.set(step.id, (inDegree.get(step.id) ?? 0) + 1);
        }
    }

    const queue: string[] = [];
    for (const step of steps) {
        if ((inDegree.get(step.id) ?? 0) === 0) queue.push(step.id);
    }

    const order: string[] = [];
    while (queue.length > 0) {
        const node = queue.shift()!;
        order.push(node);
        for (const neighbor of adj.get(node) ?? []) {
            const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
            inDegree.set(neighbor, newDegree);
            if (newDegree === 0) queue.push(neighbor);
        }
    }

    if (order.length !== steps.length) {
        const missing = steps.filter(s => !order.includes(s.id)).map(s => s.id);
        throw new Error(`Circular dependency detected among steps: ${missing.join(', ')}`);
    }

    const stepOrder: Record<string, number> = {};
    const resolvedSteps: ResolvedStep[] = [];

    for (let seq = 0; seq < order.length; seq++) {
        const id = order[seq];
        stepOrder[id] = seq;
        const step = idToStep.get(id)!;
        const buildVars = { stepSeq: String(seq).padStart(2, '0'), stepId: id };

        resolvedSteps.push({
            ...step,
            seq,
            resolvedReads: step.reads.map(r => resolveFileRef(r, buildVars)),
            resolvedWrites: step.writes.map(r => resolveFileRef(r, buildVars)),
        });
    }

    return { name: 'untitled', description: '', steps: resolvedSteps, stepOrder };
}

// ---------------------------------------------------------------
// ControlNode tree walker（替代旧的扁平 graph + edges 遍历）
// ---------------------------------------------------------------

/** 递归遍历 ControlNode 树，对每个节点执行回调 */
export function walkGraph(
    graph: ControlNode,
    visit: (node: ControlNode, depth: number) => void,
): void {
    function recurse(node: ControlNode, depth: number): void {
        switch (node.kind) {
            case 'task':
                visit(node, depth);
                break;
            case 'seq':
                visit(node, depth);
                for (const child of node.nodes) {
                    recurse(child, depth + 1);
                }
                break;
            case 'parallel':
                visit(node, depth);
                for (const branch of node.branches) {
                    recurse(branch, depth + 1);
                }
                if (node.converge) {
                    visit({ kind: 'task', task: node.converge }, depth + 1);
                }
                break;
            case 'map':
                visit(node, depth);
                recurse(node.worker, depth + 1);
                if (node.reduce) {
                    visit({ kind: 'task', task: node.reduce }, depth + 1);
                }
                break;
            case 'branch':
                visit(node, depth);
                recurse(node.then, depth + 1);
                if (node.else) recurse(node.else, depth + 1);
                break;
            case 'loop':
                visit(node, depth);
                recurse(node.body, depth + 1);
                break;
        }
    }
    recurse(graph, 0);
}

/** 获取 ControlNode 树中所有叶子任务的扁平列表 */
export function collectTasks(graph: ControlNode): TaskDef[] {
    const tasks: TaskDef[] = [];
    walkGraph(graph, (node) => {
        if (node.kind === 'task') {
            tasks.push(node.task);
        }
    });
    return tasks;
}

/** 描述 ControlNode 树的拓扑结构（用于预览） */
export function describeControlTree(graph: ControlNode): string {
    const lines: string[] = [];
    walkGraph(graph, (node, depth) => {
        const indent = '  '.repeat(depth);
        switch (node.kind) {
            case 'task':
                lines.push(`${indent}▪ ${node.task.label} [${node.task.type}]`);
                break;
            case 'seq':
                lines.push(`${indent}▸ ${node.label} [seq: ${node.nodes.length} nodes]`);
                break;
            case 'parallel':
                lines.push(`${indent}▤ ${node.label} [parallel: ${node.branches.length} branches]`);
                if (node.converge) lines.push(`${indent}  ↳ converge: ${node.converge.label}`);
                break;
            case 'map':
                lines.push(`${indent}▦ ${node.label} [map: max ${node.maxConcurrency} concurrent]`);
                if (node.reduce) lines.push(`${indent}  ↳ reduce: ${node.reduce.label}`);
                break;
            case 'branch':
                lines.push(`${indent}◇ ${node.label} [branch: ${node.condition}]`);
                break;
            case 'loop':
                lines.push(`${indent}↻ ${node.label} [loop: until ${node.until}]`);
                break;
        }
    });
    return lines.join('\n');
}

// ---------------------------------------------------------------
// 运行时执行函数（stub — 平台适配时实现）
// ---------------------------------------------------------------

