# 后端开发指南

本文档详细说明后端（Spring Boot）的开发规范、环境配置与启动流程。

## 环境准备

### 必备工具

- **JDK 17+** - Java开发工具包
- **Maven 3.8+** - 依赖管理与构建工具
- **FFprobe** - 媒体元数据提取（可选但推荐）

### 验证环境

```bash
java -version
mvn -version
ffprobe -version  # 可选
```

## 代码结构规范

### Java包结构

所有Java类位于 `xyz.ezsky.anilink` 基础包下，按职责严格分层：

```
src/main/java/xyz/ezsky/anilink/
├── config/           # 应用配置类（数据库、中间件、第三方服务等）
├── controller/       # API接口层
│   └── api/         # RESTful接口
├── service/          # 核心业务逻辑层
│   └── impl/        # Service实现类
├── repository/       # 数据访问层（Spring Data JPA接口）
├── listener/         # 启动事件与业务事件监听
├── model/            # 数据模型
│   ├── entity/      # @Entity 数据库实体
│   ├── dto/         # 数据传输对象（写入/更新）
│   └── vo/          # 视图对象（查询返回）
├── util/             # 工具类
│   └── [各类工具]
└── AniLinkApplication.java  # 应用入口
```

### 分层职责

#### Controller 层
- **仅负责**：请求接收、参数验证、响应返回
- **不负责**：业务逻辑、数据转换
- 示例：
  ```java
  @RestController
  @RequestMapping("/api/v1/anime")
  public class AnimeController {
      @Autowired
      private AnimeService animeService;
      
      @GetMapping("/{id}")
      public AnimeVO getAnimeById(@PathVariable Long id) {
          return animeService.getAnimeVO(id);
      }
  }
  ```

#### Service 层
- **负责**：业务逻辑实现、数据转换、事务管理
- **可调用**：Repository、其他Service、工具类
- 示例：
  ```java
  @Service
  public class AnimeService {
      @Autowired
      private AnimeRepository animeRepository;
      
      public AnimeVO getAnimeVO(Long id) {
          Anime entity = animeRepository.findById(id)
              .orElseThrow(() -> new RuntimeException("Not found"));
          return convertToVO(entity);  // 转换为VO
      }
      
      private AnimeVO convertToVO(Anime entity) {
          // 转换逻辑
      }
  }
  ```

#### Repository 层
- **负责**：数据库查询与持久化
- **不负责**：业务逻辑
- 示例：
  ```java
  public interface AnimeRepository extends JpaRepository<Anime, Long> {
      List<Anime> findByNameContaining(String name);
  }
  ```

#### Model 层

##### Entity（数据库实体）
- 仅用于 Repository 与 Service 层内部使用
- 标注 `@Entity`、`@Table`，映射数据库表
- 示例：
  ```java
  @Entity
  @Table(name = "anime")
  public class Anime {
      @Id
      @GeneratedValue(strategy = GenerationType.IDENTITY)
      private Long id;
      
      private String name;
      private String summary;
  }
  ```

##### DTO（数据传输对象）
- 用于请求入参（写入/更新）
- 包含必要的验证注解 (`@NotNull`, `@NotBlank` 等)
- 示例：
  ```java
  public class AnimeCreateDTO {
      @NotBlank
      private String name;
      
      private String summary;
  }
  ```

##### VO（视图对象）
- 作为 Controller 返回给前端的数据结构
- 仅包含需要给前端的字段
- 示例：
  ```java
  public class AnimeVO {
      private Long id;
      private String name;
      private String summary;
      private List<EpisodeVO> episodes;
  }
  ```

## 配置与环境管理

### 配置文件位置

```
src/main/resources/
├── application.properties         # 通用配置（高优先级）
├── application-h2.properties      # H2数据库配置
├── application-pgsql.properties   # PostgreSQL数据库配置
├── logback-spring.xml            # 日志配置
├── db/
│   └── changelog/                # Liquibase脚本
└── static/                        # 静态资源（打包时用）
```

### 环境切换

通过环境变量 `DB_PROFILE` 切换数据库：

```bash
# H2（默认，开发环境）
mvn spring-boot:run
# 等同于
DB_PROFILE=h2 mvn spring-boot:run

# PostgreSQL（生产环境）
DB_PROFILE=pgsql \
DB_HOST=127.0.0.1 \
DB_PORT=5432 \
DB_NAME=anilink \
DB_USER=postgres \
DB_PASS=postgres \
mvn spring-boot:run
```

## 本地开发启动

### 快速启动（H2）

```bash
cd api
mvn spring-boot:run
```

访问地址：
- 应用首页：`http://localhost:8081`
- Swagger文档：`http://localhost:8081/swagger-ui/index.html`
- H2控制台：`http://localhost:8081/h2-console`（默认密码为空）

### 使用PostgreSQL

首先启动PostgreSQL（推荐用Docker）：

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16
```

然后启动应用：

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

## 构建与测试

### 运行测试

```bash
cd api
mvn clean test
```

### 构建JAR包

```bash
cd api
mvn clean package
```

产物：`api/target/anilink-server-xxx.jar`

## 依赖管理

### 查看依赖树

```bash
mvn dependency:tree
```

### 更新依赖

```bash
mvn versions:display-dependency-updates
```

## 常见问题

### 1. 启动时 "FFprobe not found"

**原因**：系统未安装FFprobe

**解决**：
- Linux：`apt install ffmpeg`
- macOS：`brew install ffmpeg`
- 或在代码中配置FFprobe路径

### 2. H2数据库连接失败

**原因**：H2驱动版本不兼容或驱动未加载

**解决**：检查 `pom.xml` 中的H2依赖版本，确保与Spring Boot版本兼容

### 3. PostgreSQL连接超时

**原因**：PostgreSQL服务未启动或连接参数错误

**解决**：
- 验证 PostgreSQL 运行中：`docker ps | grep postgres`
- 验证连接参数：`echo $DB_HOST $DB_PORT $DB_NAME`
- 测试连接：`psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME`

### 4. Maven构建缓慢

**原因**：网络差或仓库源配置不佳

**解决**：修改 `~/.m2/settings.xml`，配置国内镜像源（如Aliyun）

## 相关文档

- [前端开发指南](./frontend.md)
- [数据库与Liquibase](./database.md)
- [开发文档概览](./overview.md)
