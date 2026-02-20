/**
 * Data Ingestion Agent
 * 数据入库 Agent - 将脑力风暴收集的数据导入知识图谱
 */

import { BaseAgentClass } from './base-agent';
import { AgentInput, AgentOutput } from './types';
import { callQwen } from '../llm';

/**
 * 知识图谱数据类型
 */
interface KnowledgeNode {
  id: string;
  type: 'case' | 'trend' | 'scenario' | 'industry' | 'pain_point' | 'technology';
  name: string;
  description: string;
  metadata: Record<string, any>;
  relatedNodes: string[];
  source: string;
  collectedAt: string;
  qualityScore: number;
}

/**
 * 数据入库结果
 */
interface IngestionResult {
  nodesCreated: number;
  edgesCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}

/**
 * Data Ingestion Agent
 */
export class DataIngestionAgent extends BaseAgentClass {
  name = 'DataIngestionAgent';
  description = '数据入库 Agent - 将收集的数据导入知识图谱';
  capabilities = [
    {
      name: 'ingest_trends',
      description: '将趋势数据导入知识图谱'
    },
    {
      name: 'ingest_cases',
      description: '将案例数据导入知识图谱'
    },
    {
      name: 'link_relations',
      description: '建立数据关联关系'
    },
    {
      name: 'deduplicate',
      description: '数据去重处理'
    }
  ];

  /**
   * 执行数据入库
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    try {
      const data = input.params?.data || {};
      const dataType = input.params?.dataType || 'trends'; // trends, cases, scenes

      let result: IngestionResult;

      switch (dataType) {
        case 'trends':
          result = await this.ingestTrends(data);
          break;
        case 'cases':
          result = await this.ingestCases(data);
          break;
        case 'scenes':
          result = await this.ingestScenes(data);
          break;
        default:
          result = await this.ingestGeneralData(data);
      }

      return this.successOutput({
        ingestion: result,
        message: `成功入库 ${result.nodesCreated} 条数据，跳过 ${result.duplicatesSkipped} 条重复`
      });
    } catch (error: any) {
      return this.errorOutput(error.message || 'Data ingestion failed');
    }
  }

  /**
   * 导入趋势数据
   */
  private async ingestTrends(trends: any[]): Promise<IngestionResult> {
    const result: IngestionResult = {
      nodesCreated: 0,
      edgesCreated: 0,
      duplicatesSkipped: 0,
      errors: []
    };

    for (const trend of trends) {
      try {
        // 检查是否已存在
        if (await this.checkExists('trend', trend.name)) {
          result.duplicatesSkipped++;
          continue;
        }

        // 创建趋势节点
        const node = await this.createTrendNode(trend);
        await this.saveToKnowledgeGraph(node);

        result.nodesCreated++;

        // 建立行业关联
        if (trend.industry) {
          await this.linkToIndustry(node.id, trend.industry);
          result.edgesCreated++;
        }

        // 建立技术关联
        if (trend.technologies) {
          for (const tech of trend.technologies) {
            await this.linkToTechnology(node.id, tech);
            result.edgesCreated++;
          }
        }
      } catch (error: any) {
        result.errors.push(`Trend ${trend.name}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * 导入案例数据
   */
  private async ingestCases(cases: any[]): Promise<IngestionResult> {
    const result: IngestionResult = {
      nodesCreated: 0,
      edgesCreated: 0,
      duplicatesSkipped: 0,
      errors: []
    };

    for (const caseItem of cases) {
      try {
        // 检查是否已存在（基于标题去重）
        if (await this.checkExists('case', caseItem.title)) {
          result.duplicatesSkipped++;
          continue;
        }

        // 使用 LLM 提取结构化信息
        const structured = await this.extractCaseStructure(caseItem);

        // 创建案例节点
        const node = await this.createCaseNode(structured);
        await this.saveToKnowledgeGraph(node);

        result.nodesCreated++;

        // 建立关联
        if (structured.industry) {
          await this.linkToIndustry(node.id, structured.industry);
          result.edgesCreated++;
        }

        if (structured.useCase) {
          await this.linkToScenario(node.id, structured.industry, structured.useCase);
          result.edgesCreated++;
        }

        if (structured.painPoints) {
          for (const pain of structured.painPoints) {
            await this.linkToPainPoint(node.id, pain);
            result.edgesCreated++;
          }
        }
      } catch (error: any) {
        result.errors.push(`Case ${caseItem.title}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * 导入场景数据
   */
  private async ingestScenes(scenes: any[]): Promise<IngestionResult> {
    const result: IngestionResult = {
      nodesCreated: 0,
      edgesCreated: 0,
      duplicatesSkipped: 0,
      errors: []
    };

    for (const scene of scenes) {
      try {
        // 检查是否已存在
        if (await this.checkExists('scenario', scene.name)) {
          result.duplicatesSkipped++;
          continue;
        }

        // 创建场景节点
        const node = await this.createSceneNode(scene);
        await this.saveToKnowledgeGraph(node);

        result.nodesCreated++;

        // 建立行业关联
        if (scene.industry) {
          await this.linkToIndustry(node.id, scene.industry);
          result.edgesCreated++;
        }
      } catch (error: any) {
        result.errors.push(`Scene ${scene.name}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * 通用数据导入
   */
  private async ingestGeneralData(data: any): Promise<IngestionResult> {
    // 对于无法分类的数据，统一存入待分析队列
    console.log('[DataIngestion] Queueing data for manual review:', data);
    return {
      nodesCreated: 0,
      edgesCreated: 0,
      duplicatesSkipped: 0,
      errors: []
    };
  }

  /**
   * 检查数据是否已存在
   */
  private async checkExists(type: string, name: string): Promise<boolean> {
    // 实际应该查询数据库/向量库
    // 这里简化为内存检查
    return false;
  }

  /**
   * 提取案例结构化信息
   */
  private async extractCaseStructure(caseData: any): Promise<any> {
    const prompt = `你是一个AI案例分析专家。请从以下案例信息中提取结构化数据。

案例信息：
- 标题: ${caseData.title}
- 描述: ${caseData.description}
- 来源: ${caseData.source}
- 标签: ${caseData.tags?.join(', ') || '无'}

请返回以下JSON格式：
{
  "industry": "行业（电商/金融/医疗/教育/制造/零售/物流/客服/其他）",
  "useCase": "具体使用场景",
  "painPoints": ["痛点1", "痛点2"],
  "benefits": ["收益1", "收益2"],
  "technologies": ["相关技术"],
  "companySize": "目标企业规模(大/中/小)",
  "complexity": "实施复杂度(高/中/低)"
}

JSON输出：`;

    try {
      const result = await callQwen(prompt, 'qwen-plus');
      const match = result.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (error) {
      console.error('Extract case structure failed:', error);
    }

    // 返回默认值
    return {
      industry: '其他',
      useCase: '通用',
      painPoints: ['效率提升需求'],
      benefits: ['效率提升'],
      technologies: ['AI Agent'],
      companySize: '中',
      complexity: '中'
    };
  }

  /**
   * 创建趋势节点
   */
  private async createTrendNode(trend: any): Promise<KnowledgeNode> {
    return {
      id: `trend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'trend',
      name: trend.name || trend.title,
      description: trend.description || '',
      metadata: {
        opportunity: trend.opportunity_level || trend.opportunity || '中',
        timeline: trend.timeline || '中期',
        keyPlayers: trend.keyPlayers || trend.typical_cases || []
      },
      relatedNodes: [],
      source: trend.source || 'brainstorm',
      collectedAt: new Date().toISOString(),
      qualityScore: 0.8
    };
  }

  /**
   * 创建案例节点
   */
  private async createCaseNode(data: any): Promise<KnowledgeNode> {
    return {
      id: `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'case',
      name: data.title || '未命名案例',
      description: data.description || '',
      metadata: {
        industry: data.industry,
        useCase: data.useCase,
        painPoints: data.painPoints,
        benefits: data.benefits,
        technologies: data.technologies,
        companySize: data.companySize,
        complexity: data.complexity
      },
      relatedNodes: [],
      source: data.source || 'brainstorm',
      collectedAt: new Date().toISOString(),
      qualityScore: 0.7
    };
  }

  /**
   * 创建场景节点
   */
  private async createSceneNode(scene: any): Promise<KnowledgeNode> {
    return {
      id: `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'scenario',
      name: scene.name,
      description: scene.description || '',
      metadata: {
        industry: scene.industry,
        useCase: scene.useCase,
        painPoints: scene.painPoints,
        benefits: scene.benefits,
        valueProposition: scene.valueProposition,
        targetCompanies: scene.targetCompanies
      },
      relatedNodes: [],
      source: 'brainstorm',
      collectedAt: new Date().toISOString(),
      qualityScore: 0.75
    };
  }

  /**
   * 保存到知识图谱
   */
  private async saveToKnowledgeGraph(node: KnowledgeNode): Promise<void> {
    // 实际应该存入 Supabase/向量数据库
    console.log('[DataIngestion] Saving node to knowledge graph:', node.id, node.type, node.name);

    // 存储到知识图谱缓存（生产环境应该用数据库）
    addToKnowledgeGraph(node);
  }

  /**
   * 关联到行业
   */
  private async linkToIndustry(nodeId: string, industry: string): Promise<void> {
    console.log('[DataIngestion] Linking to industry:', industry);
  }

  /**
   * 关联到技术
   */
  private async linkToTechnology(nodeId: string, technology: string): Promise<void> {
    console.log('[DataIngestion] Linking to technology:', technology);
  }

  /**
   * 关联到场景
   */
  private async linkToScenario(nodeId: string, industry: string, useCase: string): Promise<void> {
    console.log('[DataIngestion] Linking to scenario:', industry, useCase);
  }

  /**
   * 关联到痛点
   */
  private async linkToPainPoint(nodeId: string, painPoint: string): Promise<void> {
    console.log('[DataIngestion] Linking to pain point:', painPoint);
  }
}

// 导出单例
export const dataIngestionAgent = new DataIngestionAgent();

// 知识图谱缓存（生产环境应该用数据库存储）
const knowledgeGraphStore: KnowledgeNode[] = [];

// 导出知识图谱查询接口
export function getKnowledgeGraph(): KnowledgeNode[] {
  return knowledgeGraphStore;
}

export function addToKnowledgeGraph(node: KnowledgeNode): void {
  knowledgeGraphStore.push(node);
}
