// ============================================================
// scheduling — 调度策略模块（D35 W4 重做 · 建框架仓，P2 归属）
//
// 设计（v2，回应"W4 只是换地方放长文"批评）：
// - 数据层：带类型的数字与表（W/窗口/压缩/重试/槽位/模式枚举），不是段落；
// - 动词层：纯函数（windowWidth/slotsFor/labelFor/retryPolicy/isCompleted/proactiveChecks/taskAssembly），
//   调用即计算，配错即抛错；
// - 组合子层：batchParallel()/rollingWindow()/topoBatch() 返回结构（分批/首发/门禁），不是字符串；
// - 渲染层：renderPolicy()/renderMode()/renderBinding()/renderModuleDoc() 从同一份结构生成 Markdown，
//   写文档 = 调渲染传参，不是手写裁剪。
// - 本文件只留机制（默认值 = skillnomad 运行时约束）；业务配置（各 step 用哪种模式、超时表、label 模式）
//   归消费仓实例，框架不认识任何 step id。
// ============================================================

import type {
  SourceModule,
  SourceSchedulingPolicy,
  SchedulingBatchMode,
} from 'skillnomad-types';
import { defineModule } from 'skillnomad-types';

// ---------------------------------------------------------------
// 数据层：带类型的数字与表
// ---------------------------------------------------------------

/** 框架默认值 = skillnomad 运行时约束（消费仓实例同源，改这里全跟随）。 */
export const SCHEDULING = {
  concurrencyLimit: 5,
  windowBudget: { maxWindowSize: 4, inputChunkTokens: 6000, itemSummaryTokens: 500 },
  batchPolicy: { mode: 'rolling_window' as SchedulingBatchMode, maxBatchSize: 3, slotOccupancy: 1 },
} as const;

/** 重试默认：最多补发 1 次，原 task 重发，耗尽标 degraded 不阻塞。 */
export const RETRY_DEFAULT = {
  maxRetries: 1,
  reuseSameTask: true,
  onExhausted: 'degraded' as const,
} as const;

/** 三模式枚举（与 SchedulingBatchMode 同源，动作层的 switch 钥匙）。 */
export const STEP_MODES = ['batch_parallel', 'rolling_window', 'topo_batch'] as const;
export type StepMode = (typeof STEP_MODES)[number];

/** 即时校验三步 id（存在性 → JSON 合法 → 关键字段）。 */
export const PROACTIVE_CHECK_IDS = ['existence', 'json', 'fields'] as const;
export type ProactiveCheckId = (typeof PROACTIVE_CHECK_IDS)[number];

// ---------------------------------------------------------------
// 动词层：纯函数，调用即计算
// ---------------------------------------------------------------

/** 首发宽度：W = min(limitW, 命题数)；total<=0 返回 0；limitW 非正整数即抛错。 */
export function windowWidth(totalItems: number, limitW: number): number {
  if (!Number.isInteger(limitW) || limitW <= 0) {
    throw new Error(`windowWidth: limitW 必须为正整数（得 ${String(limitW)}）`);
  }
  if (!Number.isInteger(totalItems) || totalItems <= 0) return 0;
  return Math.min(limitW, totalItems);
}

/** 槽位占用：units 个任务单元 × 每单元 slotOccupancy 个槽。 */
export function slotsFor(unitCount: number, slotOccupancy = 1): number {
  if (!Number.isInteger(unitCount) || unitCount < 0) {
    throw new Error(`slotsFor: unitCount 必须为非负整数（得 ${String(unitCount)}）`);
  }
  if (!Number.isInteger(slotOccupancy) || slotOccupancy <= 0) {
    throw new Error(`slotsFor: slotOccupancy 必须为正整数（得 ${String(slotOccupancy)}）`);
  }
  return unitCount * slotOccupancy;
}

/** 分批数：ceil(total/limitW)；total<=0 返回 0。 */
export function batchesFor(totalItems: number, limitW: number): number {
  if (!Number.isInteger(limitW) || limitW <= 0) {
    throw new Error(`batchesFor: limitW 必须为正整数（得 ${String(limitW)}）`);
  }
  if (!Number.isInteger(totalItems) || totalItems <= 0) return 0;
  return Math.ceil(totalItems / limitW);
}

/** Label 生成：`search-{batch_id}` + {batch_id:'B1'} → `search-B1`；缺变量即抛错。 */
export function labelFor(pattern: string, vars: Record<string, string | number>): string {
  return pattern.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (vars[key] === undefined) {
      throw new Error(`labelFor: 缺变量 {${key}}（pattern: ${pattern}）`);
    }
    return String(vars[key]);
  });
}

/** 重试策略：默认 maxRetries=1；非负整数校验。 */
export function retryPolicy(maxRetries: number = RETRY_DEFAULT.maxRetries): {
  maxRetries: number;
  reuseSameTask: boolean;
  onExhausted: 'degraded';
} {
  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new Error(`retryPolicy: maxRetries 必须为非负整数（得 ${String(maxRetries)}）`);
  }
  return { maxRetries, reuseSameTask: true, onExhausted: 'degraded' };
}

/** 完成判定谓词：expected 全在 existing 即 completed，否则 failed。 */
export function isCompleted(existingFiles: string[], expectedFiles: string[]): boolean {
  return expectedFiles.every((f) => existingFiles.includes(f));
}

/** 即时校验三步（数据形态）：存在性 → JSON 合法 → 关键字段；任一步失败即 pending-retry。 */
export function proactiveChecks(): { id: ProactiveCheckId; what: string; onFail: 'pending-retry' }[] {
  return [
    { id: 'existence', what: 'expected_file 是否存在于磁盘', onFail: 'pending-retry' },
    { id: 'json', what: 'JSON 产物 json.load 是否报错（仅 JSON 产物）', onFail: 'pending-retry' },
    { id: 'fields', what: '关键字段是否齐全（按产物类型匹配）', onFail: 'pending-retry' },
  ];
}

/** task 组装：角色声明 + 执行指令 + 变量替换，三部分结构化（非拼接散文）。 */
export function taskAssembly(role: string, instruction: string, vars: Record<string, string>): {
  role: string;
  instruction: string;
  vars: Record<string, string>;
} {
  return { role, instruction, vars };
}

/** task 内容来源：能力信息分组时已确定 → 内联；前置产出量大 → 按路径读。 */
export function taskSource(knownAtDispatch: boolean): 'inline' | 'path' {
  return knownAtDispatch ? 'inline' : 'path';
}

// ---------------------------------------------------------------
// 组合子层：返回结构，不是字符串
// ---------------------------------------------------------------

export interface BatchDispatch {
  mode: 'batch_parallel';
  batches: string[][];
  gate: { onPass: 'converge' | 'skip'; onFail: 'userChoice' | 'degrade' | 'halt' };
}

/** 批量并行：无依赖任务按 limitW 切批，一次性启动一批。 */
export function batchParallel(
  tasks: string[],
  limitW: number,
  gate: BatchDispatch['gate'] = { onPass: 'converge', onFail: 'userChoice' },
): BatchDispatch {
  if (!Number.isInteger(limitW) || limitW <= 0) {
    throw new Error(`batchParallel: limitW 必须为正整数（得 ${String(limitW)}）`);
  }
  const batches: string[][] = [];
  for (let i = 0; i < tasks.length; i += limitW) batches.push(tasks.slice(i, i + limitW));
  return { mode: 'batch_parallel', batches, gate };
}

export interface RollingDispatch {
  mode: 'rolling_window';
  start: string[];
  queued: string[];
  slotNote: string;
}

/** 滚动窗口：首发前 W 个（按槽位折算），其余排队，完成一个补一个。 */
export function rollingWindow(
  queue: string[],
  limitW: number,
  slotOccupancy = 1,
): RollingDispatch {
  if (!Number.isInteger(limitW) || limitW <= 0) {
    throw new Error(`rollingWindow: limitW 必须为正整数（得 ${String(limitW)}）`);
  }
  const capacity = Math.max(1, Math.floor(limitW / slotOccupancy));
  const start = queue.slice(0, capacity);
  const queued = queue.slice(capacity);
  const slotNote =
    slotOccupancy > 1
      ? `1 任务占 ${slotOccupancy} 槽，同时至多 ${capacity} 任务`
      : `1 任务占 1 槽，同时至多 ${capacity} 任务`;
  return { mode: 'rolling_window', start, queued, slotNote };
}

export interface TopoDispatch {
  mode: 'topo_batch';
  batches: string[][];
  gate: 'all completed before next';
}

/** 拓扑分批：按依赖拓扑分批，批内走滚动窗口（批次内并行不超过 W，由调用方执行）。 */
export function topoBatch(batches: string[][]): TopoDispatch {
  return { mode: 'topo_batch', batches, gate: 'all completed before next' };
}

// ---------------------------------------------------------------
// 渲染层：从同一份结构生成 Markdown（写文档 = 调渲染传参）
// ---------------------------------------------------------------

const MODE_LABEL: Record<StepMode, string> = {
  batch_parallel: '批量并行',
  rolling_window: '滚动窗口',
  topo_batch: '拓扑分批',
};

/** 全局口径渲染（SKILL.md 公共节正本；与 renderSchedulingPolicy 同源数字）。 */
export function renderPolicy(policy: SourceSchedulingPolicy): string {
  const w = policy.windowBudget;
  const b = policy.batchPolicy;
  const lines = [
    `- **全局并发上限**：${policy.concurrencyLimit} 个 Task Group`,
    w
      ? `- **窗口预算**：单次调用窗口数上限 ${w.maxWindowSize ?? '—'}；输入摘要 ${w.inputChunkTokens ?? '—'} tokens；素材摘要 ${w.itemSummaryTokens ?? '—'} tokens`
      : null,
    b
      ? `- **分批规则**：模式 ${MODE_LABEL[b.mode] ?? b.mode}；每批最多 ${b.maxBatchSize ?? '—'} 个 Task Group；单任务槽位 ${b.slotOccupancy ?? 1}`
      : null,
  ].filter((l): l is string => l !== null);
  return `## 调度策略\n\n${lines.join('\n')}\n`;
}

/** 单模式渲染（分发给各 step 章节按需取，不整坨引用）。 */
export function renderMode(
  mode: StepMode,
  opts: { limitW?: number; slotOccupancy?: number } = {},
): string {
  const limitW = opts.limitW ?? SCHEDULING.concurrencyLimit;
  const slots = opts.slotOccupancy ?? SCHEDULING.batchPolicy.slotOccupancy;
  if (mode === 'batch_parallel') {
    return `批量并行（W=${limitW}）：无依赖任务一次性启动一批；验证 expected_files 标记 completed/failed；${retryPolicy().maxRetries} 次重试，仍失败标 degraded 不阻塞。`;
  }
  if (mode === 'rolling_window') {
    return `滚动窗口（W=${limitW}）：首发前 ${windowWidth(limitW, limitW)} 个（${slotsFor(1, slots)} 槽/任务）；完成一个补一个；跳过产出已存在；${retryPolicy().maxRetries} 次重试。`;
  }
  return `拓扑分批（W=${limitW}）：按依赖拓扑分批，批内走滚动窗口；一批全部 completed 才进下一批；${retryPolicy().maxRetries} 次重试。`;
}

/** 单步绑定渲染（scan 接线的落点：传 step 的模式＋队列＋槽位，生成该步一节）。 */
export function renderBinding(binding: {
  stepId: string;
  mode: StepMode;
  taskGroup: string;
  limitW?: number;
  slotOccupancy?: number;
}): string {
  const limitW = binding.limitW ?? SCHEDULING.concurrencyLimit;
  const slots = binding.slotOccupancy ?? SCHEDULING.batchPolicy.slotOccupancy;
  const first = Math.max(1, Math.floor(limitW / slots));
  return `### ${binding.stepId}（${MODE_LABEL[binding.mode]}）\n\n- 任务单元：${binding.taskGroup}\n- 并发：首发前 ${first} 个，${slotsFor(1, slots)} 槽/任务\n- 校验：${proactiveChecks()
    .map((c) => c.id)
    .join('→')}，任一步失败即 pending-retry\n- 重试：至多 ${retryPolicy().maxRetries} 次，原 task 重发，耗尽标 degraded 不阻塞`;
}

/** 模块文档渲染（附录正本：策略＋三模式＋校验＋组装，全部由上函数派生）。 */
export function renderModuleDoc(policy?: SourceSchedulingPolicy): string {
  const p: SourceSchedulingPolicy = policy ?? {
    concurrencyLimit: SCHEDULING.concurrencyLimit,
    windowBudget: { ...SCHEDULING.windowBudget },
    batchPolicy: { ...SCHEDULING.batchPolicy },
  };
  const checks = proactiveChecks()
    .map((c) => `- ${c.id}：${c.what} → ${c.onFail}`)
    .join('\n');
  return `## 调度策略（模块渲染正本，D35 首刀）\n\n${renderPolicy(p)}\n### 批量并行\n\n${renderMode('batch_parallel')}\n\n### 滚动窗口\n\n${renderMode('rolling_window')}\n\n### 拓扑分批\n\n${renderMode('topo_batch')}\n\n### 即时校验\n\n${checks}\n`;
}

/** 首刀模块声明（与 step() 并列的一等公民；render 走默认策略，实例侧可传参重渲）。 */
export const schedulingModule: SourceModule = defineModule({
  id: 'scheduling',
  kind: 'action',
  version: '0.1.0',
  render: () => renderModuleDoc(),
});
