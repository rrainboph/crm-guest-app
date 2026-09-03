// js/app.js

let currentUser = null;
let currentBranchId = 'ALL';
let allGuests = [];
let allNotes = [];
let currentFilter = 'ALL';
let confirmCallback = null;

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  checkSavedAuth();
});

// ПРОВЕРКА И АВТОРИЗАЦИЯ
function checkSavedAuth() {
  const savedKey = localStorage.getItem('crm_access_key');
  if (savedKey && ACCESS_KEYS[savedKey]) {
    loginUser(savedKey);
  }
}

function handleAuth(e) {
  e.preventDefault();
  const inputKey = document.getElementById('access-key-input').value.trim();
  const errorElement = document.getElementById('auth-error');

  if (ACCESS_KEYS[inputKey]) {
    errorElement.classList.add('hidden');
    localStorage.setItem('crm_access_key', inputKey);
    loginUser(inputKey);
  } else {
    errorElement.classList.remove('hidden');
  }
}

function loginUser(key) {
  currentUser = ACCESS_KEYS[key];
  
  if (currentUser.role === 'ADMIN') {
    currentBranchId = 'ALL';
  } else {
    currentBranchId = currentUser.branchId;
  }

  document.getElementById('user-role-badge').innerText = currentUser.name;
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');

  initBranchSelect();
  loadGuests();
}

function logout() {
  localStorage.removeItem('crm_access_key');
  currentUser = null;
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('access-key-input').value = '';
}

// УПРАВЛЕНИЕ ФИЛИАЛАМИ
function initBranchSelect() {
  const select = document.getElementById('branch-select');
  if (!select) return;

  if (currentUser.role === 'ADMIN') {
    select.disabled = false;
    let options = '<option value="ALL">🌐 Все филиалы (Вся сеть)</option>';
    
    const addedBranches = new Set();
    Object.values(ACCESS_KEYS).forEach(item => {
      if (item.branchId && !addedBranches.has(item.branchId)) {
        addedBranches.add(item.branchId);
        const cleanName = item.name.replace(/^(Управляющий — |Администратор — )/, '');
        options += `<option value="${item.branchId}">${cleanName}</option>`;
      }
    });
    
    select.innerHTML = options;
    select.value = currentBranchId || 'ALL';
  } else {
    select.disabled = true;
    const cleanName = currentUser.name.replace(/^(Управляющий — |Администратор — )/, '');
    select.innerHTML = `<option value="${currentUser.branchId}">${cleanName}</option>`;
    currentBranchId = currentUser.branchId;
  }
}

function changeBranch() {
  const select = document.getElementById('branch-select');
  currentBranchId = select.value;
  loadGuests();
}

// ЗАГРУЗКА ГОСТЕЙ И ЗАМЕТОК
async function loadGuests() {
  try {
    let query = supabaseClient.from('guests').select('*').order('created_at', { ascending: false });

    if (currentBranchId !== 'ALL') {
      query = query.eq('branch_id', currentBranchId);
    }

    const { data: guestsData, error: guestsErr } = await query;
    if (guestsErr) throw guestsErr;
    allGuests = guestsData || [];

    // Загружаем динамические заметки управляющего
    const { data: notesData } = await supabaseClient
      .from('guest_notes')
      .select('*')
      .order('created_at', { ascending: false });
    allNotes = notesData || [];

    updateStats();
    applyFilters();
  } catch (err) {
    console.error('Ошибка загрузки данных:', err);
    showToast('Ошибка загрузки данных из БД', 'error');
  }
}

// ФИЛЬТРАЦИЯ
function applyFilters() {
  const searchVal = document.getElementById('search').value.toLowerCase().trim();
  
  let filtered = allGuests.filter(guest => {
    const matchesSearch = (guest.full_name && guest.full_name.toLowerCase().includes(searchVal)) ||
                          (guest.phone && guest.phone.includes(searchVal));
    
    if (!matchesSearch) return false;

    if (currentFilter === 'VIP') return guest.category === 'VIP';
    if (currentFilter === 'BIRTHDAYS') return isBirthdaySoon(guest.birth_date);
    if (currentFilter === 'INACTIVE') return isInactive(guest.last_visit_date);

    return true;
  });

  renderGuests(filtered);
}

function setFilter(filterType) {
  currentFilter = filterType;
  
  const cards = {
    'ALL': 'card-total',
    'BIRTHDAYS': 'card-birthdays',
    'VIP': 'card-vip',
    'INACTIVE': 'card-inactive'
  };

  const names = {
    'ALL': 'Все гости',
    'BIRTHDAYS': 'Ближайшие ДР (3 дня)',
    'VIP': 'VIP клиенты',
    'INACTIVE': 'Не посещали > 30 дней'
  };

  Object.values(cards).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('ring-2', 'ring-indigo-500', 'border-2', 'border-emerald-500');
  });

  const activeEl = document.getElementById(cards[filterType]);
  if (activeEl) activeEl.classList.add('ring-2', 'ring-indigo-500');

  document.getElementById('filter-name-text').innerText = names[filterType];
  applyFilters();
}

// РЕНДЕР КАРТОЧЕК
function renderGuests(guests) {
  const container = document.getElementById('guests-list');
  container.innerHTML = '';

  if (guests.length === 0) {
    container.innerHTML = `
      <div class="bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200/80 space-y-2">
        <i data-lucide="users" class="w-10 h-10 mx-auto text-slate-300"></i>
        <p class="font-medium">Гости не найдены</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  guests.forEach(guest => {
    const card = document.createElement('div');
    card.className = 'bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200/80 space-y-3.5 hover:shadow-md transition';

    const categoryBadge = getCategoryBadge(guest.category);
    const formattedBirth = formatDate(guest.birth_date);
    const formattedLastVisit = formatDate(guest.last_visit_date);
    const visitsCount = guest.visit_count || 0;

    const cleanPhone = guest.phone ? guest.phone.replace(/[^0-9]/g, '') : '';
    const waText = encodeURIComponent(`Здравствуйте, ${guest.full_name}! Приглашаем вас в наш ресторан.`);
    const waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;

    // Заметки управляющего для данного гостя
    const guestNotesList = allNotes.filter(n => n.guest_id === guest.id);

    card.innerHTML = `
      <!-- Верхняя панель карточки -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="font-bold text-slate-900 text-base sm:text-lg">${escapeHtml(guest.full_name)}</h3>
          ${categoryBadge}
        </div>
        <div class="flex items-center gap-1.5 self-end sm:self-auto">
          <a href="${waUrl}" target="_blank" title="WhatsApp" class="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition">
            <i data-lucide="message-circle" class="w-4 h-4"></i>
          </a>
          <button onclick="addVisit('${guest.id}')" title="+1 Визит" class="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-semibold flex items-center gap-1 transition">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i> Визит
          </button>
          <button onclick="openEditModal('${guest.id}')" title="Изменить" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          ${currentUser && currentUser.canManageNotes ? `
            <button onclick="deleteGuest('${guest.id}')" title="Удалить карточку гостя" class="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Основная инфо о госте -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-600">
        <div class="flex items-center gap-2">
          <i data-lucide="phone" class="w-4 h-4 text-slate-400"></i>
          <span>${escapeHtml(guest.phone)}</span>
        </div>
        <div class="flex items-center gap-2">
          <i data-lucide="cake" class="w-4 h-4 text-slate-400"></i>
          <span>${formattedBirth || 'Не указана'}</span>
        </div>
        <div class="flex items-center gap-2">
          <i data-lucide="calendar" class="w-4 h-4 text-slate-400"></i>
          <span>Последний визит: <strong>${formattedLastVisit || 'Нет'}</strong></span>
        </div>
        <div class="flex items-center gap-2">
          <i data-lucide="history" class="w-4 h-4 text-slate-400"></i>
          <button onclick="showVisitsHistory('${guest.id}')" class="text-indigo-600 hover:underline font-semibold">
            Визитов: ${visitsCount} (История)
          </button>
        </div>
      </div>

      <!-- БЛОК 1: ПРЕДПОЧТЕНИЯ (Синий блок) -->
      ${guest.preferences ? `
        <div class="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl text-xs text-indigo-950 flex items-start justify-between gap-2">
          <div class="flex items-start gap-2">
            <i data-lucide="heart" class="w-4 h-4 text-indigo-500 shrink-0 mt-0.5"></i>
            <div>
              <strong class="font-bold text-indigo-900">Предпочтения:</strong> ${escapeHtml(guest.preferences)}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- БЛОК 2: ВАЖНО (Желтый блок) -->
      ${guest.important_notes ? `
        <div class="bg-amber-50/90 border border-amber-200/80 p-3 rounded-xl text-xs text-amber-950 flex items-start justify-between gap-2">
          <div class="flex items-start gap-2">
            <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
            <div>
              <strong class="font-bold text-amber-900">Важно:</strong> ${escapeHtml(guest.important_notes)}
            </div>
          </div>
        </div>
      ` : ''}

      <!-- БЛОК 3: ЗАМЕТКИ УПРАВЛЯЮЩЕГО СНИЗУ КАРТОЧКИ -->
      ${currentUser && currentUser.canManageNotes ? `
        <div class="border-t border-slate-100 pt-3 space-y-2">
          <p class="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <i data-lucide="sticky-note" class="w-3.5 h-3.5 text-amber-500"></i> Заметки управляющего:
          </p>

          <!-- Форма добавления заметки -->
          <div class="flex items-center gap-2">
            <input type="text" id="note-input-${guest.id}" placeholder="Введите новую заметку..." 
              class="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <button onclick="addManagerNote('${guest.id}')" class="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition shrink-0 flex items-center gap-1">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Добавить
            </button>
          </div>

          <!-- Список добавленных заметок -->
          <div class="space-y-1.5 max-h-40 overflow-y-auto pt-1">
            ${guestNotesList.length === 0 ? `
              <p class="text-[11px] text-slate-400 italic">Заметок пока нет</p>
            ` : guestNotesList.map(n => `
              <div class="text-xs bg-amber-50/60 border border-amber-200/60 p-2 rounded-xl flex items-center justify-between gap-2">
                <div class="flex flex-col">
                  <span class="text-slate-800 font-medium">${escapeHtml(n.text)}</span>
                  <span class="text-[10px] text-slate-400 mt-0.5">${n.author || 'Управляющий'} • ${new Date(n.created_at).toLocaleDateString()}</span>
                </div>
                <button onclick="deleteManagerNote('${n.id}')" title="Удалить заметку" class="p-1 text-amber-700 hover:text-rose-600 rounded-lg transition">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;

    container.appendChild(card);
  });

  lucide.createIcons();
}

// ДОБАВЛЕНИЕ И УДАЛЕНИЕ ЗАМЕТОК УПРАВЛЯЮЩЕГО
async function addManagerNote(guestId) {
  const input = document.getElementById(`note-input-${guestId}`);
  if (!input) return;

  const text = input.value.trim();
  if (!text) {
    showToast('Введите текст заметки', 'error');
    return;
  }

  try {
    const { error } = await supabaseClient.from('guest_notes').insert([{
      guest_id: guestId,
      text: text,
      author: currentUser.name
    }]);

    if (error) throw error;

    showToast('Заметка добавлена', 'success');
    loadGuests();
  } catch (err) {
    console.error('Ошибка добавления заметки:', err);
    showToast('Ошибка при сохранении заметки в БД', 'error');
  }
}

async function deleteManagerNote(noteId) {
  showConfirm('Удалить эту заметку?', async () => {
    try {
      const { error } = await supabaseClient.from('guest_notes').delete().eq('id', noteId);
      if (error) throw error;

      showToast('Заметка удалена', 'success');
      loadGuests();
    } catch (err) {
      console.error('Ошибка удаления заметки:', err);
      showToast('Ошибка при удалении заметки', 'error');
    }
  });
}

// СТАТИСТИКА
function updateStats() {
  document.getElementById('stat-total').innerText = allGuests.length;
  document.getElementById('stat-vip').innerText = allGuests.filter(g => g.category === 'VIP').length;
  document.getElementById('stat-birthdays').innerText = allGuests.filter(g => isBirthdaySoon(g.birth_date)).length;
  document.getElementById('stat-inactive').innerText = allGuests.filter(g => isInactive(g.last_visit_date)).length;
}

function openCreateModal() {
  document.getElementById('edit_guest_id').value = '';
  document.getElementById('add-guest-form').reset();
  document.getElementById('modal-title').innerText = 'Новый гость';
  toggleModal(true);
}

function openEditModal(guestId) {
  const guest = allGuests.find(g => g.id === guestId);
  if (!guest) return;

  document.getElementById('edit_guest_id').value = guest.id;
  document.getElementById('full_name').value = guest.full_name || '';
  document.getElementById('phone').value = guest.phone || '';
  document.getElementById('birth_date').value = guest.birth_date || '';
  document.getElementById('category').value = guest.category || 'NEW';
  document.getElementById('preferences').value = guest.preferences || '';
  document.getElementById('important_notes').value = guest.important_notes || '';

  document.getElementById('modal-title').innerText = 'Редактировать гостя';
  toggleModal(true);
}

// СОХРАНЕНИЕ И ОБНОВЛЕНИЕ ГОСТЯ
async function saveGuest(e) {
  e.preventDefault();

  const id = document.getElementById('edit_guest_id').value;
  const full_name = document.getElementById('full_name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const birth_date = document.getElementById('birth_date').value || null;
  const category = document.getElementById('category').value;
  const preferences = document.getElementById('preferences').value.trim() || null;
  const important_notes = document.getElementById('important_notes').value.trim() || null;

  const branch_id = (currentBranchId !== 'ALL') ? currentBranchId : (currentUser.branchId || '11111111-1111-1111-1111-111111111111');

  const payload = {
    full_name,
    phone,
    birth_date,
    category,
    preferences,
    important_notes,
    branch_id
  };

  try {
    if (id) {
      const { error } = await supabaseClient.from('guests').update(payload).eq('id', id);
      if (error) throw error;
      showToast('Данные гостя обновлены', 'success');
    } else {
      payload.visit_count = 1;
      payload.last_visit_date = new Date().toISOString().split('T')[0];
      const { data, error } = await supabaseClient.from('guests').insert([payload]).select();
      if (error) throw error;

      if (data && data[0]) {
        await supabaseClient.from('visit_history').insert([{
          guest_id: data[0].id,
          visit_date: payload.last_visit_date,
          branch_id: branch_id
        }]);
      }

      showToast('Новый гость сохранен', 'success');
    }

    toggleModal(false);
    loadGuests();
  } catch (err) {
    console.error(err);
    showToast('Ошибка при сохранении', 'error');
  }
}

async function deleteGuest(id) {
  showConfirm('Вы уверены, что хотите полностью удалить этого гостя?', async () => {
    try {
      const { error } = await supabaseClient.from('guests').delete().eq('id', id);
      if (error) throw error;
      showToast('Гость удален', 'success');
      loadGuests();
    } catch (err) {
      showToast('Ошибка при удалении', 'error');
    }
  });
}

// ФИКСАЦИЯ ВИЗИТА
async function addVisit(guestId) {
  const guest = allGuests.find(g => g.id === guestId);
  if (!guest) return;

  const today = new Date().toISOString().split('T')[0];
  const newCount = (guest.visit_count || 0) + 1;
  const targetBranch = (currentBranchId !== 'ALL') ? currentBranchId : (guest.branch_id || '11111111-1111-1111-1111-111111111111');

  try {
    // 1. Обновляем счетчик у карточки гостя
    const { error: guestErr } = await supabaseClient
      .from('guests')
      .update({ visit_count: newCount, last_visit_date: today })
      .eq('id', guestId);

    if (guestErr) throw guestErr;

    // 2. Вставляем запись в историю визитов
    const { error: visitErr } = await supabaseClient.from('visit_history').insert([{
      guest_id: guestId,
      visit_date: today,
      branch_id: targetBranch
    }]);

    if (visitErr) console.warn('Ошибка фиксации истории визитов:', visitErr);

    showToast('Визит успешно зафиксирован!', 'success');
    loadGuests();
  } catch (err) {
    console.error('Ошибка записи визита:', err);
    showToast('Ошибка при фиксации визита в БД', 'error');
  }
}

// ИСТОРИЯ ВИЗИТОВ
async function showVisitsHistory(guestId) {
  const container = document.getElementById('visits-modal-list');
  container.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">Загрузка истории...</p>';
  toggleVisitsModal(true);

  try {
    const { data, error } = await supabaseClient
      .from('visit_history')
      .select('*')
      .eq('guest_id', guestId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">История визитов пуста</p>';
      return;
    }

    container.innerHTML = data.map(v => {
      const timeStr = v.created_at ? new Date(v.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
      return `
        <div class="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-100">
          <div class="flex items-center gap-2">
            <span>📅 ${formatDate(v.visit_date)}</span>
            <span class="text-slate-400">${timeStr}</span>
          </div>
          ${currentUser && currentUser.canManageNotes ? `
            <button onclick="deleteVisit('${v.id}', '${guestId}')" title="Удалить визит" class="p-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

    lucide.createIcons();
  } catch (err) {
    console.error('Ошибка получения истории:', err);
    container.innerHTML = '<p class="text-xs text-rose-500 text-center py-4">Ошибка загрузки истории</p>';
  }
}

async function deleteVisit(visitId, guestId) {
  showConfirm('Удалить этот визит из истории?', async () => {
    try {
      const { error } = await supabaseClient.from('visit_history').delete().eq('id', visitId);
      if (error) throw error;

      const guest = allGuests.find(g => g.id === guestId);
      if (guest) {
        const newCount = Math.max(0, (guest.visit_count || 1) - 1);
        await supabaseClient.from('guests').update({ visit_count: newCount }).eq('id', guestId);
      }

      showToast('Визит удален', 'success');
      showVisitsHistory(guestId);
      loadGuests();
    } catch (err) {
      console.error(err);
      showToast('Ошибка при удалении визита', 'error');
    }
  });
}

// ЭКСПОРТ
function exportToCSV() {
  if (allGuests.length === 0) {
    showToast('Нет данных для экспорта', 'error');
    return;
  }

  let csvContent = '\uFEFF';
  csvContent += 'ФИО;Телефон;Дата рождения;Категория;Предпочтения;Важно;Визитов;Последний визит\n';

  allGuests.forEach(g => {
    const row = [
      `"${g.full_name || ''}"`,
      `"${g.phone || ''}"`,
      `"${g.birth_date || ''}"`,
      `"${g.category || ''}"`,
      `"${g.preferences || ''}"`,
      `"${g.important_notes || ''}"`,
      `"${g.visit_count || 0}"`,
      `"${g.last_visit_date || ''}"`
    ];
    csvContent += row.join(';') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `guests_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function isBirthdaySoon(birthDateStr) {
  if (!birthDateStr) return false;
  const today = new Date();
  const bdate = new Date(birthDateStr);
  
  const nextBday = new Date(today.getFullYear(), bdate.getMonth(), bdate.getDate());
  if (nextBday < today) {
    nextBday.setFullYear(today.getFullYear() + 1);
  }

  const diffTime = nextBday - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 3;
}

function isInactive(lastVisitStr) {
  if (!lastVisitStr) return true;
  const today = new Date();
  const lastVisit = new Date(lastVisitStr);
  const diffTime = today - lastVisit;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 30;
}

function getCategoryBadge(cat) {
  const map = {
    'VIP': '<span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-200">⭐ VIP</span>',
    'REGULAR': '<span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800 border border-blue-200">Постоянный</span>',
    'NEW': '<span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">Новый</span>',
    'PROBLEM': '<span class="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 text-rose-800 border border-rose-200">Проблема</span>'
  };
  return map[cat] || '';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatPhoneInput(e) {
  let val = e.target.value.replace(/\D/g, '');
  if (!val.startsWith('996')) val = '996' + val;
  e.target.value = '+' + val.substring(0, 12);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-slate-800';
  toast.className = `${bg} text-white text-xs sm:text-sm font-semibold px-4 py-3 rounded-xl shadow-lg pointer-events-auto flex items-center gap-2 transition-all duration-300 transform translate-y-2`;
  toast.innerText = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-4');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function toggleModal(show) {
  document.getElementById('guest-modal').classList.toggle('hidden', !show);
}

function toggleVisitsModal(show) {
  document.getElementById('visits-modal').classList.toggle('hidden', !show);
}

function showConfirm(text, callback) {
  document.getElementById('confirm-text').innerText = text;
  confirmCallback = callback;
  document.getElementById('confirm-modal').classList.remove('hidden');

  document.getElementById('confirm-ok-btn').onclick = () => {
    if (confirmCallback) confirmCallback();
    closeConfirmModal();
  };
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
}