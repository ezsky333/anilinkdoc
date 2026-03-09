# AniLinkService 开发文档

本文档面向项目开发者，整合后端开发规范、数据库配置说明与前端开发流程，便于统一协作。

## 1. 技术栈与目录

- 后端: Spring Boot 3.4.x, Spring Data JPA, Liquibase, Sa-Token
- 前端: Vue 3, Vite, Vuetify, Vue Router, Axios
- 数据库: H2（默认）/ PostgreSQL

目录结构：

```text
api/   后端服务（Spring Boot）
ui/    前端界面（Vue 3 + Vite）
docs/  项目文档
```

## 2. 开发环境准备

必备工具：

- JDK 17+
- Maven 3.8+
- Node.js 18+
- pnpm
- ffprobe（建议安装，媒体元数据提取依赖）

可选工具：

- Docker（用于本地 PostgreSQL 或一体化验证）

## 3. 后端开发（`api/`）

### 3.1 后端目录结构

```text
api/
├── pom.xml
├── src/main/java/
│   └── xyz/ezsky/anilink/
├── src/main/resources/
└── src/test/
```

### 3.2 Java 包结构规范

所有 Java 类应位于 `xyz.ezsky.anilink` 基础包下，并按职责分层：

- `config/`: 应用配置类
- `controller/`: API 接口层（仅负责请求接收、参数校验、响应返回）
- `service/`: 核心业务逻辑层
- `repository/`: 数据访问层
- `listener/`: 启动事件和业务事件监听
- `model/`: 数据模型（见下一节）
- `util/`: 通用工具类

`Controller` 与 `Repository` 层都不应承载复杂业务逻辑。

### 3.3 模型分层规范（`model/`）

- `model/entity/`: 数据库实体对象，仅限 `Repository` 与 `Service` 层内部使用
- `model/dto/`: 数据传输对象，主要用于写入/更新入参
- `model/vo/`: 视图对象，作为 `Controller` 返回给前端的数据结构

推荐数据流：

1. 查询：`Controller -> Service -> Repository(Entity) -> Service(转 VO) -> Controller`
2. 写入：`Controller(接 DTO) -> Service(转 Entity) -> Repository`

### 3.4 配置与 Profile

配置文件位于 `api/src/main/resources/`：

- `application.properties`: 通用配置
- `application-h2.properties`: H2 配置
- `application-pgsql.properties`: PostgreSQL 配置

通过环境变量切换数据库：

- `DB_PROFILE=h2`（默认）
- `DB_PROFILE=pgsql`

### 3.5 启动后端

在项目根目录执行：

```bash
cd api
mvn spring-boot:run
```

使用 PostgreSQL：

```bash
cd api
DB_PROFILE=pgsql \
DB_HOST=127.0.0.1 \
DB_PORT=5432 \
DB_NAME=anilink \
DB_USER=postgres \
DB_PASS=postgres \
mvn spring-boot:run
```

服务默认端口：`8081`

API 文档：`http://localhost:8081/swagger-ui/index.html`

### 3.6 后端构建与测试

```bash
cd api
mvn clean test
mvn clean package
```

产物路径：`api/target/`

## 4. 数据库与 Liquibase

### 4.1 H2（默认）

- 默认使用本地文件型 H2 数据库
- 数据文件路径：`./data/anilink`
- 适合本地开发和轻量部署

### 4.2 PostgreSQL 配置

切换到 PostgreSQL 时设置：

- `DB_PROFILE=pgsql`
- `DB_HOST`（默认 `localhost`）
- `DB_PORT`（默认 `5432`）
- `DB_NAME`（默认 `anilink`）
- `DB_USER`（默认 `postgres`）
- `DB_PASS`（默认 `postgres`）

示例：

```bash
DB_PROFILE=pgsql \
DB_HOST=127.0.0.1 \
DB_PORT=5432 \
DB_NAME=anilink \
DB_USER=postgres \
DB_PASS=yourpassword \
mvn spring-boot:run
```

### 4.3 配置文件与挂载说明

- `application.properties`: 默认激活 H2
- `application-h2.properties`: H2 连接参数
- `application-pgsql.properties`: PostgreSQL 连接参数
- 如需覆盖默认配置，可挂载 `/app/config`

### 4.4 Liquibase 目录与变更实践

Liquibase 目录：`api/src/main/resources/db/changelog/`

- `db.changelog-master.yaml`: 主入口
- `common/`: 数据库无关变更（优先维护）
- `h2/`: H2 特殊变更
- `pgsql/`: PostgreSQL 特殊变更

推荐策略：

1. 优先将通用变更写入 `common/`
2. 对数据库差异使用 `dbms` 或 `context` 区分
3. 所有新增变更都要在 `db.changelog-master.yaml` 中显式引入

`dbms` 区分示例：

```yaml
- changeSet:
    id: 1-pg
    author: yourname
    dbms: postgresql
    changes:
      - sql:
          sql: SELECT 1;
- changeSet:
    id: 1-h2
    author: yourname
    dbms: h2
    changes:
      - sql:
          sql: SELECT 1;
```

本地开发建议：

- H2 使用 PostgreSQL 兼容模式（`MODE=PostgreSQL`）以降低差异
- 生产环境使用 PostgreSQL，并确保变更在 H2/PG 都可执行

## 5. 前端开发（`ui/`）

### 5.1 安装依赖

```bash
cd ui
pnpm install
```

### 5.2 启动开发服务器

```bash
cd ui
pnpm dev
```

默认 Vite 地址通常为：`http://localhost:5173`

### 5.3 前端构建

```bash
cd ui
pnpm build
```

构建产物目录：`ui/dist/`

### 5.4 主要目录说明

- `src/views/`: 页面级组件
- `src/components/`: 通用与业务组件
- `src/router/`: 路由配置
- `src/styles/`: 样式文件
- `src/utils/`: 工具函数

## 6. 前后端联调

推荐联调顺序：

1. 启动后端（`8081`）
2. 启动前端（Vite 开发服务器）
3. 在浏览器完成安装向导
4. 导入媒体库并验证扫描、播放、弹幕流程

联调重点：

- 登录态与权限接口
- 媒体库扫描与元数据队列
- 视频流拖拽播放（Range 请求）
- 弹幕接口 `/api/v2/comment/{episodeId}`

## 7. 一体化打包（可选）

如需将前端静态资源打包进后端：

```bash
cd ui
pnpm install && pnpm build

cd ..
mkdir -p api/src/main/resources/static
cp -r ui/dist/* api/src/main/resources/static/

cd api
mvn clean package
```

## 8. 常见问题

- 启动失败：先看后端日志与 Maven 输出
- 无法提取媒体信息：检查 `ffprobe` 是否可执行
- PostgreSQL 连接失败：检查 `DB_HOST/DB_PORT` 与账号密码
- Liquibase 报错：检查 changelog 引入顺序、`dbms/context` 及数据库方言差异
- 前端页面空白：检查浏览器控制台与 `pnpm dev` 输出
