/**
 * Source Collector Agent
 * 数据源采集 Agent - 从各平台采集最新案例
 */

import { BaseAgentClass } from './base-agent';
import { AgentInput, AgentOutput } from './types';
import { callQwen } from '../llm';

/**
 * 数据源类型
 */
type SourceType = 'producthunt' | 'twitter' | 'reddit' | 'github' | 'newsletter' | 'youtube';

/**
 * 采集的案例数据
 */
interface CollectedCase {
  id: string;
  title: string;
  description: string;
  source: SourceType;
  sourceName: string;
  url?: string;
  tags: string[];
  metadata: Record<string, any>;
  collectedAt: string;
}

/**
 * Source Collector Agent
 */
export class SourceCollectorAgent extends BaseAgentClass {
  name = 'SourceCollectorAgent';
  description = '数据源采集 Agent - 从各平台采集最新 AI Agent 案例';
  capabilities = [
    {
      name: 'collect_from_producthunt',
      description: '从 Product Hunt 采集最新 AI 产品'
    },
    {
      name: 'collect_from_twitter',
      description: '从 Twitter 采集 AI Agent 讨论'
    },
    {
      name: 'collect_from_reddit',
      description: '从 Reddit 采集社区实战分享'
    },
    {
      name: 'collect_from_github',
      description: '从 GitHub 采集热门项目'
    }
  ];

  /**
   * 执行数据采集
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    try {
      const sources = input.params?.sources as SourceType[] || ['producthunt', 'twitter', 'reddit', 'github'];
      const keywords = input.params?.keywords || ['ai agent', 'ai assistant', 'automation', 'copilot'];
      const limit = input.params?.limit || 20;

      // 采集各数据源
      const collectedCases: CollectedCase[] = [];

      for (const source of sources) {
        const cases = await this.collectFromSource(source, keywords, limit);
        collectedCases.push(...cases);
      }

      // 过滤和去重
      const filteredCases = this.filterAndDeduplicate(collectedCases);

      // 按时间排序
      filteredCases.sort((a, b) =>
        new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()
      );

      return this.successOutput({
        cases: filteredCases.slice(0, limit),
        metadata: {
          sources,
          totalCollected: filteredCases.length,
          returned: Math.min(filteredCases.length, limit),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      return this.errorOutput(error.message || 'Source collection failed');
    }
  }

  /**
   * 从指定数据源采集
   */
  private async collectFromSource(
    source: SourceType,
    keywords: string[],
    limit: number
  ): Promise<CollectedCase[]> {
    switch (source) {
      case 'producthunt':
        return await this.collectFromProductHunt(keywords, limit);
      case 'twitter':
        return await this.collectFromTwitter(keywords, limit);
      case 'reddit':
        return await this.collectFromReddit(keywords, limit);
      case 'github':
        return await this.collectFromGitHub(keywords, limit);
      default:
        return [];
    }
  }

  /**
   * 从 Product Hunt 采集
   */
  private async collectFromProductHunt(keywords: string[], limit: number): Promise<CollectedCase[]> {
    // 模拟 Product Hunt API 采集
    // 实际实现中需要 Product Hunt API Key
    const mockCases: CollectedCase[] = [
      {
        id: 'ph-1',
        title: 'Bolt.new - AI-Powered Web Development',
        description: '用自然语言构建完整的 Web 应用。描述你想要的应用，AI 帮你生成代码、配置、部署。',
        source: 'producthunt',
        sourceName: 'Product Hunt',
        url: 'https://producthunt.com/posts/bolt-new',
        tags: ['ai-coding', 'web-dev', 'nocode', 'productivity'],
        metadata: { upvotes: 2500, comments: 180 },
        collectedAt: new Date().toISOString()
      },
      {
        id: 'ph-2',
        title: 'Cursor - AI Code Editor',
        description: '下一代 AI 代码编辑器。内置 AI 助手帮你写代码、调试、重构。',
        source: 'producthunt',
        sourceName: 'Product Hunt',
        url: 'https://producthunt.com/posts/cursor-2',
        tags: ['ai-coding', 'editor', 'developer-tools'],
        metadata: { upvotes: 4200, comments: 320 },
        collectedAt: new Date().toISOString()
      },
      {
        id: 'ph-3',
        title: 'Replit Agent',
        description: 'Replit 推出的 AI 编程助手。用自然语言描述需求，AI 生成完整应用。',
        source: 'producthunt',
        sourceName: 'Product Hunt',
        tags: ['ai-coding', 'replit', 'programming'],
        metadata: { upvotes: 3100, comments: 210 },
        collectedAt: new Date().toISOString()
      },
      {
        id: 'ph-4',
        title: 'v0 - AI UI Generator',
        description: '生成式 AI UI 工具。用文本描述生成 React 组件和页面。',
        source: 'producthunt',
        sourceName: 'Product Hunt',
        tags: ['ai-ui', 'react', 'design', 'generator'],
        metadata: { upvotes: 2800, comments: 150 },
        collectedAt: new Date().toISOString()
      },
      {
        id: 'ph-5',
        title: 'Perplexity - AI Search Engine',
        description: 'AI 驱动的问答搜索引擎。实时获取最新信息，附带引用来源。',
        source: 'producthunt',
        sourceName: 'Product Hunt',
        tags: ['ai-search', 'research', 'knowledge'],
        metadata: { upvotes: 5200, comments: 450 },
        collectedAt: new Date().toISOString()
      }
    ];

    return mockCases.slice(0, limit);
  }

  /**
   * 从 Twitter 采集
   */
  private async collectFromTwitter(keywords: string[], limit: number): Promise<CollectedCase[]> {
    // 模拟 Twitter API 采集
    // 实际实现需要 Twitter API v2
    const mockCases: CollectedCase[] = [
      {
        id: 'tw-1',
        title: 'Multi-Agent Orchestration 成为热点',
        description: '多个 AI Agent 协作解决复杂任务的工作模式正在兴起。Sam Altman 等大佬都在关注。',
        source: 'twitter',
        sourceName: 'Twitter',
        tags: ['multi-agent', 'orchestration', 'trending'],
        metadata: { likes: 1200, retweets: 450 },
        collectedAt: new Date().toISOString()
      },
      {
        id: 'tw-2',
        title: 'Anthropic Computer Use 发布',
        description: 'Anthropic 推出让 AI 控制计算机的技术突破，可以操作浏览器、文件系统。',
        source: 'twitter',
        sourceName: 'Twitter',
        tags: ['computer-use', 'anthropic', 'breakthrough'],
        metadata: { likes: 2500, retweets: 890 },
        collectedAt: new Date().toISOString()
      },
      {
        id: 'tw-3',
        title: 'Agentic Workflow 在企业落地',
        description: '越来越多企业开始采用 Agentic Workflow 来自动化业务流程。',
        source: 'twitter',
        sourceName: 'Twitter',
        tags: ['agentic-workflow', 'enterprise', 'automation'],
        metadata: { likes: 890, retweets: 230 },
        collectedAt: new Date().toISOString()
      },
      {
        id: 'tw-4',
        title: 'AI Agent 安全问题受关注',
        description: 'AI Agent 的安全性和可控性成为讨论热点，需要建立防护机制。',
        source: 'twitter',
        sourceName: 'Twitter',
        tags: ['ai-safety', 'security', 'agent'],
        metadata: { likes: 1100, retweets: 340 },
        collectedAt: new Date().toISOString()
      }
    ];

    return mockCases.slice(0, limit);
  }

  /**
   * 从 Reddit 采集
   */
  private async collectFromReddit(keywords: string[], limit: number): Promise<CollectedCase[]> {
    // 模拟 Reddit API 采集
    const mockCases: CollectedCase[] = [
      {
        id: 'rd-1',
        title: 'r/ChatGPT 讨论：最佳 AI Agent 工具',
        description: 'Reddit 用户分享他们使用的 AI Agent 工具推荐，涵盖编程、写作、自动化等场景。',
        source: 'reddit',
        sourceName: 'Reddit',
        url: 'https://reddit.com/r/ChatGPT',
        tags: ['discussion', 'tools', 'recommendations'],
        metadata: { upvotes: 1500, comments: 89 },
        collectedAt: new Date().toISOString()
      },
      {
        id: 'rd-2',
        title: 'r/Artificial 讨论：AI Agent 实际应用案例',
        description: '分享 AI Agent 在各行业的实际落地案例，包括客服、数据分析、内容创作等。',
        source: 'reddit',
        sourceName: 'Reddit',
        url: 'https://reddit.com/r/Artificial',
        tags: ['use-cases', 'real-world', 'industry'],
        metadata: { upvotes: 2100, comments: 156 },
        collectedAt: new Date().toISOString()
      },
      {
        id: 'rd-3',
        title: 'r/MachineLearning 讨论：Agent 架构设计',
        description: '关于 AI Agent 系统架构设计的深度讨论，包括记忆、工具使用、规划等模块。',
        source: 'reddit',
        sourceName: 'Reddit',
        tags: ['architecture', 'design', 'technical'],
        metadata: { upvotes: 980, comments: 67 },
        collectedAt: new Date().toISOString()
      }
    ];

    return mockCases.slice(0, limit);
  }

  /**
   * 从 GitHub 采集
   */
  private async collectFromGitHub(keywords: string[], limit: number): Promise<CollectedCase[]> {
    // 模拟 GitHub API 采集
    const mockCases: CollectedCase[] = [
      {
        id: 'gh-1',
        title: 'OpenManus - Universal AI Agent',
        description: '通用型 AI Agent，支持浏览器自动化、代码生成、文件处理等多种能力。',
        source: 'github',
        sourceName: 'GitHub',
        url: 'https://github.com/manus-ai/openmanus',
        tags: ['agent', 'automation', 'open-source'],
        metadata: { stars: 12500, forks: 890 },
        collectedAt: new Date().toISOString()
      },
      {
        id: 'gh-2',
        title: 'AgentKit - Enterprise Agent Framework',
        description: '构建企业级 AI Agent 的开发框架，提供丰富的工具和组件。',
        source: 'github',
        sourceName: 'GitHub',
        tags: ['framework', 'enterprise', 'developer-tools'],
        metadata: { stars: 8200, forks: 560 },
        collectedAt: new Date().toISOString()
      },
      {
        id: 'gh-3',
        title: 'AutoGen - Microsoft Multi-Agent Framework',
        description: '微软推出的多 Agent 协作框架，支持自定义 Agent 行为和交互。',
        source: 'github',
        sourceName: 'GitHub',
        url: 'https://github.com/microsoft/autogen',
        tags: ['microsoft', 'multi-agent', 'framework'],
        metadata: { stars: 28000, forks: 3200 },
        collectedAt: new Date().toISOString()
      },
      {
        id: 'gh-4',
        title: 'LangGraph - Agent Workflow Library',
        description: 'LangChain 生态的 Agent 工作流库，支持复杂的 Agent 编排。',
        source: 'github',
        sourceName: 'GitHub',
        tags: ['langchain', 'workflow', 'orchestration'],
        metadata: { stars: 15000, forks: 1800 },
        collectedAt: new Date().toISOString()
      },
      {
        id: 'gh-5',
        title: 'Devin AI - AI Software Engineer',
        description: 'Cognition Labs 的 AI 软件工程师概念，能自主完成软件开发任务。',
        source: 'github',
        sourceName: 'GitHub',
        tags: ['ai-engineer', 'coding', 'devin'],
        metadata: { stars: 9800, forks: 720 },
        collectedAt: new Date().toISOString()
      }
    ];

    return mockCases.slice(0, limit);
  }

  /**
   * 过滤和去重
   */
  private filterAndDeduplicate(cases: CollectedCase[]): CollectedCase[] {
    const seen = new Set<string>();
    return cases.filter(c => {
      const key = c.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

// 导出单例
export const sourceCollectorAgent = new SourceCollectorAgent();
