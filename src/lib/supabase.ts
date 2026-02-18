import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our data
export interface Case {
  id: string;
  project_name: string;
  industry: string;
  use_case: string;
  pain_point: string;
  technology: string[];
  outcome: string;
  source_url?: string;
  created_at: string;
}

export interface Scenario {
  id: string;
  name: string;
  industry: string;
  description: string;
  technology_stack: string[];
  complexity: 'low' | 'medium' | 'high';
}
