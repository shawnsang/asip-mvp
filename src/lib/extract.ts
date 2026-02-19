/**
 * LLM 结构化抽取模块
 * 从项目 README 和描述中提取销售相关的结构化信息
 */

import axios from 'axios';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';

/**
 * 调用 Qwen 进行结构化抽取
 */
async function callQwen(prompt: string): Promise<string> {
  if (!DASHSCOPE_API_KEY) {
    throw new Error('DASHSCOPE_API_KEY is not configured');
  }

  try {
    const response = await axios.post(
      `${DASHSCOPE_BASE_URL}/services/aigc/text-generation/generation`,
      {
        model: 'qwen-plus',
        input: {
          prompt: prompt,
        },
        parameters: {
          result_format: 'message',
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.output.choices[0].message.content;
  } catch (error: any) {
    console.error('Qwen API Error:', error.response?.data || error.message);
    throw new Error('Failed to call Qwen API');
  }
}

/**
 * 从项目信息中提取销售相关的结构化数据
 */
export async function extractCaseStructuredData(
  projectName: string,
  description: string,
  readmeContent: string | null,
  topics: string[]
): Promise<any> {
  const content = `
项目名称: ${projectName}
项目描述: ${description}
技术标签: ${topics.join(', ')}
README 内容:
${readmeContent ? readmeContent.substring(0, 5000) : '无 README'}
`.trim();

  const prompt = `你是一个AI Agent案例分析专家，专门为销售团队提取有价值的结构化信息。

请从以下GitHub项目信息中提取销售相关的结构化数据：

${content}

请严格按照以下JSON格式输出，不要添加任何其他内容：
{
  "pain_point": "该项目解决的1-2个核心业务痛点（用中文，30字以内）",
  "solution_approach": "解决方案的核心思路（用中文，50字以内）",
  "business_function": "主要适用的业务功能领域，如：智能客服、流程自动化、数据分析、内容生成、ERP集成等",
  "target_company": "目标企业类型，如：中小企业、大型企业的XX部门等",
  "implementation_complexity": "实施复杂度：低/中/高",
  "competitive_advantage": "1-2个主要竞争优势（用中文，40字以内）",
  "use_case_summary": "一句话总结该项目的典型用例（用中文，60字以内）"
}

JSON输出：`;

  const result = await callQwen(prompt);

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // 验证返回的数据
      return {
        pain_point: parsed.pain_point || '自动化任务处理',
        solution_approach: parsed.solution_approach || 'AI Agent 技术',
        business_function: parsed.business_function || '通用',
        target_company: parsed.target_company || '各行业企业',
        implementation_complexity: parsed.implementation_complexity || '中',
        competitive_advantage: parsed.competitive_advantage || '开源可定制',
        use_case_summary: parsed.use_case_summary || `${projectName} - ${description || 'AI Agent 项目'}`,
      };
    }
    throw new Error('No JSON found in response');
  } catch (error) {
    console.error('Failed to parse structured data:', error);
    // 返回默认值
    return getDefaultStructuredData(projectName, description);
  }
}

/**
 * 获取默认的结构化数据
 */
function getDefaultStructuredData(projectName: string, description: string): any {
  return {
    pain_point: '自动化任务处理效率低',
    solution_approach: '基于 AI Agent 的自动化解决方案',
    business_function: '通用',
    target_company: '各行业企业',
    implementation_complexity: '中',
    competitive_advantage: '开源可定制',
    use_case_summary: `${projectName} - ${description || 'AI Agent 项目'}`,
  };
}

/**
 * 批量处理项目数据
 */
export async function batchExtractStructuredData(
  projects: any[],
  onProgress?: (current: number, total: number) => void
): Promise<any[]> {
  const results = [];
  const total = projects.length;

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];

    try {
      const structured = await extractCaseStructuredData(
        project.project_name,
        project.description,
        project.readme_content,
        project.topics || []
      );

      results.push({
        ...project,
        ...structured,
      });

      if (onProgress) {
        onProgress(i + 1, total);
      }

      // 避免 API 限流
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`处理项目 ${project.project_name} 失败:`, error);
      results.push({
        ...project,
        ...getDefaultStructuredData(project.project_name, project.description),
      });
    }
  }

  return results;
}
