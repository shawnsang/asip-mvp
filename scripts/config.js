/**
 * ASIP 数据抓取配置
 * 统一管理所有数据源的配置
 */

module.exports = {
  // GitHub 配置
  github: {
    baseUrl: 'https://api.github.com',
    searchQueries: [
      // 核心 AI Agent 方向
      'AI Agent',
      'LLM Agent',
      'GPT Agent',
      'Autonomous Agent',
      'AI automation',
      'Browser Agent',
      'workflow automation',
      'RPA AI',
      // 你的核心产品
      'OpenClaw',
      'OpenAI Operator',
      // 最新热门方向
      'Computer Use',
      'Claude Tool Use',
      'Anthropic Tool Use',
      'GPT-4V',
      'GPT4o',
      // Skills & Prompts 收集（你的核心需求）
      'AI skill',
      'AI prompt',
      'prompt library',
      'agent prompt',
      // 案例收集关键词
      'agent use case',
      'AI automation case study',
      'LLM ROI',
      'enterprise AI',
      // 多Agent框架
      'multi-agent',
      'agent orchestration',
      'crewAI',
      'AutoGen',
      'LangChain agent',
    ],
    maxPages: 2, // 无 Token 时限制页数
    rateLimitDelay: 2000, // 请求间隔 (ms)
    retryAttempts: 3,
    retryDelay: 5000,
  },

  // Reddit 配置
  reddit: {
    baseUrl: 'https://www.reddit.com',
    subreddits: [
      // 核心 LLM 讨论
      'LocalLLaMA',
      'ChatGPTTools',
      'artificial',
      'MachineLearning',
      'LLMDevs',
      // 新增 - AI Agents 讨论
      'ClaudeAI',
      'ChatGPTCoding',
      'LLMTrading',
      // 自动化相关
      'automation',
      'n8n',
      // 实用工具
      'python',
      'JavaScript',
    ],
    searchQueries: [
      'AI Agent',
      'OpenClaw',
      'automation',
      'LLM application',
      'browser agent',
      'computer use',
      'tool use',
      'agent use case',
      'ROI',
    ],
    limit: 50,
    rateLimitDelay: 1000,
  },

  // Hacker News 配置
  hackerNews: {
    baseUrl: 'https://hacker-news.firebaseio.com/v0',
    searchQueries: [
      'AI', 'LLM', 'agent', 'automation',
      'OpenClaw', 'browser agent', 'computer use',
      'Claude', 'GPT', 'tool use', 'multi-agent'
    ],
    limit: 50,
    rateLimitDelay: 500,
  },

  // Product Hunt 配置
  productHunt: {
    baseUrl: 'https://www.producthunt.com',
    categories: ['ai', 'developer-tools', 'productivity'],
    searchQueries: ['AI agent', 'automation', 'LLM', 'browser'],
    limit: 30,
    rateLimitDelay: 1000,
  },

  // 采集频率配置
  schedule: {
    // 采集间隔 (小时)
    github: 24,
    reddit: 12,
    hackerNews: 6,
    productHunt: 12,
    // 增量更新 vs 全量更新
    incremental: true,
    // 最大单次采集数量
    maxItemsPerRun: 100,
  },

  // 数据处理配置
  processing: {
    // 去重字段
    dedupeFields: ['source', 'source_url'],
    // 质量评分阈值
    minQualityScore: 0.3,
    // LLM 处理批次大小
    llmBatchSize: 5,
  },

  // 输出配置
  output: {
    rawDataDir: './data/raw',
    processedDataDir: './data/processed',
    logDir: './logs',
  },
};
