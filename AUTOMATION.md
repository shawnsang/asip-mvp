# ASIP 数据自动更新配置

## 当前状态

目前数据更新需要**手动运行**脚本。

## 自动更新方案

### 方案 1: GitHub Actions (推荐)

已创建 `.github/workflows/collect-data.yml`，配置为每天 UTC 0 点自动运行：

1. 在 GitHub 仓库设置 Secrets：
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `DASHSCOPE_API_KEY`

2. 启用 Actions 后会自动按计划运行

### 方案 2: Vercel Cron

1. 在 Vercel 项目设置中添加 Cron Job:
   - URL: `https://your-project.vercel.app/api/cron/data?secret=your-secret`
   - 频率: 每天 1 次

2. 创建 `vercel.json` 配置

### 方案 3: 手动触发

访问: `https://asip-mvp.vercel.app/api/cron/data?secret=your-secret`

## 手动运行

```bash
# 1. 采集数据
node scripts/collect-all.js github

# 2. 导入数据库
node scripts/import-merged.js

# 3. LLM 结构化处理
node scripts/extract-db.js
```

## 数据统计

- 当前案例数: 443 条
- 已处理 LLM 结构化: 40+ 条
