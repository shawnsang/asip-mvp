-- 添加 Skills 相关字段的 SQL
-- 在 Supabase SQL Editor 中执行

-- 使用 DO 块检查并添加列（兼容所有 PostgreSQL 版本）

DO $$
BEGIN
    -- 添加 project_type 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cases' AND column_name = 'project_type'
    ) THEN
        ALTER TABLE cases ADD COLUMN project_type TEXT DEFAULT 'tool';
    END IF;

    -- 添加 skill_category 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cases' AND column_name = 'skill_category'
    ) THEN
        ALTER TABLE cases ADD COLUMN skill_category TEXT;
    END IF;

    -- 添加 skill_description 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cases' AND column_name = 'skill_description'
    ) THEN
        ALTER TABLE cases ADD COLUMN skill_description TEXT;
    END IF;

    -- 添加 use_cases 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cases' AND column_name = 'use_cases'
    ) THEN
        ALTER TABLE cases ADD COLUMN use_cases TEXT;
    END IF;

    -- 添加 difficulty 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cases' AND column_name = 'difficulty'
    ) THEN
        ALTER TABLE cases ADD COLUMN difficulty TEXT;
    END IF;

    -- 添加 prerequisites 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cases' AND column_name = 'prerequisites'
    ) THEN
        ALTER TABLE cases ADD COLUMN prerequisites TEXT;
    END IF;

    -- 添加 installation_method 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cases' AND column_name = 'installation_method'
    ) THEN
        ALTER TABLE cases ADD COLUMN installation_method TEXT;
    END IF;

    -- 添加 example_prompt 列
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cases' AND column_name = 'example_prompt'
    ) THEN
        ALTER TABLE cases ADD COLUMN example_prompt TEXT;
    END IF;
END $$;

-- 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_cases_project_type ON cases(project_type);
CREATE INDEX IF NOT EXISTS idx_cases_skill_category ON cases(skill_category);

-- 验证列已添加
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'cases'
AND column_name IN ('project_type', 'skill_category', 'skill_description', 'use_cases', 'difficulty', 'prerequisites', 'installation_method', 'example_prompt')
ORDER BY column_name;
