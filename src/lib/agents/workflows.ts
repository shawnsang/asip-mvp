/**
 * Agent Workflows
 * Agent 工作流 - 协调多个 Agent 完成复杂任务
 */

import {
  trendFinderAgent,
  sourceCollectorAgent,
  sceneTranslatorAgent,
  insightSummarizerAgent,
  salesScriptGeneratorAgent,
  valuePropositionAgent,
  dataIngestionAgent
} from './index';
import { AgentInput } from './types';

/**
 * 执行脑力风暴流程
 * 完整的脑力风暴工作流：趋势发现 → 数据采集 → 场景转化 → 洞察生成 → 话术生成 → 数据入库
 */
export async function runBrainstormFlow(params: {
  query: string;
  industry?: string;
  timeRange?: string;
  autoIngest?: boolean; // 是否自动入库
}): Promise<any> {
  const { query, industry, timeRange = '7d', autoIngest = true } = params;

  // Step 1: 趋势发现
  console.log('[BrainstormFlow] Step 1: 趋势发现...');
  const trendResult = await trendFinderAgent.execute({
    task: query,
    params: { timeRange }
  });

  if (!trendResult.success) {
    throw new Error('趋势发现失败: ' + trendResult.error);
  }

  // Step 2: 数据采集
  console.log('[BrainstormFlow] Step 2: 数据采集...');
  const collectResult = await sourceCollectorAgent.execute({
    task: query,
    params: {
      sources: ['producthunt', 'twitter', 'reddit', 'github'],
      keywords: ['ai agent', 'automation', 'copilot'],
      limit: 20
    }
  });

  if (!collectResult.success) {
    console.warn('[BrainstormFlow] 数据采集失败，使用默认数据');
  }

  // Step 3: 场景转化
  console.log('[BrainstormFlow] Step 3: 场景转化...');
  const sceneResult = await sceneTranslatorAgent.execute({
    task: query,
    params: {
      cases: collectResult.data?.cases || [],
      industry
    }
  });

  if (!sceneResult.success) {
    console.warn('[BrainstormFlow] 场景转化失败');
  }

  // Step 4: 洞察生成
  console.log('[BrainstormFlow] Step 4: 洞察生成...');
  const insightResult = await insightSummarizerAgent.execute({
    task: query,
    params: {
      trends: trendResult.data?.trends || [],
      scenes: sceneResult.data?.scenes || [],
      context: { query, industry }
    }
  });

  if (!insightResult.success) {
    throw new Error('洞察生成失败: ' + insightResult.error);
  }

  // Step 5: 销售话术生成
  console.log('[BrainstormFlow] Step 5: 销售话术生成...');
  const scene = sceneResult.data?.scenes?.[0];
  const scriptResult = await salesScriptGeneratorAgent.execute({
    task: '生成销售话术',
    params: {
      type: 'cold_call',
      scene,
      customer: { industry: industry || '通用', companySize: '中大型', role: '决策者' }
    }
  });

  // Step 6: 价值主张生成
  console.log('[BrainstormFlow] Step 6: 价值主张生成...');
  const valueResult = await valuePropositionAgent.execute({
    task: '生成价值主张',
    params: {
      scene,
      customer: { industry: industry || '通用' }
    }
  });

  // Step 7: 数据入库（新增）
  let ingestionResult = null;
  if (autoIngest) {
    console.log('[BrainstormFlow] Step 7: 数据入库...');
    ingestionResult = await ingestBrainstormData({
      trends: trendResult.data?.trends || [],
      cases: collectResult.data?.cases || [],
      scenes: sceneResult.data?.scenes || []
    });
  }

  // 汇总结果
  return {
    success: true,
    data: {
      trends: trendResult.data,
      cases: collectResult.data?.cases,
      scenes: sceneResult.data?.scenes,
      insights: insightResult.data,
      salesScript: scriptResult.data,
      valueProposition: valueResult.data,
      suggestions: sceneResult.data?.suggestions,
      ingestion: ingestionResult
    },
    metadata: {
      steps: ['trend', 'collect', 'translate', 'insight', 'script', 'value', 'ingest'],
      timestamp: new Date().toISOString(),
      autoIngest
    }
  };
}

/**
 * 执行数据入库
 * 将脑力风暴收集的数据导入知识图谱
 */
async function ingestBrainstormData(data: {
  trends: any[];
  cases: any[];
  scenes: any[];
}): Promise<any> {
  const results = {
    trends: { nodesCreated: 0, edgesCreated: 0 },
    cases: { nodesCreated: 0, edgesCreated: 0 },
    scenes: { nodesCreated: 0, edgesCreated: 0 }
  };

  // 导入趋势数据
  if (data.trends?.length > 0) {
    const trendIngest = await dataIngestionAgent.execute({
      task: '导入趋势数据',
      params: { data: data.trends, dataType: 'trends' }
    });
    if (trendIngest.success) {
      results.trends = trendIngest.data?.ingestion || {};
    }
  }

  // 导入案例数据
  if (data.cases?.length > 0) {
    const caseIngest = await dataIngestionAgent.execute({
      task: '导入案例数据',
      params: { data: data.cases, dataType: 'cases' }
    });
    if (caseIngest.success) {
      results.cases = caseIngest.data?.ingestion || {};
    }
  }

  // 导入场景数据
  if (data.scenes?.length > 0) {
    const sceneIngest = await dataIngestionAgent.execute({
      task: '导入场景数据',
      params: { data: data.scenes, dataType: 'scenes' }
    });
    if (sceneIngest.success) {
      results.scenes = sceneIngest.data?.ingestion || {};
    }
  }

  const totalNodes = results.trends.nodesCreated + results.cases.nodesCreated + results.scenes.nodesCreated;
  const totalEdges = results.trends.edgesCreated + results.cases.edgesCreated + results.scenes.edgesCreated;

  console.log(`[BrainstormFlow] 数据入库完成: ${totalNodes} 个节点, ${totalEdges} 个关联`);

  return {
    totalNodes,
    totalEdges,
    byType: results
  };
}

/**
 * 执行案例搜索流程
 */
export async function runCaseSearchFlow(params: {
  keyword: string;
  industry?: string;
  limit?: number;
}): Promise<any> {
  const { keyword, industry, limit = 10 } = params;

  // 数据采集
  const collectResult = await sourceCollectorAgent.execute({
    task: keyword,
    params: {
      keywords: [keyword],
      limit
    }
  });

  // 场景转化
  const sceneResult = await sceneTranslatorAgent.execute({
    task: keyword,
    params: {
      cases: collectResult.data?.cases || [],
      industry
    }
  });

  return {
    success: true,
    data: {
      cases: collectResult.data?.cases,
      scenes: sceneResult.data?.scenes
    }
  };
}

/**
 * 执行销售话术生成流程
 */
export async function runSalesScriptFlow(params: {
  scene?: any;
  caseInfo?: any;
  customer: {
    industry: string;
    companySize?: string;
    role?: string;
  };
  type?: 'cold_call' | 'follow_up' | 'demo' | 'objection_handling' | 'closing';
}): Promise<any> {
  const { scene, caseInfo, customer, type = 'cold_call' } = params;

  // 生成销售话术
  const scriptResult = await salesScriptGeneratorAgent.execute({
    task: `生成${type}话术`,
    params: {
      type,
      scene,
      caseInfo,
      customer
    }
  });

  // 生成价值主张
  const valueResult = await valuePropositionAgent.execute({
    task: '生成价值主张',
    params: {
      scene,
      customer
    }
  });

  return {
    success: true,
    data: {
      script: scriptResult.data,
      valueProposition: valueResult.data
    }
  };
}
