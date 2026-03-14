import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && supabaseAnonKey && supabaseAnonKey !== 'your_anon_key';

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
export const isSupabaseConfigured = () => isConfigured;
