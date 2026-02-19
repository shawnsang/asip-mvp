/**
 * 结构化数据抽取脚本
 * 从数据库读取项目数据，进行 LLM 结构化处理后回写数据库
 */

// 加载环境变量
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';

// README 长度限制 (字符数) - 控制在合理范围内避免 token 超限
const MAX_README_LENGTH = 8000;
const MAX_DESCRIPTION_LENGTH = 2000;

/**
 * 调用 Qwen 进行结构化抽取
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
    const errData = error.response?.data;
    // 检查是否是内容安全错误
    if (errData?.code === 'DataInspectionFailed' || errData?.message?.includes('inappropriate')) {
      console.error('    ⚠️ 内容安全检查失败，跳过该项目');
      return null; // 返回 null 让调用方处理
    }
    console.error('Qwen API Error:', errData || error.message);
    throw new Error('Failed to call Qwen API');
  }
}

/**
 * 从项目信息中提取销售相关的结构化数据
 */
async function extractCaseStructuredData(projectName, description, readmeContent, topics) {
  // 长度控制
  const desc = (description || '').substring(0, MAX_DESCRIPTION_LENGTH);
  const readme = (readmeContent || '').substring(0, MAX_README_LENGTH);
  const topicStr = (topics || []).join(', ');

  const content = `
项目名称: ${projectName}
项目描述: ${desc}
技术标签: ${topicStr}
README 内容:
${readme || '（无 README）'}
`.trim();

  const prompt = `你是一个AI Agent案例分析专家，专门为销售团队提取有价值的结构化信息。

请从以下GitHub项目信息中提取销售相关的结构化数据：

${content}

请严格按照以下JSON格式输出，不要添加任何其他内容：
{
  "pain_point": "该项目解决的1-2个核心业务痛点（用中文，30字以内）",
  "solution_approach": "解决方案的核心思路（用中文，50字以内）",
  "business_function": "主要适用的业务功能领域，如：智能客服、流程自动化、数据分析，内容生成、ERP集成等",
  "target_company": "目标企业类型，如：中小企业、大型企业的XX部门等",
  "implementation_complexity": "实施复杂度：低/中/高",
  "competitive_advantage": "1-2个主要竞争优势（用中文，40字以内）",
  "use_case_summary": "一句话总结该项目的典型用例（用中文，60字以内）"
}

JSON输出：`;

  const result = await callQwen(prompt);

  if (!result) {
    return null;
  }

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        pain_point: parsed.pain_point || null,
        solution_approach: parsed.solution_approach || null,
        business_function: parsed.business_function || null,
        target_company: parsed.target_company || null,
        implementation_complexity: parsed.implementation_complexity || null,
        competitive_advantage: parsed.competitive_advantage || null,
        use_case_summary: parsed.use_case_summary || null,
      };
    }
  } catch (error) {
    console.error('    ⚠️ 解析失败:', error.message);
  }

  return null;
}

/**
 * 主函数
 */
async function main() {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase 环境变量未配置');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔄 开始 LLM 结构化抽取...\n');

  // 获取需要处理的项目 - 缺少 pain_point 的
  const { data: cases, error } = await supabase
    .from('cases')
    .select('id, project_name, outcome, technology, source_url, raw_data')
    .is('pain_point', null)
    .limit(100);

  if (error) {
    console.error('❌ 获取数据失败:', error.message);
    process.exit(1);
  }

  console.log(`📊 需要处理的项目数: ${cases.length}\n`);

  if (cases.length === 0) {
    console.log('✅ 所有项目已完成结构化提取');
    return;
  }

  let success = 0;
  let failed = 0;
  let skipped = 0;

  // 逐个处理
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];

    try {
      console.log(`  [${i + 1}/${cases.length}] ${c.project_name}...`);

      // 从 raw_data 获取 README 内容
      const rawData = c.raw_data || {};
      const readmeContent = rawData.readme_content || null;
      const tech = Array.isArray(c.technology) ? c.technology : [];

      const result = await extractCaseStructuredData(
        c.project_name,
        c.outcome,
        readmeContent,
        tech
      );

      if (result) {
        // 更新数据库
        await supabase
          .from('cases')
          .update({
            pain_point: result.pain_point,
            solution_approach: result.solution_approach,
            business_function: result.business_function,
            target_company: result.target_company,
            implementation_complexity: result.implementation_complexity,
            competitive_advantage: result.competitive_advantage,
            use_case_summary: result.use_case_summary,
          })
          .eq('id', c.id);

        console.log(`    ✓ ${result.business_function || 'N/A'} | ${result.implementation_complexity || 'N/A'}`);
        success++;
      } else {
        console.log(`    ⊘ 无结果 (跳过)`);
        skipped++;
      }

      // 避免 API 限流
      await new Promise(r => setTimeout(r, 500));

    } catch (e) {
      console.log(`    ✗ 错误: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n📊 提取完成: 成功 ${success}, 跳过 ${skipped}, 失败 ${failed}`);
  console.log('✅ 处理完成!');
}

main().catch(console.error);
