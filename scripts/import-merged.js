/**
 * 统一数据导入脚本
 * 合并多数据源数据，处理后导入 Supabase
 */

// 加载环境变量
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 加载配置
const config = require('./config');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 环境变量未配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 计算质量评分
 */
function calculateQualityScore(item) {
  let score = 0;

  // Stars 评分
  const stars = item.stars || 0;
  if (stars > 10000) score += 0.5;
  else if (stars > 1000) score += 0.4;
  else if (stars > 100) score += 0.3;
  else if (stars > 10) score += 0.2;
  else score += 0.1;

  // 有 description
  if (item.description && item.description.length > 20) {
    score += 0.2;
  }

  // 有技术标签
  if (item.topics && item.topics.length > 0) {
    score += 0.2;
  }

  // 数据来源加权
  if (item.source === 'GitHub') score += 0.1;

  return Math.min(score, 1);
}

/**
 * 推断行业
 */
function inferIndustry(item) {
  const text = `${item.project_name} ${item.description || ''} ${item.topics?.join(' ')}`.toLowerCase();

  const industries = {
    '金融': ['finance', 'bank', 'payment', 'trading', 'crypto', 'fintech'],
    '医疗': ['health', 'medical', 'doctor', 'hospital', 'patient'],
    '教育': ['education', 'learning', 'school', 'student', 'course'],
    '零售': ['e-commerce', 'shop', 'retail', 'store', 'commerce'],
    '物流': ['logistics', 'shipping', 'delivery', 'transport'],
    '制造': ['manufacturing', 'factory', 'production', 'industrial'],
  };

  for (const [ind, keywords] of Object.entries(industries)) {
    if (keywords.some(k => text.includes(k))) {
      return ind;
    }
  }

  return '通用';
}

/**
 * 推断用例
 */
function inferUseCase(item) {
  const text = `${item.project_name} ${item.description || ''} ${item.topics?.join(' ')}`.toLowerCase();

  const useCases = [
    { keyword: 'chatbot', label: '智能客服' },
    { keyword: 'assistant', label: 'AI 助手' },
    { keyword: 'automation', label: '流程自动化' },
    { keyword: 'rpa', label: 'RPA' },
    { keyword: 'data', label: '数据分析' },
    { keyword: 'content', label: '内容生成' },
    { keyword: 'writing', label: '写作辅助' },
    { keyword: 'translation', label: '翻译' },
    { keyword: 'search', label: '搜索' },
    { keyword: 'qa', label: '问答系统' },
    { keyword: 'knowledge', label: '知识库' },
    { keyword: 'test', label: '自动化测试' },
  ];

  for (const { keyword, label } of useCases) {
    if (text.includes(keyword)) {
      return label;
    }
  }

  return '其他';
}

/**
 * 提取技术栈
 */
function extractTechnology(item) {
  const techs = new Set();

  // 从 topics 提取
  if (item.topics) {
    item.topics.forEach(t => techs.add(t.toLowerCase()));
  }

  // 从语言字段添加
  if (item.language) {
    techs.add(item.language);
  }

  // 常见技术关键词
  const techKeywords = ['python', 'javascript', 'typescript', 'java', 'go', 'rust', 'llm', 'gpt', 'openai', 'langchain', 'rag', 'agent', 'browser', 'api'];
  const text = `${item.project_name} ${item.description || ''}`.toLowerCase();
  techKeywords.forEach(t => {
    if (text.includes(t)) techs.add(t);
  });

  return Array.from(techs);
}

/**
 * 检查数据是否已存在
 */
async function checkExisting(sourceUrl) {
  const { data, error } = await supabase
    .from('cases')
    .select('id')
    .eq('source_url', sourceUrl)
    .limit(1);

  return data && data.length > 0;
}

/**
 * 导入数据
 */
async function importData(dataFile) {
  console.log('\n🔄 开始导入数据...\n');

  // 读取原始数据
  let rawData;

  if (dataFile) {
    const filePath = path.isAbsolute(dataFile) ? dataFile : path.join(__dirname, '../data/raw', dataFile);
    rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`📂 从文件导入: ${dataFile}`);
  } else {
    // 查找最新的数据文件
    const dataDir = path.join(__dirname, '../data/raw');
    const files = fs.readdirSync(dataDir)
      .filter(f => f.startsWith('raw_data_') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.log('❌ 没有找到数据文件');
      return;
    }

    const latestFile = files[0];
    rawData = JSON.parse(fs.readFileSync(path.join(dataDir, latestFile), 'utf-8'));
    console.log(`📂 从最新文件导入: ${latestFile}`);
  }

  console.log(`📊 待处理数据: ${rawData.length} 条\n`);

  // 处理数据
  const processed = rawData.map(item => ({
    project_name: item.project_name || 'Unknown',
    industry: inferIndustry(item),
    use_case: inferUseCase(item),
    pain_point: null, // 需要 LLM 进一步分析
    technology: extractTechnology(item),
    outcome: item.description || null,
    source: item.source || 'GitHub',
    source_url: item.source_url || '',
    quality_score: calculateQualityScore(item),
    is_verified: false,
    raw_data: {
      stars: item.stars,
      forks: item.forks,
      language: item.language,
      description: item.description,
      topics: item.topics,
      author: item.author,
    },
  }));

  // 去重并过滤
  const uniqueData = [];
  const seenUrls = new Set();

  for (const item of processed) {
    if (!item.source_url || seenUrls.has(item.source_url)) continue;
    seenUrls.add(item.source_url);
    uniqueData.push(item);
  }

  console.log(`📊 去重后: ${uniqueData.length} 条`);

  // 批量导入 (不使用 upsert，因为没有唯一约束)
  const batchSize = 50;
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < uniqueData.length; i += batchSize) {
    const batch = uniqueData.slice(i, i + batchSize);

    // 先检查哪些已存在
    const urls = batch.map(b => b.source_url);
    const { data: existing } = await supabase
      .from('cases')
      .select('source_url')
      .in('source_url', urls);

    const existingUrls = new Set(existing?.map(e => e.source_url) || []);
    const newBatch = batch.filter(b => !existingUrls.has(b.source_url));

    if (newBatch.length > 0) {
      const { data, error } = await supabase
        .from('cases')
        .insert(newBatch)
        .select();

      if (error) {
        console.log(`⚠️ 批次 ${i / batchSize + 1} 导入失败: ${error.message}`);
        skipped += batch.length;
      } else {
        imported += newBatch.length;
        console.log(`  ✓ 批次 ${i / batchSize + 1}: ${newBatch.length} 条 (新增)`);
      }
    } else {
      skipped += batch.length;
      console.log(`  - 批次 ${i / batchSize + 1}: 0 条 (已存在)`);
    }

    // 避免过快
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n📊 导入完成:');
  console.log(`   - 成功: ${imported} 条`);
  console.log(`   - 跳过: ${skipped} 条`);

  // 显示统计
  const { count } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📈 数据库总计: ${count} 条案例`);
}

// 解析命令行参数
const args = process.argv.slice(2);
const dataFile = args[0];

importData(dataFile).catch(console.error);
