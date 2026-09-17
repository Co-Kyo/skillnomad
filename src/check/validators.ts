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
import {
    CHAIN_TERMINAL,
    resolveChain,
    formatInterval,
    collectTasks,
} from '../compiler/internal.js';

// skillnomad/check —— 声明自洽检查（库函数）：返回对不对、错在哪。
// 只收判据，不收计算；调用方为主包构建管线与 validate 命令。

export interface ValidationError {
    stepId: string;
    field: string;
    message: string;
}

/** Recursively validate a ControlNode tree */
function validateControlNode(
    node: ControlNode,
    path: string,
    errors: ValidationError[],
    stepId: string,
): void {
    if (!node || typeof node !== 'object') {
        errors.push({ stepId, field: path, message: 'Invalid node: must be an object' });
        return;
    }
    if (!node.kind || !['task', 'seq', 'parallel', 'map', 'branch', 'loop'].includes(node.kind)) {
        errors.push({ stepId, field: `${path}.kind`, message: `Invalid or missing kind: "${(node as any).kind}"` });
        return;
    }

    switch (node.kind) {
        case 'task':
            if (!node.task) {
                errors.push({ stepId, field: `${path}.task`, message: 'Task node must have a task property' });
            } else {
                if (!node.task.id) errors.push({ stepId, field: `${path}.task.id`, message: 'TaskDef id is required' });
                if (!node.task.label) errors.push({ stepId, field: `${path}.task.label`, message: 'TaskDef label is required' });
                if (!node.task.type) errors.push({ stepId, field: `${path}.task.type`, message: 'TaskDef type is required' });
                if (!node.task.body) errors.push({ stepId, field: `${path}.task.body`, message: 'TaskDef body is required' });
            }
            break;
        case 'seq':
            if (!node.id) errors.push({ stepId, field: `${path}.id`, message: 'SeqNode id is required' });
            if (!node.nodes || !Array.isArray(node.nodes)) {
                errors.push({ stepId, field: `${path}.nodes`, message: 'SeqNode must have a nodes array' });
            } else {
                node.nodes.forEach((child, i) => validateControlNode(child, `${path}.nodes[${i}]`, errors, stepId));
            }
            break;
        case 'parallel':
            if (!node.id) errors.push({ stepId, field: `${path}.id`, message: 'ParallelNode id is required' });
            if (!node.branches || !Array.isArray(node.branches)) {
                errors.push({ stepId, field: `${path}.branches`, message: 'ParallelNode must have a branches array' });
            } else {
                node.branches.forEach((child, i) => validateControlNode(child, `${path}.branches[${i}]`, errors, stepId));
            }
            break;
        case 'map':
            if (!node.id) errors.push({ stepId, field: `${path}.id`, message: 'MapNode id is required' });
            if (!node.worker) {
                errors.push({ stepId, field: `${path}.worker`, message: 'MapNode must have a worker node' });
            } else {
                validateControlNode(node.worker, `${path}.worker`, errors, stepId);
            }
            break;
        case 'branch':
            if (!node.id) errors.push({ stepId, field: `${path}.id`, message: 'BranchNode id is required' });
            if (!node.condition) errors.push({ stepId, field: `${path}.condition`, message: 'BranchNode must have a condition' });
            if (!node.then) {
                errors.push({ stepId, field: `${path}.then`, message: 'BranchNode must have a then node' });
            } else {
                validateControlNode(node.then, `${path}.then`, errors, stepId);
            }
            if (node.else) validateControlNode(node.else, `${path}.else`, errors, stepId);
            break;
        case 'loop':
            if (!node.id) errors.push({ stepId, field: `${path}.id`, message: 'LoopNode id is required' });
            if (!node.until) errors.push({ stepId, field: `${path}.until`, message: 'LoopNode must have an until condition' });
            if (!node.body) {
                errors.push({ stepId, field: `${path}.body`, message: 'LoopNode must have a body node' });
            } else {
                validateControlNode(node.body, `${path}.body`, errors, stepId);
            }
            break;
    }
}

export function validateStep(step: StepDefinition): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!step.id) {
        errors.push({ stepId: '(unknown)', field: 'id', message: 'Step id is required' });
    }
    if (!step.title) {
        errors.push({ stepId: step.id, field: 'title', message: 'Title is required' });
    }
    if (!step.description) {
        errors.push({ stepId: step.id, field: 'description', message: 'Description is required' });
    }

    if (!step.graph) {
        errors.push({ stepId: step.id, field: 'graph', message: 'Control tree graph is required' });
    } else {
        validateControlNode(step.graph, 'graph', errors, step.id);
    }

    if (!step.writes || step.writes.length === 0) {
        errors.push({ stepId: step.id, field: 'writes', message: 'At least one output file required' });
    }

    if (step.barrier) {
        if (!step.barrier.clarifyPrompt) {
            errors.push({ stepId: step.id, field: 'barrier.clarifyPrompt', message: 'Barrier must have a clarify prompt' });
        }
        if (!step.barrier.checkItems || step.barrier.checkItems.length === 0) {
            errors.push({ stepId: step.id, field: 'barrier.checkItems', message: 'Barrier must have at least one check item' });
        }
    }

    return errors;
}

export function validateBarrierContinuity(steps: StepDefinition[]): ValidationError[] {
    const errors: ValidationError[] = [];
    let lastBarrierIndex = -1;
    for (let i = 0; i < steps.length; i++) {
        if (steps[i].barrier) lastBarrierIndex = i;
    }
    for (let i = 0; i <= lastBarrierIndex; i++) {
        if (!steps[i].barrier) {
            errors.push({
                stepId: steps[i].id,
                field: 'barrier',
                message: `Step "${steps[i].id}" at index ${i} is before the last barrier (index ${lastBarrierIndex}) but has no barrier defined`,
            });
        }
    }
    return errors;
}

export function validateDependencyRefs(steps: Array<{ id: string; dependsOn?: string }>): ValidationError[] {
    const errors: ValidationError[] = [];
    const ids = new Set(steps.map(s => s.id));
    for (const step of steps) {
        if (step.dependsOn && !ids.has(step.dependsOn)) {
            errors.push({
                stepId: step.id,
                field: 'dependsOn',
                message: `Depends on "${step.dependsOn}" which is not a defined step`,
            });
        }
    }
    return errors;
}

// ---------------------------------------------------------------
// Linear chain contract
// ---------------------------------------------------------------

/**
 * 链的终止标记。末步的 `next` 可显式指向它，表示「链到此结束」。
 */

/**
 * **线性链契约校验**
 *
 * 步骤（顶层 step）之间的关系是一条链，不是 DAG：顶层 step 是不可并行的执行单位，
 * 需要并行或分支时应在 `flow` 内部用 `parallel` / `map` 表达，
 * 而不是拆成多个顶层步骤。
 *
 * 本函数把该契约变成可执行约束，检查四类违规：
 * 1. **多依赖** —— 一个步骤声明了多于一个前驱；
 * 2. **多后继** —— 一个步骤被多于一个步骤指定为 `next`；
 * 3. **断链** —— 存在多个起点，或有步骤从起点不可达；
 * 4. **成环** —— 链首尾相接，无法终止。
 *
 * 悬空的 `dependsOn` 引用由 `validateDependencyRefs` 负责；此处额外校验 `next` 的指向。
 *
 * 违反契约会在构建期报错，**不会静默线性化**。
 */
export function validateStepChain(steps: Array<{ id: string; dependsOn?: string; next?: string }>): ValidationError[] {
    const errors: ValidationError[] = [];
    if (steps.length === 0) return errors;

    const ids = new Set(steps.map(s => s.id));

    // 1) 每个步骤最多一个前驱（8.4 收窄为单值后，类型已保证；此处是运行时兜底）
    //    仅拦截真正违反单值契约的多依赖数组（length>1）；空数组（=根）与单元素数组
    //    （等价单值）视为合法兼容形态 —— 类型层已不允许，运行时只防 JSON 等导入的非法数据。
    for (const step of steps) {
        if (Array.isArray(step.dependsOn) && step.dependsOn.length > 1) {
            errors.push({
                stepId: step.id,
                field: 'dependsOn',
                message:
          `Linear chain contract: step "${step.id}" declares multiple ` +
          `dependencies via array (${step.dependsOn.join(', ')}); 8.4 起收窄为单值，` +
          `请用单个前驱。`,
            });
        }
    }

    // 2) 每个步骤最多一个后继（next 是派生字段，仅在显式声明时校验）
    const predecessors = new Map<string, string[]>();
    for (const step of steps) {
        const nx = step.next;
        if (!nx || nx === CHAIN_TERMINAL || !ids.has(nx)) continue;
        predecessors.set(nx, [...(predecessors.get(nx) ?? []), step.id]);
    }
    for (const [target, sources] of predecessors) {
        if (sources.length > 1) {
            errors.push({
                stepId: target,
                field: 'next',
                message:
          `Linear chain contract: step "${target}" is targeted as next by ${sources.length} ` +
          `steps (${sources.join(', ')}); a top-level step may have at most one successor.`,
            });
        }
    }

    // 3) next 必须指向真实步骤，或使用终止标记
    for (const step of steps) {
        const nx = step.next;
        if (nx && nx !== CHAIN_TERMINAL && !ids.has(nx)) {
            errors.push({
                stepId: step.id,
                field: 'next',
                message:
          `Linear chain contract: step "${step.id}" declares next "${nx}" which is not a ` +
          `defined step. Use the terminal marker "${CHAIN_TERMINAL}" to end the chain.`,
            });
        }
    }

    // 4) 断链与成环：由 dependsOn 反推链，从唯一起点遍历
    // 入度 = 该步骤声明了几个前驱（单值，最多 1：指向真实步骤时记 1）
    const indegree = new Map<string, number>(steps.map(s => [s.id, 0]));
    for (const step of steps) {
        if (step.dependsOn && ids.has(step.dependsOn)) indegree.set(step.id, (indegree.get(step.id) ?? 0) + 1);
    }
    // 入度为 0 即链起点
    const roots = steps.filter(s => (indegree.get(s.id) ?? 0) === 0).map(s => s.id);

    if (roots.length === 0) {
        errors.push({
            stepId: '(pipeline)',
            field: 'dependsOn',
            message:
        'Linear chain contract: no root step found — every step has a predecessor, ' +
        'so the chain is circular.',
        });
        return errors;
    }

    if (roots.length > 1) {
        errors.push({
            stepId: '(pipeline)',
            field: 'dependsOn',
            message:
        `Linear chain contract: ${roots.length} root steps found (${roots.join(', ')}). ` +
        `Steps must form a single connected chain; a second root means the chain is broken.`,
        });
    }

    const successorOf = new Map<string, string>();
    for (const step of steps) {
        if (step.dependsOn) successorOf.set(step.dependsOn, step.id);
    }

    const visited = new Set<string>();
    let cursor: string | undefined = roots[0];
    while (cursor && !visited.has(cursor)) {
        visited.add(cursor);
        cursor = successorOf.get(cursor);
    }

    if (cursor) {
        errors.push({
            stepId: cursor,
            field: 'dependsOn',
            message: `Linear chain contract: loop detected — step "${cursor}" is revisited while walking the chain.`,
        });
    } else if (visited.size !== steps.length) {
        const orphans = steps.filter(s => !visited.has(s.id)).map(s => s.id);
        errors.push({
            stepId: '(pipeline)',
            field: 'dependsOn',
            message:
        `Linear chain contract: chain is disconnected — ${orphans.length} step(s) unreachable ` +
        `from the root (${orphans.join(', ')}).`,
        });
    }

    return errors;
}

// ---------------------------------------------------------------
// Linear chain derivation（派生：顺序的副产物由框架算，不要求手写）
// ---------------------------------------------------------------

/**
 * 走一遍线性链，返回**自起点起的有序 id 列表**——数组下标即步骤序号。
 *
 * 这是链上一切派生值的共同底座：`next`、`initStepId`、
 * 阶段区间标注都从它算起。集中一处的原因很直接：
 * 每个派生函数各写一遍遍历，就会各漂移一遍。
 *
 * 返回 `null` 表示链不成立（多个起点 / 成环 / 断链）——此时**不猜测**，
 * 诊断交给 `validateStepChain()`，派生函数一律回落为「不产出」。
 */
export function validatePhaseCoverage(
    steps: Array<{ id: string; dependsOn?: string }>,
    phases: Array<{ name: string; stepIds: string[] }>,
): ValidationError[] {
    const errors: ValidationError[] = [];
    if (phases.length === 0) return errors;

    const ids = new Set(steps.map(s => s.id));
    const chain = resolveChain(steps);

    // 1) 阶段引用的步骤必须存在
    const ownerOf = new Map<string, string>();
    for (const phase of phases) {
        for (const id of phase.stepIds) {
            if (!ids.has(id)) {
                errors.push({
                    stepId: id,
                    field: 'phases',
                    message: `Phase "${phase.name}" references step "${id}" which is not defined.`,
                });
                continue;
            }
            const owner = ownerOf.get(id);
            if (owner !== undefined) {
                errors.push({
                    stepId: id,
                    field: 'phases',
                    message:
            `Step "${id}" is claimed by more than one phase ` +
            `("${owner}" and "${phase.name}"); phases must partition the chain.`,
                });
                continue;
            }
            ownerOf.set(id, phase.name);
        }
    }

    // 2) 覆盖：链上每一步都必须恰好属于一个阶段
    if (chain) {
        const uncovered = chain.filter(id => !ownerOf.has(id));
        if (uncovered.length > 0) {
            errors.push({
                stepId: '(pipeline)',
                field: 'phases',
                message:
          `Phases declare ${ownerOf.size} of ${chain.length} steps; ` +
          `${uncovered.length} step(s) uncovered: ${uncovered.join(', ')}.`,
            });
        }
    }

    if (!chain) return errors;
    const seqOf = new Map(chain.map((id, i) => [id, i]));

    // 3) 连续：一个阶段必须是链上的一段连续区间
    for (const phase of phases) {
        if (phase.stepIds.some(id => !ids.has(id))) continue; // 已在上一步报错，跳过
        if (phase.stepIds.length === 0) continue;
        const seqs = phase.stepIds.map(id => seqOf.get(id)!).sort((a, b) => a - b);
        const span = seqs[seqs.length - 1] - seqs[0] + 1;
        if (span !== seqs.length) {
            errors.push({
                stepId: '(pipeline)',
                field: 'phases',
                message:
          `Phase "${phase.name}" spans ${formatInterval(seqs[0], seqs[seqs.length - 1])} ` +
          `but claims only ${seqs.length} step(s); a phase must be a contiguous run ` +
          `on the chain.`,
            });
        }
    }

    // 4) 顺序：阶段声明顺序必须与链序一致
    for (let i = 1; i < phases.length; i++) {
        const prev = phases[i - 1];
        const curr = phases[i];
        if (prev.stepIds.length === 0 || curr.stepIds.length === 0) continue;
        if (prev.stepIds.some(id => !ids.has(id)) || curr.stepIds.some(id => !ids.has(id))) continue;
        const prevEnd = Math.max(...prev.stepIds.map(id => seqOf.get(id)!));
        const currStart = Math.min(...curr.stepIds.map(id => seqOf.get(id)!));
        if (currStart <= prevEnd) {
            errors.push({
                stepId: '(pipeline)',
                field: 'phases',
                message:
          `Phases are declared out of order: "${prev.name}" ends at step ` +
          `${String(prevEnd).padStart(2, '0')} but "${curr.name}" starts at step ` +
          `${String(currStart).padStart(2, '0')}.`,
            });
        }
    }

    return errors;
}

/**
 * **模块引用一致性校验（8.15 Step 2 · 模块抽象落地）**
 *
 * 输入：步骤定义 + 模块注册表（`SourceContract[]`，来自 `model.contracts`）。
 * 心智：内容模块用符号名注册引用，归属由声明层（scope）决定，路径只是渲染载体。
 *
 * **V1 · 角色 × 归属一致性**：`as:'contract'` 的引用必须指向 `scope:'skill'` 的注册条目。
 * 契约 = 跨步共享的约定；指向 step 级模块说明贴错了角色标签 —— 提示改标签或提升为 SkillModule。
 *
 * **V2 · 私有可见性**：step 级模块（StepModule）只能被归属步骤引用；
 * 被多个步骤引用 → 报错。跨步需求 = 它本就是 SkillModule（身份完全性不同），
 * 升级路径 = 改一行声明（step:xxx → skill:xxx），文件与路径不搬家。
 */
export function validateModuleUsage(
    steps: StepDefinition[],
    registry: SourceContract[] = [],
): ValidationError[] {
    const errors: ValidationError[] = [];
    const byPath = new Map(registry.map((c) => [c.path, c]));

    // V1：as:'contract' → scope 必须为 'skill'
    for (const step of steps) {
        for (const ref of step.reads ?? []) {
            if (ref.as !== 'contract') continue;
            const reg = byPath.get(ref.path);
            if (!reg) {
                errors.push({
                    stepId: step.id,
                    field: 'reads',
                    message: `as:'contract' 引用 ${ref.path} 未在模块注册表中登记（8.15：契约引用须指向已注册模块）`,
                });
            } else if (reg.scope !== 'skill') {
                errors.push({
                    stepId: step.id,
                    field: 'reads',
                    message: `as:'contract' 引用了 step 级模块 ${reg.id}（${ref.path}）：契约须为 skill 级共享，请改用 as:'schema'/'rule'/'method'，或提升为 SkillModule`,
                });
            }
        }
    }

    // V2：step 级模块被跨步引用 → 报错（StepModule 严格私有）
    for (const reg of registry) {
        if (reg.scope !== 'step') continue;
        const users = new Set<string>();
        for (const step of steps) {
            const uses = [...(step.reads ?? []), ...(step.writes ?? [])].some(
                (r) => r.path === reg.path,
            );
            if (uses) users.add(step.id);
        }
        if (users.size > 1) {
            errors.push({
                stepId: reg.step ?? '(pipeline)',
                field: 'module',
                message: `step 级模块 ${reg.id}（${reg.path}）被 ${users.size} 个步骤引用（${[...users].join(', ')}）：StepModule 严格私有，跨步引用须提升为 SkillModule（升级 = 改一行声明）`,
            });
        }
    }

    return errors;
}

/**
 * **B1 · body 三段分块（联调薄校验；D40-R1 扩动作通用）**：含动作词的 task body 须三段齐。
 * 只认结构标记，不认散文内容（散文归 mdlego，不管对错）：
 * 含"搜法／检测／标注／修正"任一即须含"判据："与"参照"字样；缺一即红。旧"搜法"逻辑不变（子集）。
 * 定位：mdlego 供砖（文字形状），本校验只供钩子（分块齐不齐），两仓独立。
 */
const B1_ACTION_WORDS = ['搜法', '检测', '标注', '修正'] as const;
export function validateBodySections(steps: StepDefinition[]): ValidationError[] {
    const errors: ValidationError[] = [];
    for (const step of steps) {
        if (!step.graph) continue;
        for (const t of collectTasks(step.graph)) {
            if (!t.body || !B1_ACTION_WORDS.some((w) => t.body.includes(w))) continue;
            if (!t.body.includes('判据：')) {
                errors.push({
                    stepId: step.id,
                    field: `graph.task.${t.id}.body`,
                    message: `task ${t.id} 含动作词但缺"判据："段（body 三段：做什么／动作／判据＋参照）`,
                });
            }
            if (!t.body.includes('参照')) {
                errors.push({
                    stepId: step.id,
                    field: `graph.task.${t.id}.body`,
                    message: `task ${t.id} 含动作词但缺"参照"段（body 三段：做什么／动作／判据＋参照）`,
                });
            }
        }
    }
    return errors;
}

/**
 * **V4 · 模块注册表合法性（D35 W2 ＋ 全链路接线）**：`SourceModule[]` 自身合法 ＋ 注册表引用在册。
 * 不碰 `validateModuleUsage(steps, registry)` 签名。
 * - V4a：module id 唯一（重复 id 即红；R2 F-4 无 deps 降级位）；
 * - V4b：deps 环即红（DFS；无 deps 即无边，不报错）；
 * - V4c：注册表条目 `module` 引用的 id 必须在册（D35 双轨：存在即认 id，未登记即红）。
 */
export function validateModules(
    modules: import('../types/index.js').SourceModule[] = [],
    registry: import('../types/index.js').SourceContract[] = [],
): ValidationError[] {
    const errors: ValidationError[] = [];
    const seen = new Set<string>();
    for (const m of modules) {
        if (seen.has(m.id)) {
            errors.push({ stepId: '(modules)', field: 'module', message: `模块 id 重复：${m.id}（D35 V4a）` });
        }
        seen.add(m.id);
    }
    for (const c of registry) {
        if (c.module && !seen.has(c.module)) {
            errors.push({ stepId: '(modules)', field: 'module', message: `模块引用未登记：${c.id} → ${c.module}（D35 V4c）` });
        }
    }
    const adj = new Map(modules.map((m) => [m.id, (m.deps ?? []).filter((d) => m.id !== d)]));
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map([...adj.keys()].map((k) => [k, WHITE]));
    const stack: string[] = [];
    const visit = (u: string): boolean => {
        color.set(u, GRAY);
        stack.push(u);
        for (const v of adj.get(u) ?? []) {
            if (!adj.has(v)) continue;
            if (color.get(v) === GRAY) return true;
            if (color.get(v) === WHITE && visit(v)) return true;
        }
        stack.pop();
        color.set(u, BLACK);
        return false;
    };
    for (const u of adj.keys()) {
        if (color.get(u) === WHITE && visit(u)) {
            errors.push({ stepId: '(modules)', field: 'module', message: `模块依赖环：${[...stack, u].join(' → ')}（D35 V4b）` });
            break;
        }
    }
    return errors;
}

// ---------------------------------------------------------------
// Dependency resolver (topological sort)
// ---------------------------------------------------------------

