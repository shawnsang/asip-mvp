/**
 * 数据处理脚本
 * 功能：清洗、标准化、结构化 GitHub 数据
 */

const fs = require('fs');

/**
 * 行业关键词映射
 */
const INDUSTRY_KEYWORDS = {
  '金融': ['finance', 'bank', 'payment', 'trading', 'crypto', 'fintech', 'loan'],
  '医疗': ['health', 'medical', 'doctor', 'hospital', 'patient', 'clinic', 'pharma'],
  '教育': ['education', 'learning', 'school', 'student', 'course', 'tutor'],
  '零售': ['e-commerce', 'shop', 'retail', 'store', 'mall', 'commerce', 'amazon'],
  '物流': ['logistics', 'shipping', 'delivery', 'transport', 'warehouse', 'supply'],
  '制造': ['manufacturing', 'factory', 'production', 'industrial', 'assembly'],
  '餐饮': ['restaurant', 'food', 'restaurant', 'kitchen', 'catering', 'menu'],
  '地产': ['real estate', 'property', 'housing', 'building', 'land'],
};

/**
 * 技术栈关键词提取
 */
const TECH_KEYWORDS = {
  'LLM': ['gpt', 'llm', 'language model', 'openai', 'anthropic', 'qwen', 'claude'],
  'LangChain': ['langchain', 'lang smith'],
  'RAG': ['rag', 'retrieval', 'vector', 'pinecone', 'weaviate', 'chroma'],
  'Agent': ['agent', 'autonomous', 'crew', 'multi-agent'],
  'OCR': ['ocr', 'tesseract', 'text recognition'],
  'TTS': ['tts', 'text to speech', 'elevenlabs', 'coqui'],
  'Speech': ['speech', 'whisper', 'stt', 'voice'],
  'API': ['api', 'rest', 'graphql', 'endpoint'],
  'Browser': ['playwright', 'puppeteer', 'selenium', 'browser'],
  'Database': ['postgres', 'mysql', 'mongodb', 'redis', 'supabase'],
  'Cloud': ['aws', 'azure', 'gcp', 'cloud'],
};

/**
 * 从描述中推断行业
 */
function inferIndustry(text) {
  if (!text) return null;

  const lowerText = text.toLowerCase();

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return industry;
      }
    }
  }

  return null;
}

/**
 * 从 topics 和 description 提取技术栈
 */
function extractTechnology(item) {
  const techs = new Set();

  // 从 topics 提取
  if (item.topics && Array.isArray(item.topics)) {
    item.topics.forEach(t => techs.add(t.toLowerCase()));
  }

  // 从 description 提取
  const text = (item.description || '').toLowerCase();

  for (const [tech, keywords] of Object.entries(TECH_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        techs.add(tech);
      }
    }
  }

  // 从语言字段添加
  if (item.language) {
    techs.add(item.language);
  }

  return Array.from(techs);
}

/**
 * 从项目名和描述推断用例
 */
function inferUseCase(item) {
  const text = `${item.project_name} ${item.description || ''}`.toLowerCase();

  const useCases = [
    { keyword: 'chatbot', label: '智能客服' },
    { keyword: 'assistant', label: 'AI 助手' },
    { keyword: 'automation', label: '流程自动化' },
    { keyword: 'rpa', label: 'RPA' },
    { keyword: 'data', label: '数据分析' },
    { keyword: 'content', label: '内容生成' },
    { keyword: 'writing', label: '写作辅助' },
    { keyword: 'translation', label: '翻译' },
    { keyword: 'summar', label: '摘要生成' },
    { keyword: 'search', label: '搜索' },
    { keyword: 'qa', label: '问答系统' },
    { keyword: 'knowledge', label: '知识库' },
  ];

  for (const { keyword, label } of useCases) {
    if (text.includes(keyword)) {
      return label;
    }
  }

  return '其他';
}

/**
 * 判断项目质量分数
 */
function calculateQualityScore(item) {
  let score = 0;

  // Stars 评分 (0-0.4)
  const stars = item.stars || 0;
  if (stars > 1000) score += 0.4;
  else if (stars > 100) score += 0.3;
  else if (stars > 10) score += 0.2;
  else score += 0.1;

  // 有 description (0.2)
  if (item.description && item.description.length > 20) {
    score += 0.2;
  }

  // 有 topics (0.2)
  if (item.topics && item.topics.length > 0) {
    score += 0.2;
  }

  // 有编程语言 (0.2)
  if (item.language) {
    score += 0.2;
  }

  return Math.min(score, 1);
}

/**
 * 处理原始数据
 */
function processRawData(rawData) {
  console.log(`📦 开始处理 ${rawData.length} 条原始数据...`);

  const processed = rawData.map(item => {
    // 提取基本信息
    const processedItem = {
      project_name: item.project_name || item.name,
      industry: inferIndustry(item.description) || '通用',
      use_case: inferUseCase(item),
      pain_point: null,  // 需要 LLM 进一步分析
      technology: extractTechnology(item),
      outcome: null,  // 需要 LLM 进一步分析
      source: item.source || 'GitHub',
      source_url: item.source_url || item.html_url,
      raw_data: item,
      quality_score: calculateQualityScore(item),
      is_verified: false,
    };

    return processedItem;
  });

  // 按质量分数排序
  processed.sort((a, b) => b.quality_score - a.quality_score);

  // 去重（基于 source_url）
  const seen = new Set();
  const deduped = processed.filter(item => {
    if (seen.has(item.source_url)) {
      return false;
    }
    seen.add(item.source_url);
    return true;
  });

  console.log(`✅ 处理完成: ${deduped.length} 条唯一记录`);

  // 统计
  const stats = {
    total: deduped.length,
    highQuality: deduped.filter(i => i.quality_score > 0.7).length,
    mediumQuality: deduped.filter(i => i.quality_score > 0.4 && i.quality_score <= 0.7).length,
    lowQuality: deduped.filter(i => i.quality_score <= 0.4).length,
    industries: {},
    useCases: {},
    technologies: {},
  };

  // 统计行业分布
  deduped.forEach(item => {
    stats.industries[item.industry] = (stats.industries[item.industry] || 0) + 1;
    stats.useCases[item.use_case] = (stats.useCases[item.use_case] || 0) + 1;
    item.technology.forEach(t => {
      stats.technologies[t] = (stats.technologies[t] || 0) + 1;
    });
  });

  console.log('\n📊 统计信息:');
  console.log(`  - 高质量: ${stats.highQuality}`);
  console.log(`  - 中质量: ${stats.mediumQuality}`);
  console.log(`  - 低质量: ${stats.lowQuality}`);
  console.log('\n  行业分布:');
  Object.entries(stats.industries).forEach(([k, v]) => console.log(`    ${k}: ${v}`));
  console.log('\n  用例分布:');
  Object.entries(stats.useCases).forEach(([k, v]) => console.log(`    ${k}: ${v}`));

  return { data: deduped, stats };
}

/**
 * 主函数
 */
async function main() {
  // 读取原始数据
  const rawData = JSON.parse(fs.readFileSync('./github_projects_raw.json', 'utf-8'));

  // 处理数据
  const { data, stats } = processRawData(rawData);

  // 保存处理后的数据
  fs.writeFileSync(
    './github_projects_processed.json',
    JSON.stringify(data, null, 2)
  );

  // 保存统计信息
  fs.writeFileSync(
    './github_projects_stats.json',
    JSON.stringify(stats, null, 2)
  );

  console.log('\n💾 已保存:');
  console.log('  - github_projects_processed.json');
  console.log('  - github_projects_stats.json');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  processRawData,
  inferIndustry,
  extractTechnology,
  inferUseCase,
  calculateQualityScore,
};
