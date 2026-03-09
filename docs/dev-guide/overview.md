# 开发指南概览

本文档面向项目开发者，提供开发环境配置、技术栈说明与协作规范。

## 技术栈

### 后端
- **框架**: Spring Boot 3.4.x
- **数据库框架**: Spring Data JPA
- **数据库迁移**: Liquibase
- **认证授权**: Sa-Token
- **API文档**: SpringDoc OpenAPI

### 前端
- **框架**: Vue 3
- **构建工具**: Vite
- **UI库**: Vuetify
- **路由**: Vue Router
- **HTTP客户端**: Axios

### 数据库
- **开发环境**: H2（嵌入式，开箱即用）
- **生产环境**: PostgreSQL

### 其他工具
- **媒体分析**: FFprobe（容器镜像已集成）
- **包管理**: Maven 3.8+（后端）、pnpm（前端）

## 项目目录结构

```
.
├── api/              # 后端服务（Spring Boot）
│   ├── pom.xml
│   ├── src/main/java/xyz/ezsky/anilink/
│   ├── src/main/resources/
│   └── src/test/
├── ui/               # 前端应用（Vue 3 + Vite）
│   ├── package.json
│   ├── src/
│   └── dist/         # 构建产物
├── docs/             # 项目文档（本目录）
└── README.md
```

## 前置条件

开始开发前，请确保已安装：

- **JDK 17+** - Java开发环境
- **Maven 3.8+** - Java包管理
- **Node.js 18+** - JavaScript运行时
- **pnpm** - 包管理工具（"快速、节省硬盘的包管理器"）
- **FFprobe** - 媒体元数据提取（可选，推荐安装以支持媒体文件分析）
- **Docker** - 容器化（可选，用于本地PostgreSQL或一体化验证）

### 快速验证环境

```bash
# 检查各工具版本
java -version        # 应为 17+
mvn -version         # 应为 3.8.1+
node -version        # 应为 18+
pnpm -version        # 应为已安装
ffprobe -version     # 可选
docker --version     # 可选
```

## 开发流程

### 1. 本地启动

按以下顺序启动服务：

```bash
# 终端1：启动后端（8081端口）
cd api
mvn spring-boot:run

# 终端2：启动前端开发服务器（默认5173端口）
cd ui
pnpm install
pnpm dev
```

然后在浏览器访问 `http://localhost:5173`。第一次访问会进入安装向导。

### 2. 联调重点

关键的联调接口与功能：

- **登录与权限** - `POST /api/v1/login` 与 `GET /api/v1/user/info`
- **媒体库管理** - 媒体库CRUD与手动扫描触发
- **文件元数据** - 异步队列进度查询与提取结果验证
- **番剧匹配** - 调用弹弹play接口与数据库缓存验证
- **播放与弹幕** - 视频流Range请求与弹幕接口调用

### 3. 开发规范

#### 后端代码组织

Java类应遵循分层架构：

```
xyz.ezsky.anilink/
├── config/       # 应用配置
├── controller/   # API接口层（仅负责请求/响应）
├── service/      # 业务逻辑层（核心实现）
├── repository/   # 数据访问层
├── listener/     # 事件监听
├── model/        # 数据模型
│   ├── entity/   # 数据库实体（仅在Repository/Service中使用）
│   ├── dto/      # 数据传输对象（写入/更新入参）
│   └── vo/       # 视图对象（Controller返回给前端）
└── util/         # 通用工具类
```

**关键原则**：
- `Controller` 与 `Repository` 层不承载复杂业务逻辑
- 推荐数据流：查询 `Controller -> Service -> Repository(Entity) -> Service(转VO) -> Controller`
- 推荐数据流：写入 `Controller(接DTO) -> Service(转Entity) -> Repository`

#### 前端代码组织

```
src/
├── views/        # 页面组件
├── components/   # 通用与业务组件
├── router/       # 路由配置
├── styles/       # 样式文件
├── utils/        # 工具函数与API客户端
└── App.vue       # 根组件
```

## 相关文档

- [后端开发指南](./backend.md)
- [前端开发指南](./frontend.md)
- [数据库与Liquibase](./database.md)
- [快速开始](../quick-start.md)（部署相关）
