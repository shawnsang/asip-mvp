# ASIP MVP

AI Agent Success Intelligence Platform - Minimum Viable Product

## 技术栈

- **前端**: Next.js 14 + React + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL + Vector)
- **LLM**: 阿里云 Qwen3
- **部署**: Vercel

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填写：

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 阿里云 DashScope
DASHSCOPE_API_KEY=your_dashscope_api_key
```

### 3. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000 查看效果。

## 项目结构

```
asip-mvp/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── page.tsx      # 首页
│   │   ├── layout.tsx   # 布局
│   │   └── api/          # API 路由
│   ├── components/       # React 组件
│   ├── lib/              # 工具函数
│   │   ├── supabase.ts  # Supabase 客户端
│   │   └── llm.ts       # LLM 调用
│   └── types/            # TypeScript 类型
├── public/               # 静态资源
├── package.json
├── tailwind.config.ts
└── next.config.js
```

## 功能路线图

- [ ] 数据采集模块
- [ ] LLM 结构化处理
- [ ] 案例库前端界面
- [ ] Copilot 对话功能

## License

MIT
