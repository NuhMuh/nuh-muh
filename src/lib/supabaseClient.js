import { createClient } from '@supabase/supabase-js';

// publishable 키 — 브라우저 노출 안전 (RLS가 데이터 보호)
const SUPABASE_URL = 'https://gvmqyfiaejmjagydlvuv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_uH4X2PwGdPxT3-Rf6Ipx9A__LGWEJuI';
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
