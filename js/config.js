// js/config.js
const SUPABASE_URL = 'https://dvuhuaqfgzcqoqriycyq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zGFa4777lnuhoIB1C20eIA_WTj6DOIW';

// Инициализация Supabase клиента
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Роли и ключи доступа
const ACCESS_KEYS = {
  // Директор (доступ ко всей сети)
  '7777': { 
    name: 'Генеральный директор', 
    role: 'ADMIN' 
  },

  // Филиалы
  '998': { 
    name: 'Куйбышева (Кореана)', 
    role: 'BRANCH_MANAGER', 
    branchId: '11111111-1111-1111-1111-111111111111' 
  },
  '550': { 
    name: 'Юнусалиева 127 (Кореана 24/7)', 
    role: 'BRANCH_MANAGER', 
    branchId: '22222222-2222-2222-2222-222222222222' 
  },
  '553': { 
    name: 'Юнусалиева 98/2 (Кореана Караоке)', 
    role: 'BRANCH_MANAGER', 
    branchId: '33333333-3333-3333-3333-333333333333' 
  },
  '559': { 
    name: 'Юнусалиева 29 (Кореана Фемили)', 
    role: 'BRANCH_MANAGER', 
    branchId: '44444444-4444-4444-4444-444444444444' 
  },
  '555': { 
    name: 'Ибраимова 105 (Альчик)', 
    role: 'BRANCH_MANAGER', 
    branchId: '55555555-5555-5555-5555-555555555555' 
  },
  '557': { 
    name: 'Медерова 36 (Альчик)', 
    role: 'BRANCH_MANAGER', 
    branchId: '66666666-6666-6666-6666-666666666666' 
  },
  '554': { 
    name: 'Орозбекова 68 (Альчик)', 
    role: 'BRANCH_MANAGER', 
    branchId: '77777777-7777-7777-7777-777777777777' 
  }
};