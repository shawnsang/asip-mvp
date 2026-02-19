/**
 * ASIP 数据抓取配置
 * 统一管理所有数据源的配置
 */

module.exports = {
  // GitHub 配置
  github: {
    baseUrl: 'https://api.github.com',
    searchQueries: [
      'AI Agent',
      'LLM Agent',
      'GPT Agent',
      'Autonomous Agent',
      'AI automation',
      'Browser Agent',
      'workflow automation',
      'RPA AI',
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
      'LocalLLaMA',
      'ChatGPTTools',
      'artificial',
      'MachineLearning',
      'LLMDevs',
    ],
    searchQueries: ['AI Agent', 'automation', 'LLM application'],
    limit: 50,
    rateLimitDelay: 1000,
  },

  // Hacker News 配置
  hackerNews: {
    baseUrl: 'https://hacker-news.firebaseio.com/v0',
    searchQueries: ['AI', 'LLM', 'agent', 'automation'],
    limit: 50,
    rateLimitDelay: 500,
  },

  // 采集频率配置
  schedule: {
    // 采集间隔 (小时)
    github: 24,
    reddit: 12,
    hackerNews: 6,
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
