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
                text: '上手',
                items: [
                    { text: '快速上手', link: '/guide/quickstart' },
                    { text: '转化手册（markdown skill → 管道）', link: '/guide/conversion' },
                    { text: '实例：构建与定向优化', link: '/guide/case-study' },
                    { text: '调优指南（权重经验与案例）', link: '/guide/tuning' },
                ],
            },
            {
                text: '概念',
                items: [
                    { text: '发布布局（角色→路径派生）', link: '/guide/concepts/publish-layout' },
                    { text: '模块抽象', link: '/guide/concepts/modules' },
                    { text: '产物路径投射', link: '/guide/concepts/entities' },
                ],
            },
            {
                text: '设计与参考',
                items: [
                    { text: '核心契约（公开承诺）', link: '/guide/contract' },
                    { text: '为什么是这些限制', link: '/guide/decisions' },
                    { text: '官方工具组合', link: '/guide/toolchain' },
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
