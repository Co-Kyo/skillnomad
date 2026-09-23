// 共享内容登记：一段散文 -> 一条有身份的声明。
//
// 对照：手写版 skill/SKILL.md 第 39 行是这样引用它的——正文里写死「打开 references/report-standard.md」，
// 文件一挪，就得回去改那句话。
//
// 这里改成：源路径只登记一次（path）；谁用它靠符号引用；
// 它在发布物里叫什么路径，由框架按角色（scope）派生，作者不再手写发布路径。
import type { SourceContract } from 'skillnomad';

export const reportStandard: SourceContract = {
    id: 'report-standard',
    kind: 'policy',
    path: 'skill/references/report-standard.md',   // 源路径：仓库里文件真实在哪
    description: '决策文档四段标准（结论/依据/风险/待决）与逐段写法',
    scope: 'skill',                                 // 角色 = skill 级共享 -> 发布路径派生为 references/
};

export const contracts = [reportStandard];
