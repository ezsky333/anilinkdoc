---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "AniLinkServer"
  text: "一个为弹幕站设计的媒体管理服务"
  tagline: 基于弹弹play开放平台，媒体库扫描、番剧匹配、弹幕播放与后台管理
  image:
    src: /logo.svg
    alt: AniLinkServer
  actions:
    - theme: brand
      text: "快速开始"
      link: /quick-start
    - theme: alt
      text: "用户手册"
      link: /user-guide/introduction
    - theme: alt
      text: "开发文档"
      link: /dev-guide/overview

features:
  - title: 📚 媒体库管理
    details: 自动扫描与索引本地动漫文件，支持多媒体库、目录监听与文件变更追踪
  
  - title: 🎯 番剧自动匹配
    details: 集成弹弹play开放平台，自动识别视频文件对应的番剧与剧集信息
  
  - title: 📺 视频播放与弹幕
    details: 支持HTTP Range流媒体播放、弹幕代理与本地缓存，集成Artplayer播放器
  
  - title: 🔍 动漫库与搜索
    details: 完整的动漫库浏览、全文搜索、周更时间表与详情展示
  
  - title: ⚙️ 后台管理系统
    details: 系统信息、站点配置、媒体库与视频文件管理，修改番剧信息与元数据
  
  - title: 🛡️ 安全认证体系
    details: 基于Sa-Token的用户认证与权限管理，支持角色控制与管理员保护
---

## 核心特性

- **智能扫描** - 支持mp4/mkv/avi/mov格式，通过FFprobe提取分辨率、帧率、编码、HDR等技术元数据
- **实时监听** - 文件变更自动索引，支持新增、修改、删除事件追踪
- **番剧匹配** - 调用弹弹play匹配接口，回填animeId/episodeId等关键字段
- **弹幕功能** - 代理弹幕接口，支持30分钟数据库缓存与关联信息查询
- **安装向导** - 首次启动引导配置，自动检查系统环境与初始化数据库
- **容器部署** - 支持H2内置数据库与PostgreSQL，一键Docker启动部署

## 开始使用

::: code-group

```bash [快速启动]
# Docker 快速启动（推荐）
docker pull ghcr.io/eventhorizonsky/anilinkserver:latest
docker run -d -p 8081:8081 -v /your/media/path:/media/anime ghcr.io/eventhorizonsky/anilinkserver:latest
```

```bash [本地开发]
# 后端启动
cd api && mvn spring-boot:run

# 前端启动（开发服务器）
cd ui && pnpm install && pnpm dev
```

```bash [完整部署]
# 使用Docker Compose + PostgreSQL
services:
  postgres:
    image: postgres:16
    container_name: anilink-postgres
    environment:
      POSTGRES_DB: anilink
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      TZ: Asia/Shanghai
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d anilink"]
      interval: 10s
      timeout: 5s
      retries: 10
    restart: unless-stopped

  anilink:
    image: ghcr.io/eventhorizonsky/anilinkserver:latest
    container_name: anilink
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "8081:8081"
    environment:
      DB_PROFILE: pgsql
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: anilink
      DB_USER: postgres
      DB_PASS: postgres
      CONFIG_DIR: /app/config
      SUBTITLE_DIR: /app/subtitles
      TZ: Asia/Shanghai
    volumes:
      - ./anilink/config:/app/config
      - ./anilink/subtitles:/app/subtitles
      - /srv/media/anime:/media/anime
    restart: unless-stopped

docker compose -f docker-compose.pg.yml up -d
```

:::

## 核心依赖项目

- [Sa-Token](https://sa-token.cc/)
- [FFmpeg](https://ffmpeg.org/) 
- [Artplayer](https://artplayer.org/)
- [弹弹play开放平台](https://doc.dandanplay.com/open/)

