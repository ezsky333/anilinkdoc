# 故障排查

本章提供常见问题的诊断和解决方案。

## 通用诊断步骤

在报告问题前，先尝试这些基础步骤：

### 1. 检查服务状态

```bash
# 查看容器是否运行
docker ps | grep anilink

# 若未运行，查看启动错误
docker logs anilink
```

应该看到类似输出：
```
...
Started AniLinkApplication in x.xxx seconds (JVM running for x.xxx)
```

### 2. 检查日志

```bash
# 查看最近日志
docker logs --tail 50 anilink

# 实时查看日志（遇到问题时运行该命令重现）
docker logs -f anilink
```

### 3. 测试网络连接

```bash
# 测试HTTP连接
curl http://localhost:8081/

# 若使用远程host
curl http://your-host:8081/
```

若收到HTML响应，说明服务运行正常。

### 4. 检查数据库

如使用H2：
```bash
docker exec anilink ls -la /app/data/
```

应该看到 `anilink.mv.db` 文件。

### 5. 查看系统信息

在**管理后台 → 系统信息**页面检查：
- Java版本是否为17+
- 磁盘空间是否充足（>1GB）
- FFprobe是否可用

## 安装与启动问题

### 无法拉取容器镜像

**症状**：`docker pull ghcr.io/eventhorizonsky/anilinkserver:latest` 失败

**原因**：
- 网络连接问题
- 无法访问GitHub Container Registry
- Docker未配置代理

**解决方案**：

#### 方案 A：配置镜像加速器

修改 `~/.docker/daemon.json`：

```json
{
  "registry-mirrors": [
    "https://docker.1panel.live",
    "https://docker.awchina.com",
    "https://mirror.aliyun.com"
  ]
}
```

然后重启Docker：
```bash
sudo systemctl restart docker
```

#### 方案 B：使用国内镜像源

如果GitHub源不可用，尝试从其他源拉取。

### 容器启动失败

**症状**：容器立即退出，`docker ps` 看不到

**诊断**：
```bash
docker logs anilink
```

#### 常见错误及解决

**错误1：端口被占用**

```
Address already in use: 0.0.0.0:8081
```

**原因**：8081端口已被其他应用占用

**解决**：
```bash
# 查看占用的进程
lsof -i :8081

# 使用其他端口启动
docker run -d -p 8082:8081 ...  # 改用8082
```

**错误2：磁盘空间不足**

```
No space left on device
```

**原因**：系统磁盘满

**解决**：
```bash
# 检查磁盘使用
df -h

# 清理Docker未使用的镜像/容器
docker system prune -a

# 扩展磁盘空间
```

**错误3：Java堆空间不足**

```
java.lang.OutOfMemoryError: Java heap space
```

**原因**：容器内存限制太小

**解决**：增加容器内存：
```bash
docker run -d -m 2g ...  # 分配2GB内存
```

### 首次访问卡在加载

**症状**：打开 http://localhost:8081 后一直加载，不显示安装向导

**原因**：
- 容器还在启动中
- 前端资源加载失败
- 浏览器缓存

**解决**：

1. 等待容器完全启动（看日志）：
   ```bash
   docker logs -f anilink | grep "Started"
   ```

2. 清除浏览器缓存（Ctrl+Shift+Del）并重新访问

3. 尝试无痕窗口访问

## 媒体库相关问题

### 扫描后视频未出现

**检查清单**：

```
□ 媒体库路径是否填写正确？
  → 应该是容器内路径（如 /media/anime）
  → 不是主机路径（如 ~/media/anime）

□ 文件夹是否存在？
  docker exec anilink ls -la /media/anime
  → 应该看到视频文件列表

□ 视频格式是否支持？
  → 支持：.mp4, .mkv, .avi, .mov
  → 其他格式可能不被识别

□ 扫描是否完成？
  → 进入"管理后台 → 队列状态"查看进度

□ 番剧匹配是否成功？
  → 查看日志是否有匹配错误
  → 进入文件管理查看episodeId是否填充
```

### 扫描进度缓慢

**原因**和**解决**：

| 原因 | 解决 |
|------|------|
| 文件系统响应慢（网络存储） | 使用本地高速存储 |
| FFprobe元数据提取耗时 | 等待，或减少文件数量 |
| 弹弹play API响应慢 | 稍后重试；检查网络 |
| 系统性能不足 | 升级硬件；关闭其他应用 |

### 匹配失败率高

**可能原因和解决**：

| 原因 | 症状 | 解决 |
|------|------|------|
| 文件名不规范 | 大部分匹配失败 | 重命名为标准格式 |
| 弹弹play暂不可用 | 所有匹配都失败 | 稍后重试 |
| 番剧太冷门 | 该番剧无匹配结果 | 手动编辑文件信息 |
| 网络/DNS问题 | 匹配超时或错误 | 检查网络连接 |

**文件名规范建议**：
```
✅ 进击的巨人 - 01 - 1080p.mkv
✅ Attack on Titan - 01.mkv
✅ 刀剑神域 S01E01.mkv

❌ 01.mkv                      （缺少番剧名）
❌ 进击的巨人_特别版.mkv      （匹配难度大）
❌ [字幕组]进击的巨人.mkv     （特殊符号）
```

### 视频删除后仍显示

**原因**：数据库索引未更新

**解决**：
```bash
# 进入文件管理，点击该文件的"删除"按钮
# 或在管理后台重新扫描媒体库

# 若自动删除检测失效，手动清理
docker exec anilink rm -f /app/data/anilink.mv.db
docker restart anilink
```

## 播放问题

### 视频无法播放

**诊断**：
1. 打开浏览器控制台（F12）
2. 尝试播放视频
3. 查看是否有错误信息

**常见错误和解决**：

| 错误信息 | 原因 | 解决 |
|---------|------|------|
| `404 Not Found` | 视频路径错误或文件删除 | 检查文件是否存在 |
| `403 Forbidden` | 权限问题 | 检查文件夹权限 |
| `CORS error` | 跨域问题 | 检查Vite配置 |
| `CORS policy blocked` | 浏览器安全策略 | 检查后端CORS设置 |

**进一步诊断**：
```bash
# 检查视频文件是否可访问
docker exec anilink ls -la /media/anime/your-video.mkv

# 检查文件权限
docker exec anilink stat /media/anime/your-video.mkv
```

### 音频或字幕不工作

**可能原因**：
- 视频不包含该音轨或字幕
- 容器解码器不支持
- 浏览器不支持该格式

**检查音轨信息**：
```bash
ffprobe file.mkv | grep -E "Stream|Audio|Subtitle"
```

### 播放卡顿

**可能原因**：
- 网络带宽不足
- 视频码率过高
- 服务器性能不足
- 浏览器过于占用资源

**解决**：
1. **降低分辨率** - 如果视频包含多分辨率
2. **检查网络** - `docker stats` 查看网络使用
3. **关闭其他应用** - 释放系统资源
4. **升级硬件** - 增加CPU/内存

## 弹幕相关问题

### 弹幕不显示

**排查步骤**：

1. ✅ 检查弹幕是否启用
   ```
   播放器界面 → 点击"D"键或弹幕按钮 → 应该看到弹幕显示
   ```

2. ✅ 检查episodeId是否填充
   ```
   管理后台 → 文件管理 → 选择该文件
   → 查看"episodeId"字段是否有值
   ```

3. ✅ 检查网络连接
   ```
   浏览器F12 → 网络标签 → 找到/api/v2/comment/*请求
   → 查看是否返回200及有数据
   ```

4. ✅ 检查API是否可用
   ```bash
   curl http://localhost:8081/api/v2/comment/12345
   # 应返回JSON数据或空数组[]
   ```

**如果以上都正常但仍无弹幕**：
- 该episodeId在弹弹play可能没有弹幕数据
- 尝试搜索其他同番剧的剧集以确认功能正常

### 弹幕延迟

**原因**：
- 数据未缓存，需从弹弹play实时获取
- 网络延迟
- 浏览器处理能力不足

**解决**：
- 等待数据缓存（30分钟后访问同一episodeId时会更快）
- 关闭其他高耗能应用
- 减少同时显示的弹幕数

### 弹幕乱码或错误显示

**原因**：
- 文字编码问题
- 浏览器字体缺失

**解决**：
1. 刷新页面
2. 尝试其他浏览器
3. 检查浏览器是否安装了必要字体

## 数据库问题

### 数据库连接失败

**症状**：
```
Connection refused: localhost:5432
```

**原因**：
- 使用PostgreSQL但未启动
- 数据库配置错误
- 网络问题

**解决**：

#### 使用Docker Compose

```bash
# 确保PostgreSQL服务已启动
docker compose -f docker-compose.pg.yml ps

# 若postgres未运行，重启
docker compose -f docker-compose.pg.yml up -d postgres
```

#### 手动启动PostgreSQL

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16
```

#### 验证连接

```bash
# 测试连接
psql -h localhost -U postgres -d anilink
```

### H2数据库损坏

**症状**：应用启动失败，日志显示H2错误

**解决**：删除数据库文件重新初始化

```bash
# 1. 停止容器
docker stop anilink

# 2. 删除数据库文件
docker run --rm -v anilink-data:/data alpine rm -f /data/anilink.mv.db

# 3. 重启容器
docker start anilink

# 或直接删除并重建容器
docker rm -f anilink
docker run -d ... ghcr.io/eventhorizonsky/anilinkserver:latest
```

**注意**：该操作会丢失所有已配置的数据，建议先备份。

## 权限和认证问题

### 忘记管理员密码

**解决**：

目前无法直接重置，需要：

1. 删除数据库并重新初始化
   ```bash
   docker rm -f anilink
   docker run -d ... ghcr.io/eventhorizonsky/anilinkserver:latest
   ```

2. 访问 `http://localhost:8081`
3. 重新运行安装向导

**预防**：
- 妥善保管管理员密码
- 创建备用管理员账号
- 定期测试账号恢复流程

### 无法登录

**排查**：

1. 检查用户名和密码是否正确
2. 检查该账号是否被禁用（管理后台 → 用户管理）
3. 清除浏览器Cookie重试

```bash
# 或手动重置某用户密码（需要对数据库的访问权限）
docker exec anilink psql -U account \
  "UPDATE user SET password = 'new-hash' WHERE username = 'user'"
```

## 获取更多帮助

### 查看日志并收集诊断信息

```bash
# 导出完整日志
docker logs anilink > anilink-logs.txt 2>&1

# 导出系统信息
docker inspect anilink > anilink-container-info.json

# 查看系统资源使用
docker stats --no-stream anilink
```

### 向社区提问

在提问前，请提供：

1. **系统信息** - OS、Docker版本、Java版本
2. **错误日志** - 上述导出的日志文件
3. **问题描述** - 清晰的步骤重现
4. **已尝试** - 你已尝试过的解决方案

发送到：
- [GitHub Issues](https://github.com/eventhorizonsky/AniLinkService/issues)
- [GitHub Discussions](https://github.com/eventhorizonsky/AniLinkService/discussions)

## 相关资源

- [安装与初始化](./installation.md)
- [媒体库管理](./media-library.md)
- [视频播放与弹幕](./playback.md)
- [官方GitHub](https://github.com/eventhorizonsky/AniLinkService)
