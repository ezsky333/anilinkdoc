# 安装与初始化

本章介绍AniLinkServer的安装方式和首次使用时的初始化配置流程。

## 安装方式对比

| 安装方式 | Docker | Docker Compose | 本地安装 |
|---------|--------|-----------------|---------|
| 难度 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 启动速度 | 快 | 快 | 较慢 |
| 推荐用途 | 个人使用 | 生产部署 | 开发 |
| 数据库 | H2内置 | PostgreSQL | 自由选择 |
| 维护难度 | 低 | 中 | 高 |

**推荐**：首次使用者选择**Docker**方案，生产环境选择**Docker Compose**。

## 方案A：Docker（个人用户首选）

### 前置条件

- 已安装 Docker（20.10+）
- 可访问 ghcr.io 容器仓库
- 至少2GB可用RAM

### 第1步：准备目录

在你的主机创建持久化目录：

```bash
# Linux/macOS
mkdir -p ~/anilink/{config,subtitles,data,media}

# Windows（使用PowerShell）
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\anilink\{config,subtitles,data,media}"
```

目录说明：
- `config` - 站点配置文件
- `subtitles` - 缓存字幕文件
- `data` - H2数据库文件（如使用H2）
- `media` - 你的番剧视频文件（符号链接或挂载点）

### 第2步：拉取镜像

```bash
docker pull ghcr.io/eventhorizonsky/anilinkserver:latest
```

如遇到无法拉取，可尝试配置Docker镜像加速器，或使用国内源。

### 第3步：启动容器

#### 3.1 快速启动（用H2）

```bash
docker run -d \
  --name anilink \
  -p 8081:8081 \
  -e DB_PROFILE=h2 \
  -e CONFIG_DIR=/app/config \
  -e SUBTITLE_DIR=/app/subtitles \
  -v ~/anilink/config:/app/config \
  -v ~/anilink/subtitles:/app/subtitles \
  -v ~/anilink/data:/app/data \
  -v ~/anilink/media:/media/anime \
  --restart unless-stopped \
  ghcr.io/eventhorizonsky/anilinkserver:latest
```

**关键参数说明**：
- `-d` - 后台运行
- `--name anilink` - 容器名称（便于后续管理）
- `-p 8081:8081` - 端口映射（左=主机，右=容器）
- `-v` - 目录挂载（左=主机，右=容器）
- `--restart unless-stopped` - 自动重启

#### 3.2 验证启动

```bash
# 查看容器状态
docker ps | grep anilink

# 查看启动日志
docker logs -f anilink

# 预期输出应包含 "Started AniLinkApplication"
```

#### 3.3 首次访问

在浏览器打开 `http://localhost:8081`（或 `http://your-host-ip:8081`）

你会看到**安装向导**欢迎界面。

### 第4步：完成安装向导

#### 4.1 系统检查

向导首先进行系统环境检查，包括：
- Java版本  
- FFprobe是否可用
- 磁盘空间
- 网络连接

**预期**：大多数项应显示✅绿色。若FFprobe显示❌，不影响基本功能，但无法提取视频元数据。

点击**下一步**继续。

#### 4.2 站点配置

设置你的AniLinkServer站点信息：

| 字段 | 说明 | 示例 |
|------|------|------|
| 站点名称 | 网站标题 | 我的番剧库 |
| 站点描述 | 网站副标题 | 本地动漫媒体服务 |

这些信息展示在首页和浏览器标签页。

点击**下一步**继续。

#### 4.3 管理员账号

创建你的管理员账号（首次使用必填）：

| 字段 | 说明 | 要求 |
|------|------|------|
| 用户名 | 登录用户名 | 3-20个字符 |
| 密码 | 登录密码 | 至少6个字符，建议复杂密码 |

**重要**：请妥善保管管理员密码，丢失无法找回。

点击**下一步**继续。

#### 4.4 媒体库配置

配置你的第一个媒体库（可稍后添加更多）：

| 字段 | 说明 | 示例 |
|------|------|------|
| 媒体库名称 | 有意义的名称，便于识别 | 番剧 |
| 媒体库路径 | **容器内路径**（不是主机路径） | /media/anime |

**关键要点**：

❗ 这里应填写**容器内路径**，而非主机路径。

例如：
- ✅ 正确：`/media/anime`
- ❌ 错误：`~/anilink/media` 或 `D:\media`

这是因为Docker容器内看不到主机文件系统，但能看到挂载的卷。回溯到我们第3步的启动命令：

```bash
-v ~/anilink/media:/media/anime
#   主机路径     容器内路径
```

所以在这里应填 `/media/anime`。

点击**完成**，向导结束。

## 方案B：Docker Compose（生产推荐）

### 前置条件

- 已安装 Docker 20.10+
- 已安装 Docker Compose 2.0+
- 可访问 ghcr.io
- 至少3GB可用RAM

### 第1步：创建compose文件和目录

```bash
# 创建目录
mkdir -p ~/anilink/{config,subtitles}

# 创建compose文件
cat > ~/anilink/docker-compose.pg.yml <<'EOF'
version: '3.8'

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
      - ./config:/app/config
      - ./subtitles:/app/subtitles
      - /your/media/path:/media/anime
    restart: unless-stopped

volumes:
  pg_data:
EOF
```

**重要**：修改 `/your/media/path` 为你的实际媒体库路径。

### 第2步：启动服务

```bash
cd ~/anilink

# 启动（-d 后台运行）
docker compose -f docker-compose.pg.yml up -d

# 查看状态
docker compose -f docker-compose.pg.yml ps

# 查看日志
docker compose -f docker-compose.pg.yml logs -f anilink
```

等待约30秒，待PostgreSQL初始化完成并AniLinkServer启动。

### 第3步：初始化

访问 `http://localhost:8081`，按**方案A的第4步**完成安装向导。

### 第4步：日常管理

```bash
# 停止服务
docker compose -f docker-compose.pg.yml down

# 查看日志（实时）
docker compose -f docker-compose.pg.yml logs -f

# 重启服务
docker compose -f docker-compose.pg.yml restart

# 更新镜像到最新版本
docker compose -f docker-compose.pg.yml pull
docker compose -f docker-compose.pg.yml up -d
```

## 方案C：本地安装（开发者）

详见 [开发文档](../dev-guide/overview.md)

## 常见安装问题

### Q1：无法访问 http://localhost:8081

**可能原因**：
- 容器未启动：运行 `docker ps` 检查
- 防火墙阻止：检查8081端口是否开放
- 端口被占用：运行 `docker logs anilink` 查看错误

**解决**：

```bash
# 检查容器运行状态
docker ps | grep anilink

# 查看详细错误日志
docker logs anilink

# 如端口被占用，可改用其他端口
docker run -d -p 8082:8081 ...  # 使用8082
```

### Q2：安装向导卡在"系统检查"

**原因**：通常是网络连接问题或服务启动缓慢

**解决**：
```bash
# 等待容器完全启动（查看日志）
docker logs -f anilink

# 等待出现 "Started AniLinkApplication" 字样，按Ctrl+C退出
```

### Q3：媒体库扫描找不到视频文件

**原因**：填写的路径错误（最常见问题）

**检查清单**：

1. 确认填写的是**容器内路径**而非主机路径
2. 验证文件夹确实包含视频文件
3. 检查视频格式是否支持（mp4/mkv/avi/mov）

```bash
# 进入容器检查挂载点
docker exec -it anilink ls -la /media/anime

# 应该能看到你的视频文件列表
```

### Q4：安装向导未出现，直接进入登录页

**原因**：可能是重复启动导致数据库已初始化

**解决**：
```bash
# 清空H2数据库并重启
docker exec anilink rm -f /app/data/anilink.mv.db
docker restart anilink

# 或重新创建容器
docker rm -f anilink
docker run -d ... ghcr.io/eventhorizonsky/anilinkserver:latest
```

## 下一步

- 完成安装后，进入 [媒体库管理](./media-library.md) 学习如何添加视频
- 要了解更多功能，请浏览 [用户手册](./introduction.md)
- 需要技术支持，见 [故障排查](./troubleshooting.md)
