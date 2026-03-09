# AniLinkService Quick Start (Docker)

本文面向部署用户，使用官方镜像快速启动服务。

- 镜像: `ghcr.io/eventhorizonsky/anilinkserver:latest`
- 默认访问端口: `8081`
- 首次启动后通过安装向导完成初始化

## 1. 项目功能概览

- 安装向导: 首次安装流程（系统检查、站点配置、管理员账号、媒体库配置）
- 媒体库管理: 目录扫描、自动索引、目录变更监听
- 元数据提取: 基于 `ffprobe` 获取分辨率、帧率、时长、编码等信息
- 番剧匹配: 对接弹弹play开放平台，自动匹配番剧与剧集
- 动漫浏览: 动漫列表、搜索、详情、剧集展示、新番时间表
- 播放与弹幕: 支持 HTTP Range 视频流、弹幕代理与缓存
- 后台管理: 系统信息、站点配置、媒体库与视频文件管理

## 2. 前置条件

- 已安装 Docker（建议 24+）
- 主机上准备好媒体目录（例如 `/srv/media/anime`）
- 机器可访问 `ghcr.io`

## 3. 拉取镜像

```bash
docker pull ghcr.io/eventhorizonsky/anilinkserver:latest
```

## 4. 使用 H2 快速启动（推荐先跑通）

先创建本地持久化目录：

```bash
mkdir -p ./anilink/config ./anilink/subtitles ./anilink/data
```

启动容器：

```bash
docker run -d \
	--name anilink \
	-p 8081:8081 \
	-e DB_PROFILE=h2 \
	-e CONFIG_DIR=/app/config \
	-e SUBTITLE_DIR=/app/subtitles \
	-v ./anilink/config:/app/config \
	-v ./anilink/subtitles:/app/subtitles \
	-v ./anilink/data:/app/data \
	-v /srv/media/anime:/media/anime \
	--restart unless-stopped \
	ghcr.io/eventhorizonsky/anilinkserver:latest
```

说明：

- `./anilink/data` 用于持久化 H2 数据库文件
- `/srv/media/anime` 是示例媒体目录，请替换为你的真实路径

## 5. 首次初始化

1. 浏览器打开 `http://<你的主机IP>:8081`
2. 按安装向导完成：站点信息、管理员账号、媒体库路径
3. 媒体库路径填写容器内路径，例如 `/media/anime`

## 6. PostgreSQL + Docker Compose 部署（推荐生产）

先创建目录：

```bash
mkdir -p ./anilink/config ./anilink/subtitles
```

在当前目录创建 `docker-compose.pg.yml`：

```bash
cat > docker-compose.pg.yml <<'YAML'
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

volumes:
  pg_data:
YAML
```

按你的主机实际路径修改媒体目录映射：

- `/srv/media/anime:/media/anime`

说明：媒体目录不建议只读挂载，后续功能会用到写入权限。

启动服务：

```bash
docker compose -f docker-compose.pg.yml up -d
```

查看状态：

```bash
docker compose -f docker-compose.pg.yml ps
```

查看日志：

```bash
docker compose -f docker-compose.pg.yml logs -f anilink
```

停止服务：

```bash
docker compose -f docker-compose.pg.yml down
```

## 7. 常用运维命令

查看日志：

```bash
docker logs -f anilink
```

重启服务：

```bash
docker restart anilink
```

停止并删除容器（不删除挂载数据）：

```bash
docker rm -f anilink
```

## 8. 使用 PostgreSQL（docker run 方式，可选）

如果你希望使用 PostgreSQL，改用以下环境变量启动：

```bash
docker run -d \
	--name anilink \
	-p 8081:8081 \
	-e DB_PROFILE=pgsql \
	-e DB_HOST=127.0.0.1 \
	-e DB_PORT=5432 \
	-e DB_NAME=anilink \
	-e DB_USER=postgres \
	-e DB_PASS=postgres \
	-e CONFIG_DIR=/app/config \
	-e SUBTITLE_DIR=/app/subtitles \
	-v ./anilink/config:/app/config \
	-v ./anilink/subtitles:/app/subtitles \
  -v /srv/media/anime:/media/anime \
	--restart unless-stopped \
	ghcr.io/eventhorizonsky/anilinkserver:latest
```

请确保容器可以访问 PostgreSQL 地址，并且数据库账号具备建表权限（首次启动会执行 Liquibase）。

## 9. 故障排查

- 无法访问页面：检查端口映射 `-p 8081:8081` 与服务器防火墙
- 扫描不到视频：确认媒体目录已挂载且安装向导中填写的是容器内路径
- 启动失败：先看日志 `docker logs anilink`

