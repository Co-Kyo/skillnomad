// ============================================================
// 散文质量门：产物文本层面的机器校验（2026-09-19 产物散文审计后补）
// ------------------------------------------------------------
// 背景：既有校验全部只答"数据进没进文本、结构缺没缺"，从不读文本本身——
// 渲染器注入的元话语（"构建期渲染""manifest 锁定"）与标记叠加
// （同一行两层"（示例）"）在 110+114 测全绿下漏网。本门补这一层。
//
// 分工（仿 scanDanglingRefs 先例）：判据由调用方给——
//   元话语黑名单是消费侧口径（什么词不该出现在发布物里由包的读者定）；
//   标记叠加检测是通用形态判据（同标记同行重复出现即机械痕迹）。
// 框架只提供扫描器，不垄断黑名单。
// ============================================================

export interface ProseHit {
    /** 文件相对路径 */
    rel: string;
    /** 1-based 行号 */
    line: number;
    /** 命中内容（黑名单词或重复标记） */
    token: string;
}

/**
 * 门 1 · 元话语黑名单：发布物文本不得含指定词（构建过程话术对执行侧读者是噪声）。
 * @category 构建与渲染
 */
export function scanMetaDiscourse(
    files: readonly { rel: string; content: string }[],
    blacklist: readonly string[],
): ProseHit[] {
    const hits: ProseHit[] = [];
    for (const file of files) {
        file.content.split('\n').forEach((text, index) => {
            for (const token of blacklist) {
                if (token && text.includes(token)) {
                    hits.push({ rel: file.rel, line: index + 1, token });
                }
            }
        });
    }
    return hits;
}

/**
 * 门 2 · 标记叠加：同一标记在同一行出现 ≥2 次即机械痕迹
 * （渲染器加一层、数据又带一层的"（示例）"双注入弹的通用形态）。
 * 标记表由调用方给（如 ['（示例）', '【示例】']）。
 * @category 构建与渲染
 */
export function scanMarkerDuplication(
    files: readonly { rel: string; content: string }[],
    markers: readonly string[],
): ProseHit[] {
    const hits: ProseHit[] = [];
    for (const file of files) {
        file.content.split('\n').forEach((text, index) => {
            for (const marker of markers) {
                if (!marker) continue;
                let count = 0;
                let from = 0;
                for (;;) {
                    const at = text.indexOf(marker, from);
                    if (at < 0) break;
                    count += 1;
                    from = at + marker.length;
                }
                if (count >= 2) hits.push({ rel: file.rel, line: index + 1, token: marker });
            }
        });
    }
    return hits;
}
