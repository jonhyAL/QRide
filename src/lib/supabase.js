import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wleuksyifrsrvnknjzuw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5LtuM65b9_Bj8nbY68L45Q_Qm48fbT_';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);