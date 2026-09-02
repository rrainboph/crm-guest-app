// js/config.js
const SUPABASE_URL = 'https://dvuhuaqfgzcqoqriycyq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zGFa4777lnuhoIB1C20eIA_WTj6DOIW';

// Инициализация Supabase клиента
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Роли и ключи доступа
const ACCESS_KEYS = {
  '7777': { 
    name: 'Генеральный директор', 
    role: 'ADMIN' 
  },
  '1111': { 
    name: 'Куйбышева', 
    role: 'BRANCH_MANAGER', 
    branchId: '11111111-1111-1111-1111-111111111111' 
  }
};