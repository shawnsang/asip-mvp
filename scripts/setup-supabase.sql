-- 在 Supabase SQL Editor 中执行以下语句，允许公开写入数据

-- 1. 禁用 RLS（开发环境）或设置允许写入的策略
ALTER TABLE cases DISABLE ROW LEVEL SECURITY;

-- 或者 2. 创建允许公开写入的策略
-- ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public insert cases" ON cases FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow public update cases" ON cases FOR UPDATE USING (true);

-- 3. 确保表存在并可以写入
-- 如果表不存在，先创建
CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  industry TEXT DEFAULT '通用',
  use_case TEXT,
  pain_point TEXT,
  technology TEXT[],
  outcome TEXT,
  source TEXT NOT NULL DEFAULT 'GitHub',
  source_url TEXT,
  quality_score FLOAT DEFAULT 0.5,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 插入测试数据验证
INSERT INTO cases (project_name, industry, use_case, technology, source, quality_score) VALUES
('AutoGPT', '通用', 'AI助手', ARRAY['GPT-4', 'LangChain'], 'GitHub', 0.95),
('LangChain', '通用', 'LLM开发', ARRAY['Python', 'LLM'], 'GitHub', 0.92),
('BrowserGPT', '通用', '浏览器自动化', ARRAY['Playwright', 'GPT-4'], 'GitHub', 0.85)
ON CONFLICT DO NOTHING;

-- 验证插入成功
SELECT * FROM cases LIMIT 5;
