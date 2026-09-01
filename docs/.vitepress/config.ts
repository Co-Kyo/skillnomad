import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'skillnomad',
  description: '把 Markdown skill 的抽象写进代码——声明事实，框架推导其余。',
  base: '/skillnomad/',
  lang: 'zh-CN',
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/quickstart' },
      { text: 'API 参考', link: '/api/types' },
      { text: '版本线', link: '/versioning' },
    ],
    sidebar: [
      {
        text: '指南',
        items: [
          { text: '快速上手', link: '/guide/quickstart' },
          { text: '顶层引导与反模式', link: '/guide/anti-patterns' },
          {
            text: '概念',
            items: [
              { text: '模块抽象（8.15）', link: '/guide/concepts/modules' },
              { text: '产物路径投射（8.16）', link: '/guide/concepts/entities' },
            ],
          },
        ],
      },
      {
        text: 'API 参考',
        items: [
          { text: '类型参考', link: '/api/types' },
        ],
      },
    ],
    footer: {
      message: 'skillnomad · 声明事实，框架推导其余',
    },
  },
});
