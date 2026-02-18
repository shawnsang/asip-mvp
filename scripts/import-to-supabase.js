/**
 * 数据导入脚本
 * 将 CSV 数据导入 Supabase
 */

// 加载 .env 文件
require('dotenv').config();

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 环境变量未正确配置');
  console.log('\n当前环境变量:');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ 已设置' : '❌ 未设置');
  console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ 已设置' : '❌ 未设置 (需要设置或使用 anon key)');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 已设置' : '❌ 未设置');
  console.log('\n请确保在 .env 文件中设置:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 从 CSV 读取数据
 */
function readCSV(filename) {
  const content = fs.readFileSync(filename, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    data.push(row);
  }

  return data;
}

/**
 * 导入数据到 Supabase
 */
async function importData() {
  console.log('🚀 开始导入数据...\n');

  // 读取 CSV
  const csvFile = './github_projects_processed.json';

  if (!fs.existsSync(csvFile)) {
    console.log('📦 找不到处理后的数据，正在读取原始 CSV...');
    const rawData = readCSV('./github_projects_raw.json');
    var cases = rawData;
  } else {
    const processed = JSON.parse(fs.readFileSync(csvFile, 'utf-8'));
    var cases = processed;
  }

  console.log(`📊 准备导入 ${cases.length} 条记录\n`);

  // 批量导入（Supabase 每次最多 1000 条）
  const batchSize = 100;
  let imported = 0;
  let failed = 0;

  for (let i = 0; i < cases.length; i += batchSize) {
    const batch = cases.slice(i, i + batchSize);

    const records = batch.map(item => ({
      project_name: item.project_name || item.name || 'Unknown',
      industry: item.industry || '通用',
      use_case: item.use_case || '其他',
      pain_point: item.pain_point || null,
      technology: item.technology || [],
      outcome: item.outcome || null,
      source: 'GitHub',
      source_url: item.source_url || item.html_url || '',
      quality_score: item.quality_score || 0.5,
      is_verified: false,
    }));

    const { data, error } = await supabase
      .from('cases')
      .insert(records)
      .select();

    if (error) {
      console.error(`❌ 批次 ${Math.floor(i / batchSize) + 1} 导入失败:`, error.message);
      failed += batch.length;
    } else {
      imported += records.length;
      console.log(`✅ 批次 ${Math.floor(i / batchSize) + 1} 成功导入 ${records.length} 条`);
    }
  }

  console.log(`\n🎉 导入完成！`);
  console.log(`   - 成功: ${imported} 条`);
  console.log(`   - 失败: ${failed} 条`);

  // 验证数据
  const { count } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📈 数据库中共有 ${count} 条案例记录`);
}

importData().catch(console.error);
