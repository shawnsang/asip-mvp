/**
 * Insight Summarizer Agent
 * 洞察总结 Agent - 生成脑力风暴式的洞察和建议
 */

import { BaseAgentClass } from './base-agent';
import { AgentInput, AgentOutput } from './types';
import { callQwen } from '../llm';

/**
 * 洞察类型
 */
interface Insight {
  id: string;
  category: string;
  title: string;
  content: string;
  confidence: number;
  recommendations: string[];
  actionItems: string[];
}

/**
 * 趋势方向
 */
interface TrendDirection {
  name: string;
  description: string;
  opportunity: 'high' | 'medium' | 'low';
  timeline: string;
  keyPlayers: string[];
}

/**
 * Insight Summarizer Agent
 */
export class InsightSummarizerAgent extends BaseAgentClass {
  name = 'InsightSummarizerAgent';
  description = '洞察总结 Agent - 生成脑力风暴式的洞察和建议';
  capabilities = [
    {
      name: 'generate_insights',
      description: '生成洞察和建议'
    },
    {
      name: 'analyze_trends',
      description: '分析趋势方向'
    },
    {
      name: 'brainstorm_opportunities',
      description: '脑力风暴发现新机会'
    }
  ];

  /**
   * 执行洞察生成
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    try {
      const trends = input.params?.trends || [];
      const scenes = input.params?.scenes || [];
      const context = input.params?.context || {};

      // 1. 分析趋势
      const trendInsights = await this.analyzeTrends(trends);

      // 2. 分析场景
      const sceneInsights = await this.analyzeScenes(scenes);

      // 3. 识别机会
      const opportunities = await this.identifyOpportunities(
        trendInsights,
        sceneInsights
      );

      // 4. 生成综合洞察
      const comprehensiveInsights = await this.generateComprehensiveInsights({
        trends: trendInsights,
        scenes: sceneInsights,
        opportunities
      });

      // 5. 生成行动建议
      const actionRecommendations = await this.generateActionRecommendations(
        opportunities,
        context
      );

      return this.successOutput({
        insights: comprehensiveInsights,
        opportunities,
        recommendations: actionRecommendations,
        metadata: {
          trendsAnalyzed: trends.length,
          scenesAnalyzed: scenes.length,
          opportunitiesIdentified: opportunities.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      return this.errorOutput(error.message || 'Insight generation failed');
    }
  }

  /**
   * 分析趋势
   */
  private async analyzeTrends(trends: any[]): Promise<TrendDirection[]> {
    if (!trends || trends.length === 0) {
      // 返回默认趋势分析
      return this.getDefaultTrendInsights();
    }

    const prompt = `你是一个 AI 行业趋势分析师。请分析以下 AI Agent 趋势数据，识别关键趋势方向。

趋势数据：
${JSON.stringify(trends, null, 2)}

请返回以下格式的 JSON 数组：
[{
  "name": "趋势名称",
  "description": "趋势描述",
  "opportunity": "high/medium/low",
  "timeline": "短期/中期/长期",
  "keyPlayers": ["关键玩家1", "关键玩家2"]
}]

JSON输出：`;

    try {
      const result = await callQwen(prompt, 'qwen-plus');
      const jsonMatch = result.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Trend analysis failed:', error);
    }

    return this.getDefaultTrendInsights();
  }

  /**
   * 获取默认趋势洞察
   */
  private getDefaultTrendInsights(): TrendDirection[] {
    return [
      {
        name: 'Browser Agent - 浏览器自动化',
        description: 'AI Agent 能够控制浏览器自动执行操作，如数据抓取、表单填写、报表生成等',
        opportunity: 'high',
        timeline: '短期',
        keyPlayers: ['Anthropic', 'OpenManus', 'BrowserGPT']
      },
      {
        name: 'Code Agent - AI 编程助手',
        description: 'AI Agent 能自主完成代码编写、调试、重构等开发任务',
        opportunity: 'high',
        timeline: '短期',
        keyPlayers: ['Cursor', 'Devin', 'Replit Agent', 'v0']
      },
      {
        name: 'Multi-Agent 协作系统',
        description: '多个 AI Agent 协同工作，解决复杂问题',
        opportunity: 'high',
        timeline: '中期',
        keyPlayers: ['AutoGen', 'LangGraph', 'CrewAI']
      },
      {
        name: '垂直领域 Agent',
        description: '针对特定行业（法律、医疗、金融）的专业 AI Agent',
        opportunity: 'high',
        timeline: '中期',
        keyPlayers: ['各类垂直 AI 公司']
      },
      {
        name: 'Agent + RAG 融合',
        description: 'RAG 技术与 Agent 结合，实现知识增强的智能代理',
        opportunity: 'medium',
        timeline: '短期',
        keyPlayers: ['各大 LLM 厂商']
      },
      {
        name: 'Agentic Workflow',
        description: '基于 Agent 的企业工作流自动化',
        opportunity: 'high',
        timeline: '短期',
        keyPlayers: ['Dify', 'Coze', 'Flowise']
      }
    ];
  }

  /**
   * 安全解析 JSON
   */
  private safeJsonParse(text: string): any | null {
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      // 尝试直接解析
      return JSON.parse(text);
    } catch (error) {
      console.error('JSON parse failed:', error);
      return null;
    }
  }

  /**
   * 分析场景
   */
  private async analyzeScenes(scenes: any[]): Promise<any[]> {
    if (!scenes || scenes.length === 0) {
      return [];
    }

    const prompt = `你是一个业务场景分析师。请分析以下业务场景，提取关键洞察。

场景数据：
${JSON.stringify(scenes.slice(0, 10), null, 2)}

请返回分析结果，包含：
- 各场景的核心价值
- 行业适配度
- 实施复杂度
- 市场潜力

JSON格式输出。

JSON输出：`;

    try {
      const result = await callQwen(prompt, 'qwen-plus');
      const parsed = this.safeJsonParse(result);
      if (parsed) {
        return parsed;
      }
    } catch (error) {
      console.error('Scene analysis failed:', error);
    }

    // 返回原始场景作为降级
    return scenes;
  }

  /**
   * 识别机会
   */
  private async identifyOpportunities(
    trends: TrendDirection[],
    scenes: any[]
  ): Promise<any[]> {
    const opportunities = [];

    // 从高机会趋势识别机会
    for (const trend of trends) {
      if (trend.opportunity === 'high') {
        opportunities.push({
          id: `opp-${trend.name}`,
          trend: trend.name,
          description: trend.description,
          opportunity: trend.opportunity,
          timeline: trend.timeline,
          keyPlayers: trend.keyPlayers,
          actions: this.getRecommendedActions(trend.name)
        });
      }
    }

    return opportunities;
  }

  /**
   * 获取推荐行动
   */
  private getRecommendedActions(trendName: string): string[] {
    const actionMap: Record<string, string[]> = {
      'Browser Agent - 浏览器自动化': [
        '调研电商运营团队需求',
        '寻找数据采集场景客户',
        '展示自动化效率提升案例'
      ],
      'Code Agent - AI 编程助手': [
        '接触研发团队负责人',
        '提供免费试用机会',
        '展示代码生成效率数据'
      ],
      'Multi-Agent 协作系统': [
        '寻找复杂流程企业',
        '展示多 Agent 协作价值',
        '提供定制化解决方案'
      ],
      '垂直领域 Agent': [
        '深耕特定行业客户',
        '建立行业知识库',
        '提供专业解决方案'
      ]
    };

    return actionMap[trendName] || [
      '深入了解客户需求',
      '寻找切入点',
      '建立试点项目'
    ];
  }

  /**
   * 生成综合洞察
   */
  private async generateComprehensiveInsights(data: any): Promise<string> {
    const prompt = `你是一个 AI 行业顾问和脑力风暴专家。请根据以下分析数据，生成专业的脑力风暴式洞察报告。

趋势分析：
${JSON.stringify(data.trends, null, 2)}

场景分析：
${JSON.stringify(data.scenes, null, 2)}

机会识别：
${JSON.stringify(data.opportunities, null, 2)}

请生成以下格式的脑力风暴报告：

---

## 🧠 【AI Agent 脑力风暴 - 洞察报告】

### 📊 一、核心趋势发现

#### 1. [趋势名称]
- 描述：[描述]
- 机会等级：⭐⭐⭐⭐⭐
- 时间窗口：[时间]
- 关键玩家：[玩家列表]

### 🎯 二、高价值机会

1. [机会#### 名称]
- 来源：[来自哪个趋势]
- 客户价值：[价值描述]
- 建议行动：[行动列表]

### 💡 三、脑力风暴建议

#### 建议关注的新方向
1. [方向1]
2. [方向2]
3. [方向3]

#### 近期可执行的动作
1. [动作1]
2. [动作2]

---

请基于以上数据生成专业、有洞察力的报告。`;

    try {
      return await callQwen(prompt, 'qwen-plus');
    } catch (error) {
      return '洞察报告生成失败';
    }
  }

  /**
   * 生成行动建议
   */
  private async generateActionRecommendations(
    opportunities: any[],
    context: any
  ): Promise<string[]> {
    const recommendations = [];

    // 基于机会生成推荐行动
    for (const opp of opportunities.slice(0, 3)) {
      if (opp.actions) {
        recommendations.push(...opp.actions);
      }
    }

    // 添加通用行动建议
    recommendations.push(
      '深入了解客户具体业务场景',
      '准备针对不同行业的解决方案',
      '建立典型案例库和成功故事',
      '培训销售团队掌握新技术话术'
    );

    return Array.from(new Set(recommendations)).slice(0, 10);
  }
}

// 导出单例
export const insightSummarizerAgent = new InsightSummarizerAgent();
