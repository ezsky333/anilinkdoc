import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: "docs",
  base: '/anilinkdoc/',

  title: "AniLinkServer",
  description: "一个为弹幕站设计的媒体管理服务",
  
  // 忽略死链接检查
  ignoreDeadLinks: [
    // 忽略所有 localhost 链接
    /^https?:\/\/localhost/,
    // 忽略相对路径链接（文档尚未完成）
    /^\.\//
  ],
  
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/quick-start' },
      {
        text: '用户手册', items: [
          { text: '介绍', link: '/user-guide/introduction' },
          { text: '安装与初始化', link: '/user-guide/installation' },
          { text: '故障排查', link: '/user-guide/troubleshooting' }
        ]
      },
      {
        text: '开发文档', items: [
          { text: '概览', link: '/dev-guide/overview' },
          { text: '后端开发', link: '/dev-guide/backend' },
          { text: '前端开发', link: '/dev-guide/frontend' },
          { text: '数据库与Liquibase', link: '/dev-guide/database' }
        ]
      }
    ],

    sidebar: {
      '/user-guide/': [
        {
          text: '用户手册',
          items: [
            { text: '介绍', link: '/user-guide/introduction' },
            { text: '安装与初始化', link: '/user-guide/installation' },
            { text: '故障排查', link: '/user-guide/troubleshooting' }
          ]
        }
      ],
      '/dev-guide/': [
        {
          text: '开发文档',
          items: [
            { text: '概览', link: '/dev-guide/overview' },
            { text: '后端开发', link: '/dev-guide/backend' },
            { text: '前端开发', link: '/dev-guide/frontend' },
            { text: '数据库与Liquibase', link: '/dev-guide/database' }
          ]
        }
      ],
      '/': [
        {
          text: '快速开始',
          items: [
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/eventhorizonsky/AniLinkService' }
    ]
  }
})
