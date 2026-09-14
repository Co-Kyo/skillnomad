// ============================================================
// methodblocks 适配器（P2 集成）：块集 → 模块（内容源），经模块通道渲染进产物。
//
// 依赖单向：本包认识 methodblocks 的通用写作概念（registry／块文档／结构化诊断）；
// methodblocks 不认识本包（无 step／pipeline 概念）。判据归 methodblocks，接入归本包。
// ============================================================

import { check, doc } from 'methodblocks';
import type { Diagnostic, DocPart, Registry } from 'methodblocks';
import type { SourceModule, SourceModuleKind } from 'skillnomad-types';

/** blockModule 输入：id／kind／version 构成模块身份；registry ＋ body 构成内容源（render ＝ doc(registry, body)）。 */
export interface BlockModuleInput {
    id: string;
    kind?: SourceModuleKind;
    version?: string;
    registry: Registry;
    body: DocPart[];
}

/** 块集 → SourceModule（内容源）：render 即 `doc(registry, body)`——拼装在构建期执行，产物取正文文字（不翻译散文）。 */
export function blockModule(input: BlockModuleInput): SourceModule {
    return {
        id: input.id,
        kind: input.kind ?? 'data',
        ...(input.version !== undefined ? { version: input.version } : {}),
        render: () => doc(input.registry, input.body),
    };
}

/** 结构校验声明（可选）：一份块文档 ＝ id ＋ registry ＋ body（＋ references＝只进 references/ 的块）。 */
export interface StructureDocSpec {
    id: string;
    registry: Registry;
    body: DocPart[];
    references?: DocPart[];
}

/** config.structure 的形状：逐份声明待校验的块文档。 */
export interface StructureConfig {
    docs: StructureDocSpec[];
}

/** 对声明的每份块文档跑 methodblocks `check()`，返回带文档 id 的诊断（打印与计数由 buildPipeline 统一处理）。 */
export function runStructureChecks(config: StructureConfig): Array<{ docId: string; diagnostic: Diagnostic }> {
    const out: Array<{ docId: string; diagnostic: Diagnostic }> = [];
    for (const docSpec of config.docs) {
        const diagnostics = check(docSpec.registry, {
            body: docSpec.body,
            ...(docSpec.references !== undefined ? { references: docSpec.references } : {}),
        });
        for (const diagnostic of diagnostics) {
            out.push({ docId: docSpec.id, diagnostic });
        }
    }
    return out;
}
