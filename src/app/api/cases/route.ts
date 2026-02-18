import { NextResponse } from 'next/server';
import { caseDb } from '@/lib/db';

// 获取案例列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const industry = searchParams.get('industry');
    const useCase = searchParams.get('useCase');
    const keyword = searchParams.get('keyword');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let data;

    if (keyword) {
      // 搜索案例
      data = await caseDb.searchCases(keyword, limit);
    } else {
      // 获取案例列表
      data = await caseDb.getCases({
        industry: industry || undefined,
        useCase: useCase || undefined,
        limit,
        offset,
      });
    }

    // 如果没有数据，返回示例数据
    if (!data || data.length === 0) {
      return NextResponse.json({
        data: getSampleCases(),
        total: getSampleCases().length,
        message: 'Using sample data (Supabase not configured)',
      });
    }

    return NextResponse.json({
      data,
      total: data.length,
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// 示例数据（当数据库未配置时使用）
function getSampleCases() {
  return [
    {
      id: '1',
      project_name: 'AutoGPT',
      industry: '通用',
      use_case: 'AI 助手',
      pain_point: '需要自动化完成复杂任务',
      technology: ['GPT-4', 'LangChain', 'Python'],
      outcome: '自主完成多步骤任务的AI代理',
      source: 'GitHub',
      source_url: 'https://github.com/Significant-Gravitas/AutoGPT',
      quality_score: 0.95,
    },
    {
      id: '2',
      project_name: 'LangChain',
      industry: '通用',
      use_case: 'LLM应用开发',
      pain_point: '构建LLM应用困难',
      technology: ['Python', 'LLM', 'RAG', 'Vector DB'],
      outcome: '简化LLM应用开发框架',
      source: 'GitHub',
      source_url: 'https://github.com/langchain-ai/langchain',
      quality_score: 0.92,
    },
    {
      id: '3',
      project_name: 'BrowserGPT',
      industry: '通用',
      use_case: '浏览器自动化',
      pain_point: '重复性浏览器操作耗时',
      technology: ['Playwright', 'GPT-4', 'Node.js'],
      outcome: 'AI驱动的浏览器自动化',
      source: 'GitHub',
      source_url: 'https://github.com/agents-ai/browser-gpt',
      quality_score: 0.85,
    },
    {
      id: '4',
      project_name: 'ChatGPT-Next-Web',
      industry: '通用',
      use_case: '智能客服',
      pain_point: '需要定制化ChatGPT界面',
      technology: ['Next.js', 'ChatGPT API', 'Vercel'],
      outcome: '一键部署私人ChatGPT应用',
      source: 'GitHub',
      source_url: 'https://github.com/ChatGPTNextWeb/ChatGPT-Next-Web',
      quality_score: 0.88,
    },
    {
      id: '5',
      project_name: 'DocTer',
      industry: '医疗',
      use_case: '医疗文档处理',
      pain_point: '医疗文档处理效率低',
      technology: ['OCR', 'LLM', 'Python'],
      outcome: '自动化医疗文档处理与分析',
      source: 'GitHub',
      source_url: 'https://github.com/medical-ai/doc-ter',
      quality_score: 0.78,
    },
    {
      id: '6',
      project_name: 'FinGPT',
      industry: '金融',
      use_case: '金融分析',
      pain_point: '金融数据分析耗时',
      technology: ['LLM', 'Python', 'Pandas'],
      outcome: '开源金融大语言模型',
      source: 'GitHub',
      source_url: 'https://github.com/AI4Finance-Foundation/FinGPT',
      quality_score: 0.82,
    },
    {
      id: '7',
      project_name: 'ShopBot',
      industry: '零售',
      use_case: '电商客服',
      pain_point: '电商客服成本高',
      technology: ['GPT-4', 'RAG', 'E-commerce API'],
      outcome: '智能电商客服机器人',
      source: 'GitHub',
      source_url: 'https://github.com/retail-ai/shop-bot',
      quality_score: 0.75,
    },
    {
      id: '8',
      project_name: 'EduMate',
      industry: '教育',
      use_case: '智能辅导',
      pain_point: '个性化辅导成本高',
      technology: ['LLM', 'RAG', 'Python'],
      outcome: 'AI驱动的个性化学习助手',
      source: 'GitHub',
      source_url: 'https://github.com/education-ai/edu-mate',
      quality_score: 0.71,
    },
  ];
}
