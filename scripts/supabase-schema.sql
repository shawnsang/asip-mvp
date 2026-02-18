-- ASIP 数据库表结构
-- 在 Supabase SQL Editor 中执行

-- 1. 案例表 (cases)
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  industry TEXT,
  use_case TEXT,
  pain_point TEXT,
  technology TEXT[],  -- 数组类型存储技术栈
  outcome TEXT,
  source TEXT NOT NULL,  -- GitHub, Reddit, Blog 等
  source_url TEXT,
  raw_data JSONB,  -- 原始数据备份
  quality_score FLOAT DEFAULT 0,  -- 质量评分 0-1
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 场景表 (scenarios)
CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  industry TEXT NOT NULL,
  category TEXT,  -- 分类：客服、自动化、数据分析等
  description TEXT,
  complexity TEXT CHECK (complexity IN ('low', 'medium', 'high')),
  technology_stack TEXT[],
  case_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 行业表 (industries)
CREATE TABLE IF NOT EXISTS industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  case_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 采集任务日志 (collection_logs)
CREATE TABLE IF NOT EXISTS collection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  status TEXT CHECK (status IN ('running', 'completed', 'failed')),
  items_collected INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 5. 用户对话记录 (conversations)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_cases_industry ON cases(industry);
CREATE INDEX IF NOT EXISTS idx_cases_use_case ON cases(use_case);
CREATE INDEX IF NOT EXISTS idx_cases_technology ON cases USING GIN(technology);
CREATE INDEX IF NOT EXISTS idx_cases_source ON cases(source);
CREATE INDEX IF NOT EXISTS idx_cases_quality ON cases(quality_score DESC);

CREATE INDEX IF NOT EXISTS idx_scenarios_industry ON scenarios(industry);
CREATE INDEX IF NOT EXISTS idx_scenarios_category ON scenarios(category);

-- 启用 Row Level Security (可选)
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;

-- 公开读取策略（开发阶段）
CREATE POLICY "Allow public read cases" ON cases FOR SELECT USING (true);
CREATE POLICY "Allow public read scenarios" ON scenarios FOR SELECT USING (true);
CREATE POLICY "Allow public read industries" ON industries FOR SELECT USING (true);

-- 插入示例行业数据
INSERT INTO industries (name, description) VALUES
  ('制造业', 'Manufacturing industry'),
  ('零售业', 'Retail and e-commerce'),
  ('金融业', 'Financial services'),
  ('医疗健康', 'Healthcare'),
  ('教育', 'Education'),
  ('物流', 'Logistics and supply chain'),
  ('房地产', 'Real estate'),
  ('餐饮业', 'Food and beverage')
ON CONFLICT (name) DO NOTHING;

-- 插入示例场景数据
INSERT INTO scenarios (name, industry, category, description, complexity) VALUES
  ('智能客服', '通用', '客服', 'AI Agent 自动处理客户咨询', 'medium'),
  ('流程自动化', '通用', '自动化', '重复性工作自动化处理', 'medium'),
  ('数据分析', '通用', '分析', '数据收集和报告生成', 'high'),
  ('内容生成', '通用', '内容', '营销内容自动生成', 'low'),
  ('ERP自动化', '制造业', '企业软件', 'ERP系统数据录入自动化', 'high'),
  ('库存管理', '零售业', '运营', '智能库存监控和预警', 'medium'),
  ('风险评估', '金融业', '风控', 'AI驱动的风险评估', 'high')
ON CONFLICT (name) DO NOTHING;

-- 创建一个向量相似度搜索的函数（简化版）
-- 注意：需要启用 pgvector 扩展

-- 显示所有表
SELECT
    table_name,
    table_type
FROM
    information_schema.tables
WHERE
    table_schema = 'public'
ORDER BY
    table_name;
