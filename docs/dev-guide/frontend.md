# 前端开发指南

本文档详细说明前端（Vue 3 + Vite）的开发规范、开发环境配置与启动流程。

## 环境准备

### 必备工具

- **Node.js 18+** - JavaScript运行时
- **pnpm** - 包管理工具（更快、更节省磁盘空间）

### 安装pnpm

如果未安装pnpm，使用npm快速安装：

```bash
npm install -g pnpm
```

### 验证环境

```bash
node -version    # 应为18+
pnpm -version    # 应为已安装
```

## 项目结构

```
ui/
├── package.json              # 项目配置与依赖
├── pnpm-lock.yaml           # 依赖锁定文件
├── vite.config.ts           # Vite构建配置
├── tsconfig.json            # TypeScript配置
├── src/
│   ├── components/          # 通用与业务组件
│   │   ├── Layout/          # 布局相关
│   │   ├── Common/          # 通用组件
│   │   └── Business/        # 业务组件
│   ├── views/               # 页面级组件
│   │   ├── Home.vue
│   │   ├── Setup.vue        # 安装向导
│   │   ├── Dashboard.vue    # 管理后台
│   │   ├── Browse.vue       # 动漫浏览
│   │   ├── Watch.vue        # 播放页面
│   │   └── NotFound.vue
│   ├── router/              # 路由配置
│   │   └── index.ts
│   ├── stores/              # Pinia状态管理（可选）
│   ├── styles/              # 全局样式
│   │   └── main.css
│   ├── utils/               # 工具函数与API客户端
│   │   ├── api.ts           # API请求封装
│   │   ├── storage.ts       # 本地存储
│   │   └── helpers.ts       # 通用工具
│   ├── App.vue              # 根组件
│   ├── main.ts              # 应用入口
│   └── vite-env.d.ts        # Vite环境类型
├── public/                   # 静态资源（不会被Vite处理）
├── dist/                     # 构建产物（生成）
└── index.html               # HTML入口
```

## 开发流程

### 1. 安装依赖

```bash
cd ui
pnpm install
```

### 2. 启动开发服务器

```bash
pnpm dev
```

输出示例：
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

访问 `http://localhost:5173` 即可开始开发。

**特点**：
- Hot Module Replacement（HMR）：改动文件后自动刷新浏览器
- 快速冷启动：无需打包整个应用
- 增量编译：只打包改动部分

### 3. 构建生产版本

```bash
pnpm build
```

输出产物：`ui/dist/`

## 代码规范

### Vue 3组件最佳实践

#### 组件示例

```vue
<template>
  <div class="anime-card">
    <img :src="anime.cover" :alt="anime.name">
    <h3>{{ anime.name }}</h3>
    <p>{{ anime.summary }}</p>
    <button @click="handleWatch">立即观看</button>
  </div>
</template>

<script setup lang="ts">
// 导入
import { computed, ref } from 'vue'
import { useAnimeStore } from '@/stores/anime'

// 接口定义
interface Anime {
  id: number
  name: string
  cover: string
  summary: string
}

// Props定义
interface Props {
  anime: Anime
}

const props = defineProps<Props>()

// 状态管理
const store = useAnimeStore()
const isLoading = ref(false)

// 计算属性
const displayName = computed(() => {
  return props.anime.name.length > 20
    ? props.anime.name.substring(0, 20) + '...'
    : props.anime.name
})

// 事件处理
const emit = defineEmits<{
  watch: [id: number]
}>()

const handleWatch = () => {
  emit('watch', props.anime.id)
  // 或直接调用API
  store.watchAnime(props.anime.id)
}
</script>

<style scoped>
.anime-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s;
}

.anime-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.anime-card img {
  width: 100%;
  aspect-ratio: 3/4;
  object-fit: cover;
}
</style>
```

#### 关键原则

1. **使用 `<script setup>` 语法** - 更简洁、性能更好
2. **类型安全** - 使用TypeScript定义Props、Emits和状态
3. **响应式数据** - 使用 `ref`、`reactive`、`computed`
4. **事件处理** - 通过 `emits` 定义，避免隐含依赖
5. **组件拆分** - 单一职责，易于测试和复用
6. **样式隔离** - 使用 `scoped` 避免全局污染

### API调用规范

#### API客户端封装

```typescript
// src/utils/api.ts
import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000
})

// 请求拦截器（添加认证令牌）
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器（处理错误）
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      // 处理未授权
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 导出API方法
export const animeAPI = {
  getList: (page: number, size: number) =>
    api.get('/anime', { params: { page, size } }),
  
  search: (keyword: string) =>
    api.get('/anime/search', { params: { keyword } }),
  
  getDetail: (id: number) =>
    api.get(`/anime/${id}`),
  
  getEpisodes: (id: number) =>
    api.get(`/anime/${id}/episodes`)
}

export default api
```

#### 在组件中使用

```typescript
import { ref, onMounted } from 'vue'
import { animeAPI } from '@/utils/api'

const animes = ref([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const response = await animeAPI.getList(1, 20)
    animes.value = response.data
  } catch (error) {
    console.error('Failed to fetch animes:', error)
  } finally {
    loading.value = false
  }
})
```

### Router配置

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Browse from '@/views/Browse.vue'
import Watch from '@/views/Watch.vue'
import Dashboard from '@/views/Dashboard.vue'

const routes = [
  {
    path: '/',
    component: Home,
    meta: { title: '首页' }
  },
  {
    path: '/browse',
    component: Browse,
    meta: { title: '动漫浏览', requiresAuth: true }
  },
  {
    path: '/watch/:id',
    component: Watch,
    meta: { title: '观看', requiresAuth: true }
  },
  {
    path: '/dashboard',
    component: Dashboard,
    meta: { title: '管理后台', requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
```

## 开发工具与扩展

### 推荐VS Code扩展

- **Volar** - Vue 3官方语言支持
- **TypeScript Vue Plugin** - Vue中TypeScript支持
- **ESLint** - 代码规范检查
- **Prettier** - 代码格式化
- **Thunder Client** 或 **REST Client** - API调试

### 调试技巧

#### 浏览器调试

```javascript
// 在组件中添加调试
console.log('Anime data:', this.anime)

// 使用Vue Devtools查看组件树与状态
// https://devtools.vuejs.org/
```

#### API调试

```bash
# 使用curl测试API
curl -H "Authorization: Bearer your-token" \
     http://localhost:8081/api/v1/anime

# 或使用REST Client插件在VS Code中编写请求文件
```

## 常见问题

### 1. Vite开发服务器加载缓慢

**原因**：首次启动需要预处理依赖，或网络连接差

**解决**：
- 确保网络连接良好
- 删除 `node_modules` 与 `pnpm-lock.yaml`，重新安装
- 检查磁盘空间是否充足

### 2. Hot Module Replacement不工作

**原因**：HMR配置错误，或浏览器未正确连接

**解决**：
- 刷新浏览器
- 检查 `vite.config.ts` 中HMR配置
- 查看浏览器控制台是否有错误

### 3. TypeScript类型错误

**原因**：类型定义不完整或版本冲突

**解决**：
- 确保安装了 `@types/node` 等类型包
- 运行 `pnpm install` 更新lock文件
- 检查 `tsconfig.json` 配置

### 4. 与后端API连接失败

**原因**：跨域（CORS）、后端未启动、代理配置错误

**解决**：
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true
      }
    }
  }
})
```

## 相关文档

- [后端开发指南](./backend.md)
- [数据库与Liquibase](./database.md)
- [开发文档概览](./overview.md)
