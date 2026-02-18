import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 服务器端客户端（有管理员权限）
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 客户端使用公共 anon key（在 lib/supabase.ts 中）
// 这个文件仅用于服务器端操作

/**
 * 案例相关数据库操作
 */
export const caseDb = {
  /**
   * 获取案例列表
   */
  async getCases(options: {
    industry?: string;
    useCase?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    let query = supabaseAdmin
      .from('cases')
      .select('*')
      .order('quality_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (options.industry) {
      query = query.eq('industry', options.industry);
    }

    if (options.useCase) {
      query = query.eq('use_case', options.useCase);
    }

    const { data, error } = await query
      .range(options.offset || 0, (options.limit || 20) - 1);

    if (error) throw error;
    return data;
  },

  /**
   * 获取案例详情
   */
  async getCaseById(id: string) {
    const { data, error } = await supabaseAdmin
      .from('cases')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * 搜索案例
   */
  async searchCases(keyword: string, limit = 20) {
    const { data, error } = await supabaseAdmin
      .from('cases')
      .select('*')
      .or(`project_name.ilike.%${keyword}%,description.ilike.%${keyword}%`)
      .order('quality_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  /**
   * 添加案例
   */
  async addCase(caseData: any) {
    const { data, error } = await supabaseAdmin
      .from('cases')
      .insert(caseData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * 批量添加案例
   */
  async addCases(cases: any[]) {
    const { data, error } = await supabaseAdmin
      .from('cases')
      .insert(cases)
      .select();

    if (error) throw error;
    return data;
  },

  /**
   * 获取行业列表
   */
  async getIndustries() {
    const { data, error } = await supabaseAdmin
      .from('industries')
      .select('*')
      .order('case_count', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * 获取场景列表
   */
  async getScenarios(industry?: string) {
    let query = supabaseAdmin
      .from('scenarios')
      .select('*')
      .order('case_count', { ascending: false });

    if (industry) {
      query = query.eq('industry', industry);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  /**
   * 统计案例数量
   */
  async getCaseCount() {
    const { count, error } = await supabaseAdmin
      .from('cases')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count;
  },
};
