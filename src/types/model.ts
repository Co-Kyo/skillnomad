// ============================================================
// SkillSourceModel
//
// Skill 源码模型：不直接编写 Markdown，而是用类型化数据描述
// “如何做一件事”。最终由 skillnomad-build 渲染成标准 Markdown。
// ============================================================

export type ActorKind = 'agent' | 'human' | 'script' | 'subflow';

/** @category 作者面 */
export type NextAction =
  | 'parse'
  | 'infer'
  | 'search'
  | 'extract'
  | 'merge'
  | 'score'
  | 'assemble'
  | 'generate'
  | 'validate'
  | 'wait'
  | 'checkpoint';

export type VerifyKind =
  | 'file-exists'
  | 'json-parse'
  | 'schema'
  | 'field'
  | 'count'
  | 'command';

export type FailBehavior =
  | 'retry'
  | 'degrade'
  | 'skip'
  | 'halt'
  | 'checkpoint';

export type SourceRefRole = 'contract' | 'schema' | 'rule' | 'method' | 'reference';

/**
 * **模块种类**：于 `step()` 并列的构成原子分类。
 * `'action'`（动作内容）＋ `'data'`（策略/口径）为常用类；其余为占位分类，按需接入。
 * @category 作者面
 */
export type SourceModuleKind = 'schema' | 'method' | 'rule' | 'data' | 'action';

/**
 * **模块声明（一等公民）**：Skill 构成原子（与 `step()` 并列）。
 * 类型只定形状：`render` 签名注记，实现在调用方模块对象；
 * 装配（`defineModule()`）做运行时注册表（`Map<id, ModuleDef>`）。
 * @category 作者面
 */
export interface SourceModule {
    id: string;
    kind: SourceModuleKind;
    version?: string;
    /** 依赖的模块 id（无则空；环校验载体，无 deps 降级重复 id 红） */
    deps?: string[];
    /** 渲染 Markdown 片段（实现侧提供；类型侧只注记签名） */
    render: () => string;
}

/** @category 作者面 */
export interface SourceRef {
    /**
   * 源产物路径（必填）。路径解析（如概念名→路径）归用户侧 helper（`refOf` 模式），
   * 框架不承载概念引用形态（原 `ref?: string` 声明形态零真实用例，已清退）。
   */
    path: string;
    schema?: string;
    required?: boolean;
    dynamic?: boolean;
    description?: string;
    /**
   * **条目角色标签**（`contractRefs` 收拢进 `reads`，语义差异降级为角色标签）。
   *
   * 缺省 `'reference'`；首期只实落 `'contract'`，其余遇到再加。
   * 仅 `as === 'contract'` 的条目在产物中作为「契约引用」组件派生渲染。
   */
    as?: SourceRefRole;
}

/** @category 作者面 */
export interface SourceAction {
    id: string;
    label: string;
    verb: NextAction;
    actor: ActorKind;
    content: string;
    timeout?: number;
    retry?: {
        max: number;
        backoff: 'fixed' | 'linear' | 'exponential';
    };
    reads?: SourceRef[];
    writes?: SourceRef[];
}

/** @category 作者面 */
export type SourceFlow =
  | { kind: 'do'; task: SourceAction }
  | { kind: 'seq'; id: string; label: string; steps: SourceFlow[] }
  | {
      kind: 'parallel';
      id: string;
      label: string;
      branches: SourceFlow[];
      gate?: {
          rule: string;
          onPass: 'converge' | 'skip';
          onFail: 'degrade' | 'halt' | 'userChoice';
      };
      converge?: SourceAction;
  }
  | {
      kind: 'map';
      id: string;
      label: string;
      over: SourceRef;
      worker: SourceFlow;
      maxConcurrency: number;
  }
  | {
      kind: 'branch';
      id: string;
      label: string;
      when: string;
      then: SourceFlow;
      else?: SourceFlow;
  }
  | {
      kind: 'loop';
      id: string;
      label: string;
      until: string;
      body: SourceFlow;
      maxIterations?: number;
  };

export interface SourceException {
    on: string;
    behavior: FailBehavior;
    then: string;
}

/** @category 作者面 */
export type SourceFailRule = SourceException;

/** 由 wish 派生出的可判定目标；`id` 用于把判据挂上来。 */
export interface SourceTarget {
    /** 步内唯一标识。 */
    id: string;
    /** 目标正文：一句"要达成什么"，指着产物能判过／不过。 */
    claim: string;
}

/** @category 作者面 */
export interface SourceVerifyRule {
    type: VerifyKind;
    ref?: string;
    description: string;
    /** 归属的目标 id（`SourceTarget.id`）；缺省＝未归属，仍渲染进「校验清单」。 */
    target?: string;
}

export interface SourceInstruction {
    /**
     * 意图（wish）：这一步**带着什么倾向去做**（1 条，人读，不要求可判定）。
     * skill 级的模糊心智写在 `description`；这里再往下一层，是"本步想达到什么效果"。
     */
    wish: string;
    /**
     * 目标（target）：由上面的 wish 派生出的**可判定目标**（通常多条）。
     * 每条目标由若干判据支撑——机器判据＝`SourceVerifyRule.target`，人工判据＝`CheckItem.target`。
     */
    targets?: SourceTarget[];
    purpose?: string;
    inputs: string[];
    actions: string[];
    outputs: string[];
    validation: SourceVerifyRule[];
    exceptions: SourceFailRule[];
    checkpointNote?: string;
    next?: string;
    detail?: string;
    sections?: Record<string, string>;
    taskTemplates?: Record<string, string>;
}

/**
 * 检查项：执行层（target 层）判据之一——**人可判**，指着产物判过/不过。
 * 执行层另两件判据是 `SourceVerifyRule`（机器可查）与 `SourceInvariant`（跨步约束）。
 * 每项要么给**期望**（明文口径），要么声明 `informational: true`（仅展示，不作过/不过依据）。
 * 二者皆无＝构建期红。
 */
export interface CheckItem {
    label: string;
    /** 归属的目标 id（`SourceTarget.id`）；缺省＝不参与目标归组。 */
    target?: string;
    /** 期望：判过/不过的口径（分母、阈值、明细、状态），如「完成数＝命题总数，未完成的逐一列出」。 */
    expect?: string;
    /** 仅展示：不参与过/不过判定（0.3.0 起 8 处「（展示供确认…）」散文标注的类型化收编）。 */
    informational?: boolean;
}

/** @category 作者面 */
export interface SourceCheckpoint {
    checkItems: CheckItem[];
    clarifyPrompt: string;
    onConfirm: 'continue';
    onReject: 'rollback' | 'modify';
}

/**
 * 跨步约束（invariant）：约束**后续步骤**或**整条链**的行为规则，挂在声明步上。
 * 159 类句子（"后续步骤不再重复确认 workDir"）的家；渲染进独立章节由执行侧确认。
 */
export interface SourceInvariant {
    text: string;
    scope: 'downstream' | 'whole-chain';
}

export type SourceGateType = 'human_gate' | 'agent_checkpoint' | 'auto_segment';

export interface SourceDecisionMetric {
    id?: string;
    label: string;
    value: string;
    detail?: string;
    tone?: 'normal' | 'warning' | 'danger';
}

export interface SourceDecisionAlternative {
    name: string;
    cost: string;
}

export interface SourceDecisionTradeoff {
    title: string;
    decision: string;
    reason?: string;
    alternatives: SourceDecisionAlternative[];
    evidence?: string;
}

export interface SourceDecisionSectionItem {
    id: string;
    name: string;
    meta?: string;
}

export interface SourceDecisionSection {
    id: string;
    title: string;
    collapsed: boolean;
    summary: string;
    view_all_after?: number;
    items?: SourceDecisionSectionItem[];
}

export interface SourceDecisionEvidence {
    path: string;
    label?: string;
    detail?: string;
    kind?: string;
    hash?: string;
}

export interface SourceDecisionSelection {
    unit: string;
    summary: string;
    total: number;
    selected: number;
    groups?: Array<{
        id: string;
        label: string;
        summary?: string;
        total: number;
        selected: number;
        items?: SourceDecisionSectionItem[];
    }>;
}

export interface SourceDecisionExecutionStage {
    id: string;
    label: string;
    batch?: string;
    status: 'pending' | 'running' | 'done' | 'partial' | 'failed';
    progress?: number;
    output?: string;
    validation?: string;
    risks?: string[];
}

export interface SourceDecisionExecution {
    current: string;
    next: string;
    outputs: string[];
    stages: SourceDecisionExecutionStage[];
    override_actions?: string[];
}

export interface SourceDecisionRisk {
    code: 'source' | 'extraction' | 'model' | 'validation' | 'orchestration' | 'quality';
    label: string;
    severity: 'info' | 'warning' | 'critical';
    count?: number;
    detail?: string;
}

export interface SourceDecisionAction {
    id: string;
    label: string;
    verb?: string;
    primary: boolean;
    disabled?: boolean;
}

export type SourceDecisionDisplayPattern =
  | 'generic'
  | 'title_fold'
  | 'partition_cards'
  | 'coverage_cards'
  | 'threshold_table'
  | 'auto_timeline'
  | 'delivery_checklist';

export interface SourceDecisionDisplay {
    pattern: SourceDecisionDisplayPattern;
    primary_unit?: string;
    max_visible?: number;
    badge?: string;
    legend?: boolean;
    selection?: 'none' | 'single' | 'multi' | 'confirm';
}

export interface SourceDecisionSummary {
    schema_version?: string;
    stage_id?: string;
    gateType: SourceGateType;
    title?: string;
    subtitle?: string;
    confirm?: string;
    context?: {
        current: string;
        question: string;
        next: string;
        architecture_preview?: string;
    };
    metrics: SourceDecisionMetric[];
    selection?: SourceDecisionSelection;
    execution?: SourceDecisionExecution;
    secondary?: {
        sections: SourceDecisionSection[];
        evidence: SourceDecisionEvidence[];
    };
    risks?: SourceDecisionRisk[];
    actions?: SourceDecisionAction[];
    barrier_summary?: string;
    display?: SourceDecisionDisplay;
    /**
   * **示例标记（语义单真相源）**：为 true 时本 decision 全块为历史运行示例值，
   * 非本次运行时填充；渲染层据此加示例区块标注，缺席（undefined/false）即事实，
   * 产物逐字不变。
   */
    isExample?: boolean;
}

export interface SourceReuseRule {
    ifExists: string;
    skipDescription: string;
}

export interface SourceDegrade {
    maxRetries: number;
    onDegrade: 'continue' | 'halt';
    fallback?: string;
}

/** @category 作者面 */
export interface SourceStep {
    id: string;
    title: string;
    purpose: string;
    /** SKILL 步骤表中的核心目的；与 instruction.target 分离。 */
    summary?: string;
    /** 当该步骤是 pipeline 初始化步骤时，渲染为 SKILL.md 的初始化规则。 */
    initRules?: SourceInitRule[];

    /**
   * **步骤间的直接前驱（线性链契约）**
   *
   * 步骤之间的关系是**线性链**，不是 DAG：
   * - 每个步骤最多一个前驱、一个后继（类型级保证，而非仅构建期校验）；
   * - 需要并行或分支，请在 `flow` 内部表达（`parallel` / `map`），
   *   **不要把可并行的动作拆成多个顶层步骤**——顶层 step 是不可并行的执行单位；
   * - `dependsOn` 与 `next` 互为反函数，
   *   **只需声明其中一个**，另一个由框架推导。二者同时声明属冗余。
   *
   * 违反契约（多依赖 / 成环 / 断链 / 悬空引用）将在构建期报错，
   * **不会静默线性化**。
   *
   * 收窄为**单值**：意图写多个前驱在编译期就不可能（类型不允许），
   * 不再依赖运行时校验兜底。
   */
    dependsOn?: string;

    /** 跨步约束（可选）：声明步对下游/全链的行为约束，框架聚合渲染为「跨步约束」章。 */
    invariants?: SourceInvariant[];
    reads: SourceRef[];
    writes: SourceRef[];

    /**
   * **步骤内的控制流**——并行与分支只在这一层表达。
   * 支持 `do` / `seq` / `parallel` / `map` / `branch` / `loop`，
   * 其中 `parallel` 用 `gate` 收敛、`map` 用 `maxConcurrency` 控制并发度。
   */
    flow: SourceFlow;

    instruction: SourceInstruction;
    checkpoint?: SourceCheckpoint;
    decision?: SourceDecisionSummary;
    display?: SourceDecisionDisplay;
    reuse?: SourceReuseRule[];
    degrade?: SourceDegrade;
    plugins?: string[];

    /**
   * **步骤的直接后继（派生字段）**
   *
   * 可由 `dependsOn` 或链顺序推导。框架仅将其渲染为步骤文件的「下一步」章节，
   * **不参与任何校验**——因此单独声明它不构成额外保障。
   *
   * 若已声明 `dependsOn`，此字段可省略，由框架补出。
   *
   * @deprecated 标记为衍生值——开发者应声明 `dependsOn`（或什么都不声明，
   * 由链序决定），`next` 由框架推导；显式声明仅用于覆盖渲染值，通常不必手写。
   */
    next?: string;
}

/** @category 作者面 */
export interface SourceContract {
    id: string;
    kind: 'schema' | 'method' | 'policy' | 'source';
    path: string;
    description: string;
    /**
   * **归属层**：'skill' = 跨步共享模块（SkillModule）；
   * 'step' = 步骤私有模块（StepModule，严格私有、不做跨步引用）。
   *
   * 角色 × 归属一致性校验（`validateModuleUsage`）：
   * `as:'contract'` 的引用必须指向 `scope:'skill'` 的注册条目；
   * step 级条目被多个步骤引用 → 构建报错（跨步需求 = 它本就是 SkillModule）。
   */
    scope: 'skill' | 'step';
    /** step 级模块的归属步骤（scope:'step' 时必填，须与步骤 id 对应） */
    step?: string;
    /**
   * **模块引用（路径→id 过渡期双轨）**：指向 `SourceModule.id`。
   * 缺席即路径形态；存在则先认 id（未登记即红），路径校验保留。
   */
    module?: string;
}

export interface SourceRuntimeTrace {
    enabled: boolean;
    logDir: string;
    eventTypes: string[];
}

/**
 * skill 级策略声明。
 *
 * 0.3.0 起：四个零读者死字段（contextIsolation／reuseByFileExistence／
 * checkpointRequired／traceFields）**已删除**（H1 激进解：声明义务与读取点
 * 同清，不给历史留接口）；`runtimeTrace` 是活字段（`enabled` 决定是否渲染
 * 「运行记录」章），缺省＝禁用。整块可选、缺省＝禁用。
 * @category 作者面
 */
export interface SourcePolicies {
    /** 运行记录埋点协议（活字段）；缺省＝禁用。 */
    runtimeTrace?: SourceRuntimeTrace;
}

export interface SourceParam {
    name: string;
    description: string;
}

/**
 * 一个阶段 = 一段**意图**：这个阶段想达成什么，以及它包含哪些步骤。
 *
 * 只声明「包含哪些步骤」（`stepIds`），**不声明下标、不声明区间**。
 * 「第几步到第几步」（如 `(04-06)`）是顺序的副产物，由框架从链序推导
 * （`derivePhaseIntervals` / `deriveFlowOverview`）。
 *
 * 约束（构建期由 `validatePhaseCoverage` 断言）：
 * 阶段必须覆盖链上每一步、互不重叠、各自连续、且声明顺序与链序一致。
 * 不满足就无法安全推导区间标注，因此框架报错而非猜测。
 */
export interface SourcePhase {
    name: string;
    stepIds: string[];
    description: string;
}

export interface SourceInitRule {
    title: string;
    body: string;
}

export interface SourceCallExample {
    label: string;
    pattern: string;
}

/** @category 作者面 */
export interface SourceMeta {
    name: string;
    title: string;
    description: string;
    /** frontmatter 路由句（可选）：声明"何时用这个 skill"的长句；缺省回落 description。 */
    frontmatterDescription?: string;
    /** 调用方式示例；缺省＝不渲染该节（渲染器有默认句式回落）。 */
    callExamples?: SourceCallExample[];
    usageNote?: string;
    isolationNote?: string;
    includeBuildFooter?: boolean;
    /** 参数表；缺省＝不渲染该节。 */
    params?: SourceParam[];
    /**
   * 阶段**意图**声明：每个阶段包含哪些步骤。
   * 阶段边界与区间标注由框架从此 + 链序推导，不要求手写。
   * 缺省＝无阶段划分（区间派生与校验对空值均按"不声明"处理）。
   */
    phases?: SourcePhase[];
    initRules?: SourceInitRule[];
    /**
   * 哪个步骤负责 pipeline 初始化；renderer 优先从该步骤读取 initRules。
   *
   * **派生字段**：链已经声明了谁没有前驱，默认值由 `deriveInitStepId()` 算出。
   * 可省略；显式提供时用于覆盖（例如初始化规则挂在链起点之外的步骤上）。
   */
    initStepId?: string;
    /**
   * 流程总览的 ASCII 图。
   *
   * **派生字段**：阶段名 + 区间标注均可由 `deriveFlowOverview()` 从
   * `phases` + 链序算出，因此可省略。
   * 显式提供时用于覆盖**布局**（布局属于表达，框架不垄断），
   * 但其中的区间标注不再有人校验——手写即意味着自己承担漂移风险。
   */
    flowOverview?: string;
}

/** @category 作者面 */
export interface SkillSourceModel {
    meta: SourceMeta;
    steps: SourceStep[];
    /** 随包/契约登记条目；缺省＝空。 */
    contracts?: SourceContract[];
    /** 策略声明；缺省＝全关／空／禁用。 */
    policies?: SourcePolicies;
}
