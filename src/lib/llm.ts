import axios from 'axios';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';

/**
 * 调用阿里云 Qwen3 模型进行推理
 */
export async function callQwen(
  prompt: string,
  model: 'qwen-turbo' | 'qwen-plus' | 'qwen-max' = 'qwen-plus'
): Promise<string> {
  if (!DASHSCOPE_API_KEY) {
    throw new Error('DASHSCOPE_API_KEY is not configured');
  }

  try {
    const response = await axios.post(
      `${DASHSCOPE_BASE_URL}/services/aigc/text-generation/generation`,
      {
        model: model,
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
 * 结构化抽取案例信息
 */
export async function extractCaseInfo(rawText: string): Promise<any> {
  const prompt = `你是一个AI Agent案例分析专家。请从以下文本中提取结构化的案例信息。

请严格按照以下JSON格式输出，不要添加任何其他内容：
{
  "project_name": "项目名称",
  "industry": "行业",
  "use_case": "用例场景",
  "pain_point": "解决的问题",
  "technology": ["技术栈1", "技术栈2"],
  "outcome": "效果/成果"
}

文本内容：
${rawText}

JSON输出：`;

  const result = await callQwen(prompt);

  try {
    // 尝试解析 JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return null;
  }
}

/**
 * 生成销售话术
 */
export async function generateSalesScript(
  caseInfo: any,
  customerIndustry: string
): Promise<string> {
  const prompt = `你是一个AI销售助手。请根据以下案例信息，为销售代表生成销售话术。

案例信息：
- 项目名称：${caseInfo.project_name}
- 行业：${caseInfo.industry}
- 用例：${caseInfo.use_case}
- 痛点：${caseInfo.pain_point}
- 技术：${caseInfo.technology.join(', ')}
- 成果：${caseInfo.outcome}

客户行业：${customerIndustry}

请生成：
1. 开场白（1-2句）
2. 案例介绍（3-4句）
3. 价值主张（2-3句）
4. 收尾问题（1句）

话术：`;

  return await callQwen(prompt, 'qwen-turbo');
}

/**
 * 计算ROI估算
 */
export async function calculateROI(
  industry: string,
  useCase: string,
  companySize: string
): Promise<any> {
  const prompt = `你是一个ROI分析专家。请根据以下信息估算ROI。

- 行业：${industry}
- 用例：${useCase}
- 公司规模：${companySize}

请给出：
1. 预计节省人力（人/年）
2. 预计年节省成本（人民币）
3. 投资回报期（月）
4. 置信度（高/中/低）

请以JSON格式输出：
{
  "labor_savings": "数字",
  "annual_savings": "数字",
  "payback_period": "数字",
  "confidence": "高/中/低"
}

JSON输出：`;

  const result = await callQwen(prompt);

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Failed to parse ROI:', error);
  }

  return null;
}
