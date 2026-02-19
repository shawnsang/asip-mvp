/**
 * 结构化数据抽取脚本
 * 对已采集的 GitHub 项目数据进行 LLM 结构化处理
 */

// 加载环境变量
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';

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
    console.error('Qwen API Error:', error.response?.data || error.message);
    throw new Error('Failed to call Qwen API');
  }
}

/**
 * 从项目信息中提取销售相关的结构化数据
 */
async function extractCaseStructuredData(projectName, description, readmeContent, topics) {
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
  "business_function": "主要适用的业务功能领域，如：智能客服、流程自动化、数据分析，内容生成、ERP集成等",
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
  } catch (error) {
    console.error('解析失败:', error.message);
  }

  return getDefaultStructuredData(projectName, description);
}

function getDefaultStructuredData(projectName, description) {
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
async function batchExtractStructuredData(projects, onProgress) {
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

      await new Promise(resolve => setTimeout(resolve, 400));
    } catch (error) {
      console.error(`\n处理项目 ${project.project_name} 失败:`, error.message);
      results.push({
        ...project,
        ...getDefaultStructuredData(project.project_name, project.description),
      });
    }
  }

  return results;
}

/**
 * 主函数
 */
async function main() {
  console.log('🔄 开始结构化数据抽取...\n');

  // 读取原始数据
  const rawFile = path.join(__dirname, '../github_projects_raw.json');

  if (!fs.existsSync(rawFile)) {
    console.error('❌ 找不到原始数据文件 github_projects_raw.json');
    console.log('请先运行: node scripts/collect-github.js');
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(rawFile, 'utf-8'));
  console.log(`📊 待处理项目数: ${rawData.length}\n`);

  // 检查哪些项目已经有结构化数据
  const needProcessing = rawData.filter(p => !p.pain_point || p.pain_point === '自动化任务处理效率低' || !p.readme_content);
  console.log(`🔍 需要处理的项目数: ${needProcessing.length}`);

  if (needProcessing.length === 0) {
    console.log('✅ 所有项目已有结构化数据');
    return;
  }

  // 批量处理 (只处理前5个演示)
  const demoProjects = needProcessing.slice(0, 5);
  console.log(`\n🚀 开始 LLM 结构化抽取 (演示模式: ${demoProjects.length} 个项目)...\n`);

  const processed = await batchExtractStructuredData(
    demoProjects,
    (current, total) => {
      process.stdout.write(`\r  进度: ${current}/${total}`);
    }
  );

  console.log('\n\n✅ 结构化抽取完成!');

  // 合并结果
  const existingWithData = rawData.filter(p =>
    p.pain_point &&
    p.pain_point !== '自动化任务处理效率低' &&
    p.readme_content
  );
  const finalData = [...existingWithData, ...processed];

  // 保存处理后的数据
  fs.writeFileSync(
    path.join(__dirname, '../github_projects_structured.json'),
    JSON.stringify(finalData, null, 2)
  );

  // 统计
  console.log('\n📊 统计信息:');
  console.log(`   - 已有完整数据: ${existingWithData.length}`);
  console.log(`   - 新处理: ${processed.length}`);
  console.log(`   - 总计: ${finalData.length}`);

  // 显示处理结果示例
  console.log('\n📝 处理结果示例:');
  processed.slice(0, 3).forEach((p, i) => {
    console.log(`\n${i + 1}. ${p.project_name}`);
    console.log(`   痛点: ${p.pain_point}`);
    console.log(`   解决方案: ${p.solution_approach}`);
    console.log(`   业务功能: ${p.business_function}`);
    console.log(`   目标企业: ${p.target_company}`);
    console.log(`   复杂度: ${p.implementation_complexity}`);
    console.log(`   竞争优势: ${p.competitive_advantage}`);
  });

  console.log('\n💾 已保存到: github_projects_structured.json');
}

main().catch(console.error);
