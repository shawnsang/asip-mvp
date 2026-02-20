/**
 * Value Proposition Agent
 * 价值主张 Agent - 生成价值主张和销售亮点
 */

import { BaseAgentClass } from './base-agent';
import { AgentInput, AgentOutput } from './types';
import { callQwen } from '../llm';

/**
 * 价值主张
 */
interface ValueProposition {
  id: string;
  title: string;
  headline: string;
  supportingPoints: string[];
  proofPoints: string[];
  differentiators: string[];
}

/**
 * Value Proposition Agent
 */
export class ValuePropositionAgent extends BaseAgentClass {
  name = 'ValuePropositionAgent';
  description = '价值主张 Agent - 生成价值主张和销售亮点';
  capabilities = [
    {
      name: 'generate_value_prop',
      description: '生成价值主张'
    },
    {
      name: 'create_proof_points',
      description: '创建信任背书'
    },
    {
      name: 'differentiate_competitors',
      description: '竞品差异化分析'
    }
  ];

  /**
   * 执行价值主张生成
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    try {
      const scene = input.params?.scene;
      const customer = input.params?.customer;
      const caseInfo = input.params?.caseInfo;

      // 1. 分析客户需求
      const needs = this.analyzeNeeds(scene, customer);

      // 2. 生成核心价值主张
      const mainProp = await this.generateMainProposition(needs, scene, caseInfo);

      // 3. 生成支撑点
      const supportingPoints = await this.generateSupportingPoints(needs, scene);

      // 4. 生成信任背书
      const proofPoints = await this.generateProofPoints(caseInfo);

      // 5. 竞品差异化
      const differentiators = await this.generateDifferentiators(scene);

      return this.successOutput({
        valueProposition: {
          ...mainProp,
          supportingPoints,
          proofPoints,
          differentiators
        },
        metadata: {
          customerIndustry: customer?.industry || scene?.industry || '通用',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      return this.errorOutput(error.message || 'Value proposition generation failed');
    }
  }

  /**
   * 分析客户需求
   */
  private analyzeNeeds(scene: any, customer: any): any {
    return {
      primaryNeed: scene?.useCase || '效率提升',
      industry: customer?.industry || scene?.industry || '通用',
      painPoints: customer?.painPoints || scene?.painPoints || ['运营效率低', '人力成本高'],
      companySize: customer?.companySize || '中大型',
      role: customer?.role || '决策者'
    };
  }

  /**
   * 生成核心价值主张
   */
  private async generateMainProposition(
    needs: any,
    scene: any,
    caseInfo: any
  ): Promise<ValueProposition> {
    const prompt = `你是一个 AI 销售策略专家。请根据以下信息，生成核心价值主张。

客户行业：${needs.industry}
主要需求：${needs.primaryNeed}
客户痛点：${needs.painPoints.join(', ')}

案例信息：
${caseInfo ? JSON.stringify(caseInfo) : '无'}

请生成以下格式的价值主张：

### 核心标题
[一句吸引眼球的标题]

### 主价值主张
[一段阐述核心价值的主张，50字以内]

### 价值维度
- 效率提升：[具体价值]
- 成本降低：[具体价值]
- 质量保证：[具体价值]

请用专业的 B2B 销售语言生成。`;

    const result = await callQwen(prompt, 'qwen-plus');

    return {
      id: 'vp-1',
      title: 'AI Agent 智能解决方案',
      headline: result.match(/### 核心标题[\s\S]*?(?=###|$)/)?.toString() || '智能自动化，提升企业效率',
      supportingPoints: [],
      proofPoints: [],
      differentiators: []
    };
  }

  /**
   * 生成支撑点
   */
  private async generateSupportingPoints(needs: any, scene: any): Promise<string[]> {
    const prompt = `请为 ${needs.industry} 行业的 AI Agent 解决方案生成 5 个价值支撑点。

客户痛点：${needs.painPoints.join(', ')}
使用场景：${needs.primaryNeed}

请用以下格式输出：
["支撑点1", "支撑点2", "支撑点3", "支撑点4", "支撑点5"]

每个支撑点要：
- 简洁有力
- 具体可量化
- 与客户痛点相关

JSON数组格式：`;

    const result = await callQwen(prompt, 'qwen-turbo');
    try {
      const match = result.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (e) {
      console.error('Parse failed:', e);
    }

    return [
      '7×24小时不间断工作，提升服务响应速度',
      '自动化处理重复性任务，释放人力资源',
      '智能分析数据，提供决策支持',
      '快速学习业务知识，上手即用',
      '持续优化迭代，效果不断提升'
    ];
  }

  /**
   * 生成信任背书
   */
  private async generateProofPoints(caseInfo: any): Promise<string[]> {
    const prompt = `请为 AI Agent 产品生成 5 个信任背书点。

案例信息：
${caseInfo ? JSON.stringify(caseInfo) : '无具体案例'}

请考虑：
- 行业认可
- 客户数量
- 效果数据
- 技术实力
- 安全认证

请用以下格式输出：
["背书点1", "背书点2", "背书点3", "背书点4", "背书点5"]

JSON数组格式：`;

    const result = await callQwen(prompt, 'qwen-turbo');
    try {
      const match = result.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (e) {
      console.error('Parse failed:', e);
    }

    return [
      '服务企业客户 500+',
      '平均提升效率 40%',
      '安全认证 ISO27001',
      '7×24 客户支持',
      '专业实施团队'
    ];
  }

  /**
   * 生成竞品差异化
   */
  private async generateDifferentiators(scene: any): Promise<string[]> {
    const prompt = `请为 AI Agent 产品生成 5 个差异化优势。

使用场景：${scene?.useCase || '通用'}

请从以下维度思考：
- 技术优势
- 产品功能
- 行业经验
- 服务能力
- 性价比

请用以下格式输出：
["差异化1", "差异化2", "差异化3", "差异化4", "差异化5"]

JSON数组格式：`;

    const result = await callQwen(prompt, 'qwen-turbo');
    try {
      const match = result.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (e) {
      console.error('Parse failed:', e);
    }

    return [
      '自研核心算法，技术领先',
      '丰富的行业落地经验',
      '灵活的定制化能力',
      '完善的售后服务体系',
      '高性价比，按需付费'
    ];
  }
}

// 导出单例
export const valuePropositionAgent = new ValuePropositionAgent();
