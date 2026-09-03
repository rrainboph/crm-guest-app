// js/config.js
const SUPABASE_URL = 'https://dvuhuaqfgzcqoqriycyq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zGFa4777lnuhoIB1C20eIA_WTj6DOIW';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ACCESS_KEYS = {
  '+7777': { name: 'Генеральный директор', role: 'ADMIN', canManageNotes: true },

  '+998': { name: 'Управляющий — Куйбышева (Кореана)', role: 'BRANCH_MANAGER', branchId: '11111111-1111-1111-1111-111111111111', canManageNotes: true },
  '+550': { name: 'Управляющий — Юнусалиева 127 (Кореана 24/7)', role: 'BRANCH_MANAGER', branchId: '22222222-2222-2222-2222-222222222222', canManageNotes: true },
  '+553': { name: 'Управляющий — Юнусалиева 98/2 (Кореана Караоке)', role: 'BRANCH_MANAGER', branchId: '33333333-3333-3333-3333-333333333333', canManageNotes: true },
  '+559': { name: 'Управляющий — Юнусалиева 29 (Кореана Фемили)', role: 'BRANCH_MANAGER', branchId: '44444444-4444-4444-4444-444444444444', canManageNotes: true },
  '+555': { name: 'Управляющий — Ибраимова 105 (Альчик)', role: 'BRANCH_MANAGER', branchId: '55555555-5555-5555-5555-555555555555', canManageNotes: true },
  '+557': { name: 'Управляющий — Медерова 36 (Альчик)', role: 'BRANCH_MANAGER', branchId: '66666666-6666-6666-6666-666666666666', canManageNotes: true },
  '+554': { name: 'Управляющий — Орозбекова 68 (Альчик)', role: 'BRANCH_MANAGER', branchId: '77777777-7777-7777-7777-777777777777', canManageNotes: true },

  '998': { name: 'Администратор — Куйбышева (Кореана)', role: 'STAFF', branchId: '11111111-1111-1111-1111-111111111111', canManageNotes: false },
  '550': { name: 'Администратор — Юнусалиева 127 (Кореана 24/7)', role: 'STAFF', branchId: '22222222-2222-2222-2222-222222222222', canManageNotes: false },
  '553': { name: 'Администратор — Юнусалиева 98/2 (Кореана Караоке)', role: 'STAFF', branchId: '33333333-3333-3333-3333-333333333333', canManageNotes: false },
  '559': { name: 'Администратор — Юнусалиева 29 (Кореана Фемили)', role: 'STAFF', branchId: '44444444-4444-4444-4444-444444444444', canManageNotes: false },
  '555': { name: 'Администратор — Ибраимова 105 (Альчик)', role: 'STAFF', branchId: '55555555-5555-5555-5555-555555555555', canManageNotes: false },
  '557': { name: 'Администратор — Медерова 36 (Альчик)', role: 'STAFF', branchId: '66666666-6666-6666-6666-666666666666', canManageNotes: false },
  '554': { name: 'Администратор — Орозбекова 68 (Альчик)', role: 'STAFF', branchId: '77777777-7777-7777-7777-777777777777', canManageNotes: false }
};