/**
 * 批量 LLM 结构化抽取脚本
 * 对数据库中的项目进行批量 LLM 处理
 */

// 加载环境变量
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';

/**
 * 调用 Qwen
 */
async function callQwen(prompt) {
  if (!DASHSCOPE_API_KEY) {
    throw new Error('DASHSCOPE_API_KEY is not configured');
  }

  try {
    const response = await axios.post(
      `${DASHSCOPE_BASE_URL}/services/aigc/text-generation/generation`,
      {
        model: 'qwen-plus',
        input: { prompt },
        parameters: { result_format: 'message' },
      },
      {
        headers: {
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.output.choices[0].message.content;
  } catch (error) {
    console.error('Qwen API Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 提取结构化数据
 */
async function extractStructuredData(projectName, description, topics) {
  const content = `项目名称: ${projectName}\n项目描述: ${description}\n技术标签: ${topics?.join(', ') || ''}`;

  const prompt = `你是一个AI Agent案例分析专家，专门为销售团队提取有价值的结构化信息。

从以下GitHub项目信息中提取：

${content}

请严格按照JSON格式输出：
{
  "pain_point": "解决的1-2个核心痛点（中文，30字内）",
  "solution_approach": "解决方案核心思路（中文，50字内）",
  "business_function": "业务功能领域",
  "target_company": "目标企业类型",
  "implementation_complexity": "低/中/高",
  "competitive_advantage": "竞争优势（中文，40字内）"
}

JSON输出：`;

  const result = await callQwen(prompt);

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('解析失败');
  }
  return null;
}

/**
 * 主函数 - 批量处理数据库中的项目
 */
async function main() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  console.log('🔄 开始批量 LLM 结构化抽取...\n');

  // 获取需要处理的项目（没有 pain_point 的）
  const { data: cases, error } = await supabase
    .from('cases')
    .select('id, project_name, outcome, technology')
    .or('pain_point.is.null,pain_point.eq.')
    .limit(20);

  if (error) {
    console.error('获取数据失败:', error.message);
    return;
  }

  console.log(`📊 需要处理的项目数: ${cases.length}\n`);

  // 逐个处理
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];

    try {
      console.log(`  处理 [${i + 1}/${cases.length}]: ${c.project_name}...`);

      const result = await extractStructuredData(
        c.project_name,
        c.outcome,
        c.technology
      );

      if (result) {
        // 更新数据库
        await supabase
          .from('cases')
          .update({
            pain_point: result.pain_point,
            outcome: result.solution_approach,
          })
          .eq('id', c.id);

        console.log(`    ✓ 已更新: 痛点=${result.pain_point?.substring(0, 20)}...`);
      }

      // 避免 API 限流
      await new Promise(r => setTimeout(r, 500));

    } catch (e) {
      console.log(`    ✗ 失败: ${e.message}`);
    }
  }

  console.log('\n✅ 处理完成!');
}

main().catch(console.error);
