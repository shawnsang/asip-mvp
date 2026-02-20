/**
 * Agent RAG Service
 * Agent RAG 服务 - 从知识图谱检索并增强回答
 */

import { supabase } from './supabase';
import { callQwen } from './llm';
import axios from 'axios';

/**
 * RAG 配置
 */
const RAG_CONFIG = {
  embeddingModel: 'text-embedding-3-small',
  matchThreshold: 0.7,
  matchCount: 5,
  maxContextLength: 4000
};

/**
 * 检索结果
 */
export interface RetrievalResult {
  id: string;
  type: 'case' | 'trend' | 'scenario';
  title: string;
  description: string;
  content: string;
  source: string;
  sourceUrl?: string;
  metadata: Record<string, any>;
  similarity: number;
}

/**
 * RAG 回答结果
 */
export interface RAGResponse {
  answer: string;
  sources: SourceReference[];
  metadata: {
    retrievedCount: number;
    contextLength: number;
    usedCache: boolean;
  };
}

/**
 * 来源引用
 */
export interface SourceReference {
  title: string;
  url?: string;
  type: string;
  relevance: number;
}

/**
 * 文本嵌入向量
 */
async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error('DASHSCOPE_API_KEY not configured');
  }

  try {
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding',
      {
        model: RAG_CONFIG.embeddingModel,
        input: text
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.output.embeddings[0].embedding;
  } catch (error: any) {
    console.error('Embedding error:', error.message);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * 向量相似度搜索
 */
async function vectorSearch(
  queryEmbedding: number[],
  options: {
    table: string;
    matchCount?: number;
    filter?: Record<string, any>;
  }
): Promise<any[]> {
  const { table, matchCount = 5, filter } = options;

  try {
    // 尝试使用 Supabase Vector
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: RAG_CONFIG.matchThreshold,
      match_count: matchCount,
      table_name: table
    });

    if (error) {
      console.log('Vector search not available, using text search fallback');
      return await textSearchFallback(queryEmbedding, table, matchCount);
    }

    return data || [];
  } catch (error) {
    console.log('Using fallback search');
    return await textSearchFallback(queryEmbedding, table, matchCount);
  }
}

/**
 * 文本搜索降级方案
 */
async function textSearchFallback(
  queryEmbedding: number[],
  table: string,
  matchCount: number
): Promise<any[]> {
  // 提取查询关键词
  const keywords = extractKeywords(queryEmbedding.toString());

  let query = supabase
    .from(table)
    .select('*')
    .order('quality_score', { ascending: false })
    .limit(matchCount);

  // 添加关键词过滤
  if (keywords.length > 0) {
    query = query.or(`description.ilike.%${keywords[0]}%,project_name.ilike.%${keywords[0]}%,title.ilike.%${keywords[0]}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Search error:', error);
    return [];
  }

  return data || [];
}

/**
 * 提取关键词
 */
function extractKeywords(text: string): string[] {
  const stopWords = ['的', '了', '和', '是', '在', '有', '我', '你', '他', '她', '它', '们', '这', '那', '什', '么', '如何', '怎么', '什么', 'the', 'a', 'an', 'is', 'are', 'of', 'in', 'on'];
  const words = text.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w.toLowerCase()));
  return Array.from(new Set(words)).slice(0, 5);
}

/**
 * 构建上下文
 */
function buildContext(results: RetrievalResult[]): string {
  return results.map((r, i) => {
    return `[${i + 1}] ${r.title}
来源: ${r.source}${r.sourceUrl ? ' - ' + r.sourceUrl : ''}
内容: ${r.content.slice(0, 500)}
---`;
  }).join('\n\n');
}

/**
 * 从数据库检索
 */
export async function retrieveFromDatabase(
  query: string,
  options: {
    types?: ('case' | 'trend' | 'scenario')[];
    industry?: string;
    limit?: number;
  } = {}
): Promise<RetrievalResult[]> {
  const { types = ['case', 'scenario'], industry, limit = 5 } = options;

  try {
    // 获取嵌入向量
    const embedding = await getEmbedding(query);

    const allResults: RetrievalResult[] = [];

    // 并发检索不同类型
    const searchPromises = types.map(async (type) => {
      const table = type === 'case' ? 'cases' : type === 'scenario' ? 'scenarios' : 'trends';

      let queryBuilder = supabase
        .from(table)
        .select('*')
        .order('quality_score', { ascending: false })
        .limit(limit);

      // 行业过滤
      if (industry) {
        queryBuilder = queryBuilder.eq('industry', industry);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        console.error(`Search ${table} error:`, error);
        return [];
      }

      // 计算相似度（简化版：基于关键词匹配）
      return (data || []).map(row => ({
        id: row.id,
        type,
        title: row.project_name || row.title || row.name,
        description: row.description || row.use_case || '',
        content: row.description || row.use_case || row.outcome || '',
        source: row.source || table,
        sourceUrl: row.source_url || row.url,
        metadata: {
          industry: row.industry,
          useCase: row.use_case,
          painPoints: row.pain_points,
          technology: row.technology
        },
        similarity: calculateSimilarity(query, row.description || '')
      }));
    });

    const results = await Promise.all(searchPromises);
    results.forEach(r => allResults.push(...r));

    // 按相似度排序
    allResults.sort((a, b) => b.similarity - a.similarity);

    return allResults.slice(0, limit);
  } catch (error) {
    console.error('Retrieve error:', error);
    return [];
  }
}

/**
 * 计算相似度（简化版）
 */
function calculateSimilarity(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const textLower = text.toLowerCase();

  let matches = 0;
  for (const word of queryWords) {
    if (word.length > 2 && textLower.includes(word)) {
      matches++;
    }
  }

  return matches / Math.max(queryWords.length, 1);
}

/**
 * Agent RAG 主流程
 */
export async function agentRAG(
  query: string,
  options: {
    mode?: 'brainstorm' | 'case_search' | 'sales_script';
    industry?: string;
    includeTypes?: ('case' | 'trend' | 'scenario')[];
  } = {}
): Promise<RAGResponse> {
  const { mode = 'brainstorm', industry, includeTypes = ['case', 'scenario'] } = options;

  console.log('[AgentRAG] Query:', query);
  console.log('[AgentRAG] Mode:', mode, 'Industry:', industry);

  // 1. 从数据库检索
  const retrieved = await retrieveFromDatabase(query, {
    types: includeTypes,
    industry,
    limit: RAG_CONFIG.matchCount
  });

  console.log('[AgentRAG] Retrieved:', retrieved.length, 'documents');

  // 2. 构建上下文
  const context = buildContext(retrieved);
  const contextLength = context.length;

  // 3. LLM 生成
  let systemPrompt = '';

  if (mode === 'brainstorm') {
    systemPrompt = `你是一个 AI 销售顾问和行业分析师。请基于以下案例库数据，回答用户问题。

要求：
1. 每个观点必须基于提供的案例
2. 提及具体案例时必须标注来源
3. 重点关注行业场景、客户痛点、实施效果`;

    if (retrieved.length > 0) {
      systemPrompt += `\n\n案例库数据：\n${context}`;
    } else {
      systemPrompt += `\n\n案例库暂无相关数据，请基于你的专业知识回答，但需说明"该观点为通用建议，非基于具体案例"。`;
    }
  } else if (mode === 'case_search') {
    systemPrompt = `你是一个案例搜索助手。请从以下案例中找到最相关的案例推荐给用户。

要求：
1. 根据用户需求匹配合适的案例
2. 列出案例的关键信息
3. 说明为什么这个案例相关

案例库：\n${context || '暂无数据'}`;
  } else {
    systemPrompt = `你是一个销售助手。请基于以下案例生成销售话术。

要求：
1. 引用具体案例增强说服力
2. 突出客户痛点和解决方案
3. 包含价值主张和行动号召

案例库：\n${context || '暂无数据'}`;
  }

  try {
    const answer = await callQwen(`${systemPrompt}\n\n用户问题：${query}\n\n回答：`);

    // 4. 构建来源引用
    const sources: SourceReference[] = retrieved.map(r => ({
      title: r.title,
      url: r.sourceUrl,
      type: r.type,
      relevance: r.similarity
    }));

    return {
      answer,
      sources,
      metadata: {
        retrievedCount: retrieved.length,
        contextLength,
        usedCache: false
      }
    };
  } catch (error: any) {
    console.error('[AgentRAG] LLM error:', error.message);
    return {
      answer: '抱歉，生成回答时出现问题。请稍后重试。',
      sources: [],
      metadata: {
        retrievedCount: retrieved.length,
        contextLength,
        usedCache: false
      }
    };
  }
}

export default {
  agentRAG,
  retrieveFromDatabase
};
