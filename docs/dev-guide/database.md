# 数据库与Liquibase开发指南

本文档详细说明数据库配置、Liquibase迁移管理与数据库开发的最佳实践。

## 数据库架构

AniLinkServer支持两种数据库，通过环境变量 `DB_PROFILE` 切换：

| 数据库 | Profile | 场景 | 配置文件 |
|--------|---------|------|---------|
| **H2** | `h2` | 本地开发、轻量部署 | `application-h2.properties` |
| **PostgreSQL** | `pgsql` | 生产环境、多实例部署 | `application-pgsql.properties` |

## H2数据库（开发首选）

### 特点

- **嵌入式数据库** - 无需单独启动，开箱即用
- **快速开发** - 完全遵循PostgreSQL语法（`MODE=PostgreSQL`）
- **便捷调试** - 内置Web管理控制台
- **轻量部署** - 单个JAR文件可独立运行

### 配置与启动

#### 文件位置

```
src/main/resources/application-h2.properties
```

#### 快速启动

```bash
DB_PROFILE=h2 mvn spring-boot:run
```

#### H2 Web控制台

启动后访问：`http://localhost:8081/h2-console`

- **JDBC URL**: `jdbc:h2:./data/anilink`
- **用户名**: `sa`
- **密码**: 留空

### H2关键配置

```properties
spring.datasource.url=jdbc:h2:./data/anilink;MODE=PostgreSQL
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=

# 启用Web控制台
spring.h2.console.enabled=true
spring.h2.console.path=/h2-console
```

**关键项说明**：
- `MODE=PostgreSQL` - H2以PostgreSQL兼容模式运行，最小化数据库差异
- `./data/anilink` - 数据文件本地存储路径

### H2文件存储

- 数据文件位置：`./data/anilink.mv.db`
- 文件可复制备份：直接复制 `.mv.db` 文件即可迁移数据库
- 清空数据：删除 `.mv.db` 文件，重启应用自动重建

## PostgreSQL数据库（生产推荐）

### 特点

- **企业级** - 高可用、高性能、丰富功能
- **生产验证** - 部署超大规模应用
- **完整功能** - 支持复杂查询、事务、并发

### 配置与启动

#### 文件位置

```
src/main/resources/application-pgsql.properties
```

#### 使用Docker快速启动PostgreSQL

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=anilink \
  -p 5432:5432 \
  postgres:16
```

#### 启动应用

```bash
DB_PROFILE=pgsql \
DB_HOST=127.0.0.1 \
DB_PORT=5432 \
DB_NAME=anilink \
DB_USER=postgres \
DB_PASS=postgres \
mvn spring-boot:run
```

### PostgreSQL关键配置

```properties
spring.datasource.url=jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:anilink}
spring.datasource.driver-class-name=org.postgresql.Driver
spring.datasource.username=${DB_USER:postgres}
spring.datasource.password=${DB_PASS:postgres}

# 连接池配置
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=2
spring.datasource.hikari.idle-timeout=600000
```

## Liquibase数据库迁移

### 为什么使用Liquibase？

1. **版本控制** - 数据库变更纳入代码版本管理
2. **可重复** - 开发、测试、生产环境一致性
3. **可回滚** - 支持数据库变更的前向和回滚
4. **跨数据库** - 同一套脚本支持多种数据库

### 目录结构

```
src/main/resources/db/changelog/
├── db.changelog-master.yaml      # 主入口文件
├── common/                        # 通用变更（优先维护）
│   ├── 001-init-schema.yaml
│   └── 002-add-indices.yaml
├── h2/                            # H2特殊变更
│   └── h2-compat.yaml
└── pgsql/                         # PostgreSQL特殊变更
    └── pgsql-compat.yaml
```

### 主入口文件配置

```yaml
# db.changelog-master.yaml
databaseChangeLog:
  - include:
      file: common/001-init-schema.yaml
  - include:
      file: common/002-add-indices.yaml
  - include:
      file: common/003-ddl-triggers.yaml
      
  # 数据库特定变更
  - includeAll:
      path: h2/
      filter:
        dbms: 'h2'
  - includeAll:
      path: pgsql/
      filter:
        dbms: 'postgresql'
```

### 编写变更脚本

#### 示例1：创建表

```yaml
# common/001-init-schema.yaml
databaseChangeLog:
  - changeSet:
      id: 1-create-anime-table
      author: dev-team
      comment: 创建番剧表
      changes:
        - createTable:
            tableName: anime
            columns:
              - column:
                  name: id
                  type: bigint
                  autoIncrement: true
                  constraints:
                    primaryKey: true
              - column:
                  name: name
                  type: varchar(255)
                  constraints:
                    nullable: false
              - column:
                  name: anime_id
                  type: bigint
              - column:
                  name: created_at
                  type: timestamp
                  defaultValue: CURRENT_TIMESTAMP
              - column:
                  name: updated_at
                  type: timestamp
                  defaultValue: CURRENT_TIMESTAMP
      rollback:
        - dropTable:
            tableName: anime
```

#### 示例2：数据库特定SQL

```yaml
# 使用 dbms 标签区分不同数据库
databaseChangeLog:
  - changeSet:
      id: 2-pg-uuid-extension
      author: dev-team
      dbms: postgresql
      comment: PostgreSQL启用UUID扩展
      changes:
        - sql:
            sql: CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
            
  - changeSet:
      id: 2-h2-noop
      author: dev-team
      dbms: h2
      comment: H2无需UUID扩展
      changes:
        - empty:
```

#### 示例3：使用Context区分

```yaml
databaseChangeLog:
  - changeSet:
      id: 3-add-index
      author: dev-team
      context: 'init'  # 仅在init context下执行
      changes:
        - createIndex:
            indexName: idx_anime_name
            tableName: anime
            columns:
              - column:
                  name: name
```

### 最佳实践

#### 1. 优先使用通用变更

```yaml
# ✅ 推荐：使用通用语法
- createTable:
    tableName: video
    columns:
      - column:
          name: id
          type: bigint
          
# ❌ 避免：直接写SQL
- sql:
    sql: CREATE TABLE video (id BIGINT PRIMARY KEY)
```

#### 2. 为每个变更分配唯一ID

```yaml
changeSet:
  id: 4-add-video-table     # 格式：序号-操作说明
  author: your-name         # 开发者名称
  comment: 添加视频表        # 变更说明
```

#### 3. 提供回滚脚本

```yaml
changeSet:
  id: 5-add-column
  changes:
    - addColumn:
        tableName: video
        columns:
          - column:
              name: description
              type: varchar(500)
  rollback:
    - dropColumn:
        tableName: video
        columnName: description
```

#### 4. 一个文件一个业务功能

```yaml
# ✅ 推荐：一个文件对应一个功能
# 003-add-episode-table.yaml
# 004-add-video-metadata.yaml
# 005-create-comment-indices.yaml

# ❌ 避免：一个文件混合多个无关功能
```

#### 5. 数据库差异使用专用文件

```yaml
# common/002-tables.yaml - 通用表定义

# h2/001-h2-specifics.yaml - H2特定的兼容性修复
# pgsql/001-pgsql-specifics.yaml - PostgreSQL特定配置
```

### 执行Liquibase迁移

#### 自动执行（启动时）

启动应用时自动执行所有待处理的变更：

```bash
mvn spring-boot:run
# 应用启动时自动检查db.changelog-master.yaml并执行变更
```

#### 手动验证

```bash
# 查看Liquibase执行状态
mvn liquibase:status

# 更新数据库（手动触发）
mvn liquibase:update

# 查看待执行的变更
mvn liquibase:futureRollbackSQL
```

### Liquibase配置

```properties
# application.properties
spring.liquibase.enabled=true
spring.liquibase.change-log=classpath:db/changelog/db.changelog-master.yaml
spring.liquibase.default-schema=public
```

## 本地开发工作流

### 场景1：新增一个数据表

```bash
# 1. 在 src/main/resources/db/changelog/common/ 创建新文件
#    006-create-comment-table.yaml

# 2. 在 db.changelog-master.yaml 中引入
- include:
    file: common/006-create-comment-table.yaml

# 3. 启动应用，Liquibase自动执行
mvn spring-boot:run

# 4. 验证表已创建（使用H2控制台或SQL客户端）
```

### 场景2：修复错误变更

```bash
# 1. 回滚到上一个正确的版本
mvn liquibase:rollback -Dliquibase.rollbackCount=1

# 2. 修复变更脚本

# 3. 重新启动应用执行修正后的脚本
mvn spring-boot:run
```

### 场景3：在开发、测试、生产间切换

```bash
# 开发环境（H2）
DB_PROFILE=h2 mvn spring-boot:run

# 测试环境（PostgreSQL）
DB_PROFILE=pgsql \
DB_HOST=test-db.example.com \
DB_USER=test_user \
DB_PASS=test_pass \
mvn spring-boot:run

# 生产环境（PostgreSQL）
DB_PROFILE=pgsql \
DB_HOST=prod-db.example.com \
DB_USER=prod_user \
DB_PASS=$(cat /run/secrets/db_password) \
mvn spring-boot:run
```

## 常见问题

### 1. Liquibase变更执行失败

**原因**：变更脚本语法错误或数据库兼容性问题

**解决**：
```bash
# 查看错误日志
mvn liquibase:status

# 验证YAML语法
# 或使用在线YAML验证器：https://www.yamllint.com/
```

### 2. H2和PostgreSQL数据不一致

**原因**：使用了特定数据库的SQL语法

**解决**：
- 优先使用Liquibase通用变更（`createTable`、`addColumn`等）
- 数据库特定操作使用 `dbms` 标签区分
- 在H2 `MODE=PostgreSQL` 模式下充分测试

### 3. Liquibase回滚不工作

**原因**：未提供 `rollback` 标签

**解决**：确保每个 `changeSet` 都定义了 `rollback` 部分：

```yaml
changeSet:
  id: xxx
  changes:
    - addColumn: ...
  rollback:
    - dropColumn: ...
```

### 4. 忘记运行Liquibase

**原因**：手动修改数据库，未通过Liquibase追踪

**解决**：
- 禁止直接修改生产数据库
- 所有变更必须通过Liquibase脚本管理
- 使用Git commit强制代码审查

## 数据库表设计规范

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 表名 | 小写+下划线 | `anime`、`video_file` |
| 列名 | 小写+下划线 | `anime_id`、`created_at` |
| 索引 | `idx_表名_列名` | `idx_video_anime_id` |
| 主键 | `id` | `id BIGINT PRIMARY KEY` |
| 外键 | `fk_表名_関联表` | `FOREIGN KEY (anime_id) REFERENCES anime(id)` |

### 字段规范

```yaml
# 标准字段定义
- column:
    name: id
    type: bigint
    autoIncrement: true
    constraints:
      primaryKey: true
      
- column:
    name: created_at
    type: timestamp
    defaultValue: CURRENT_TIMESTAMP
    constraints:
      nullable: false
      
- column:
    name: updated_at
    type: timestamp
    defaultValue: CURRENT_TIMESTAMP
    constraints:
      nullable: false
```

## 相关文档

- [后端开发指南](./backend.md)
- [前端开发指南](./frontend.md)
- [开发文档概览](./overview.md)
