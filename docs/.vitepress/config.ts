import { defineConfig } from 'vitepress';

export default defineConfig({
    title: 'skillnomad',
    description: '把 Markdown skill 的抽象写进代码——声明事实，框架推导其余。',
    base: '/skillnomad/',
    lang: 'zh-CN',
    themeConfig: {
        nav: [
            { text: '为什么', link: '/guide/why' },
            { text: '指南', link: '/guide/quickstart' },
            { text: '核心契约', link: '/guide/contract' },
            { text: 'demos', link: 'https://github.com/Co-Kyo/skillnomad/tree/main/demos' },
            { text: 'API 参考', link: '/api/types' },
            { text: '版本线', link: '/versioning' },
        ],
        sidebar: [
            {
                text: '指南',
                items: [
                    { text: '为什么需要 skillnomad', link: '/guide/why' },
                    { text: '快速上手', link: '/guide/quickstart' },
                    { text: '转化手册（markdown skill → 管道）', link: '/guide/conversion' },
                    { text: '核心契约（公开承诺）', link: '/guide/contract' },
                    { text: '设计裁定与不走的路', link: '/guide/decisions' },
                    { text: '案例交代（scenario-pipeline）', link: '/guide/case-study' },
                    { text: '调优指南（权重经验与案例）', link: '/guide/tuning' },
                    { text: '官方工具组合', link: '/guide/toolchain' },
                    {
                        text: '概念',
                        items: [
                            { text: '模块抽象', link: '/guide/concepts/modules' },
                            { text: '发布布局（角色→路径派生）', link: '/guide/concepts/publish-layout' },
                            { text: '产物路径投射', link: '/guide/concepts/entities' },
                        ],
                    },
                ],
            },
            {
                text: 'API 参考',
                items: [
                    { text: 'API 导览（按任务）', link: '/api/types' },
                    { text: '完整参考索引', link: '/api/reference/README' },
                ],
            },
        ],
        footer: {
            message: 'skillnomad · 声明事实，框架推导其余',
        },
    },
});
