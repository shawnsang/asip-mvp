# ASIP Agent Team 实现文档

## 概述

ASIP Agent Team 是一套完整的 AI Agent 系统，用于帮助销售人员发现 AI Agent 的全新应用场景。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions (定时任务)                                   │
│  每天自动爬取 GitHub/Product Hunt/Twitter 数据 → 入库        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Supabase 数据库                                            │
│  cases表 │ trends表 │ scenarios表                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  AI Copilot (Agent RAG)                                    │
│  1. 意图识别 → 2. 向量检索 → 3. LLM生成 → 4. 附来源       │
└─────────────────────────────────────────────────────────────┘
```

## Agent 列表

| Agent | 文件 | 功能 |
|-------|------|------|
| OrchestrationAgent | orchestration-agent.ts | 意图识别、任务分发 |
| TrendFinderAgent | trend-finder.ts | 发现最新趋势 |
| SourceCollectorAgent | source-collector.ts | 数据采集 |
| SceneTranslatorAgent | scene-translator.ts | 场景转化 |
| InsightSummarizerAgent | insight-summarizer.ts | 洞察生成 |
| SalesScriptGeneratorAgent | sales-generator.ts | 销售话术生成 |
| ValuePropositionAgent | value-proposition.ts | 价值主张生成 |
| DataIngestionAgent | data-ingestion.ts | 数据入库 |

## 新增组件

### RAG 引擎 (rag.ts)

- `agentRAG()` - 主 RAG 流程
- `retrieveFromDatabase()` - 从数据库检索
- `getEmbedding()` - 文本向量化
- 支持来源追溯

## API 接口

### POST /api/chat

```json
{
  "message": "brainstorm",
  "mode": "brainstorm"
}
```

返回格式：

```json
{
  "success": true,
  "data": {
    "type": "brainstorm",
    "answer": "分析内容...",
    "sources": [
      { "title": "案例名称", "url": "来源链接", "relevance": 0.95 }
    ],
    "retrievedCount": 5,
    "message": "基于案例库中 5 个相关案例生成回答"
  }
}
```

## 实施阶段

### 阶段1: 定时数据采集系统 ✅
- GitHub Actions 定时爬取
- 数据清洗和结构化
- 入库 Supabase

### 阶段2: RAG 检索引擎 ✅
- 向量嵌入 (text-embedding-3-small)
- 相似度检索
- 来源追踪

### 阶段3: Copilot Agent RAG 改造 ✅
- 查库优先 + LLM 生成
- 溯源展示
- 降级处理

## 待完善

1. **真实数据入库** - 需要先有案例数据才能展示溯源
2. **向量索引优化** - 使用 Supabase Vector (pgvector)
3. **缓存机制** - 减少 LLM 调用次数

## 使用方式

1. 打开 http://localhost:3000
2. 在 AI Copilot 中输入脑力风暴相关问题
3. 如 "brainstorm"、"AI Agent 新趋势" 等
