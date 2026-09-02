let currentSession = null;
let allGuests = [];
let currentFilterMode = 'ALL';

// --- Авторизация и Сессии ---
function handleAuth(e) {
  e.preventDefault();
  const key = document.getElementById('access-key-input').value.trim();
  
  if (ACCESS_KEYS[key]) {
    currentSession = ACCESS_KEYS[key];
    localStorage.setItem('crm_access_key', key);
    initApp();
  } else {
    document.getElementById('auth-error').classList.remove('hidden');
  }
}

function checkSavedSession() {
  const savedKey = localStorage.getItem('crm_access_key');
  if (savedKey && ACCESS_KEYS[savedKey]) {
    currentSession = ACCESS_KEYS[savedKey];
    initApp();
  }
}

function logout() {
  localStorage.removeItem('crm_access_key');
  currentSession = null;
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('access-key-input').value = '';
}

function initApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  document.getElementById('user-role-badge').innerText = currentSession.name;

  const branchSelect = document.getElementById('branch-select');
  const exportBtn = document.getElementById('export-btn');

  if (currentSession.role === 'BRANCH_MANAGER') {
    branchSelect.value = currentSession.branchId;
    branchSelect.disabled = true;
    exportBtn.classList.add('hidden');
  } else {
    branchSelect.value = 'ALL';
    branchSelect.disabled = false;
    exportBtn.classList.remove('hidden');
  }

  loadGuests();
}

// --- Загрузка данных и статистика ---
async function loadGuests() {
  const branchId = document.getElementById('branch-select').value;
  
  let query = supabaseClient.from('guests').select('*, guest_comments(*), visit_history(*)');
  
  if (branchId !== 'ALL') {
    query = query.eq('branch_id', branchId);
  }

  const { data: guests, error } = await query.order('created_at', { ascending: false });

  if (error) {
    document.getElementById('guests-list').innerHTML = `<div class="p-4 bg-red-50 text-red-600 rounded-xl text-xs sm:text-sm">Ошибка: ${error.message}</div>`;
    return;
  }
  allGuests = guests || [];
  updateStats();
  applyFilters();
}

function changeBranch() {
  loadGuests();
}

function isBirthdaySoon(dateStr, daysAhead = 7) {
  if (!dateStr) return false;
  const today = new Date();
  const birthDate = new Date(dateStr);
  
  const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }

  const diffTime = nextBirthday - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= daysAhead;
}

function updateStats() {
  document.getElementById('stat-total').innerText = allGuests.length;
  document.getElementById('stat-vip').innerText = allGuests.filter(g => g.category === 'VIP').length;
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

  const inactiveCount = allGuests.filter(g => {
    if (!g.visit_history || g.visit_history.length === 0) return true;
    const lastVisit = new Date(Math.max(...g.visit_history.map(v => new Date(v.visit_date))));
    return lastVisit < thirtyDaysAgo;
  }).length;
  document.getElementById('stat-inactive').innerText = inactiveCount;

  const upcomingBirthdays = allGuests.filter(g => isBirthdaySoon(g.birth_date, 7)).length;
  document.getElementById('stat-birthdays').innerText = upcomingBirthdays;
}

// --- Фильтрация и поиск ---
function setFilter(mode) {
  currentFilterMode = mode;
  
  ['total', 'vip', 'inactive', 'birthdays'].forEach(m => {
    document.getElementById(`card-${m}`).classList.remove('border-2', 'border-emerald-500', 'border-indigo-500', 'border-rose-500', 'border-amber-500');
  });

  const badgeText = document.getElementById('filter-name-text');

  if (mode === 'VIP') {
    document.getElementById('card-vip').classList.add('border-2', 'border-indigo-500');
    badgeText.innerText = '⭐ VIP-гости';
  } else if (mode === 'INACTIVE') {
    document.getElementById('card-inactive').classList.add('border-2', 'border-rose-500');
    badgeText.innerText = '⚠️ Не были > 30 дней';
  } else if (mode === 'BIRTHDAYS') {
    document.getElementById('card-birthdays').classList.add('border-2', 'border-amber-500');
    badgeText.innerText = '🎂 ДР в ближайшие 7 дней';
  } else {
    document.getElementById('card-total').classList.add('border-2', 'border-emerald-500');
    badgeText.innerText = 'Все гости';
  }

  applyFilters();
}

function applyFilters() {
  const q = document.getElementById('search').value.toLowerCase();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

  let filtered = allGuests.filter(g => {
    const matchesSearch = g.full_name.toLowerCase().includes(q) || g.phone.includes(q);
    if (!matchesSearch) return false;

    if (currentFilterMode === 'VIP') return g.category === 'VIP';
    if (currentFilterMode === 'BIRTHDAYS') return isBirthdaySoon(g.birth_date, 7);
    if (currentFilterMode === 'INACTIVE') {
      if (!g.visit_history || g.visit_history.length === 0) return true;
      const lastVisit = new Date(Math.max(...g.visit_history.map(v => new Date(v.visit_date))));
      return lastVisit < thirtyDaysAgo;
    }
    return true;
  });

  renderGuests(filtered);
}

// --- Рендеринг карточек гостей ---
function renderGuests(guests) {
  const container = document.getElementById('guests-list');
  if (!guests.length) {
    container.innerHTML = `<div class="p-8 bg-white rounded-2xl text-center text-slate-400 text-sm">Гости не найдены</div>`;
    return;
  }

  container.innerHTML = guests.map(guest => {
    const visits = guest.visit_history || [];
    const comments = guest.guest_comments || [];
    
    let lastVisitStr = 'Нет визитов';
    if (visits.length > 0) {
      const sortedVisits = visits.sort((a,b) => new Date(b.visit_date) - new Date(a.visit_date));
      lastVisitStr = new Date(sortedVisits[0].visit_date).toLocaleDateString('ru-RU');
    }

    const birthdayWarning = isBirthdaySoon(guest.birth_date, 7) ? '🎉 <span class="text-amber-600 font-bold">Скоро ДР!</span>' : '';
    const missingPreferences = !guest.preferences ? '<span class="text-amber-600 text-xs font-semibold block mt-0.5">⚠️ Укажите предпочтения!</span>' : '';

    return `
    <div class="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3 border-slate-100">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-base sm:text-lg font-bold text-slate-900">${guest.full_name}</h2>
            <span class="px-2 py-0.5 rounded text-[11px] font-bold ${getCategoryBadge(guest.category)}">
              ${guest.category}
            </span>
            ${birthdayWarning}
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">📞 ${guest.phone}</p>
        </div>
        
        <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-0 border-slate-100">
          <button onclick="openEditModal('${guest.id}')" title="Редактировать данные" class="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition text-center">
            ✏️ <span class="inline sm:hidden lg:inline">Изменить</span>
          </button>
          <button onclick="openVisitsModal('${guest.id}')" title="Управление визитами" class="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition text-center">
            ⚙️ <span class="inline sm:hidden lg:inline">Визиты</span>
          </button>
          <button onclick="recordVisit('${guest.id}')" class="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-sm text-center">
            + Визит
          </button>
          <button onclick="deleteGuest('${guest.id}')" title="Удалить карточку гостя" class="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold px-2.5 py-1.5 rounded-lg transition">
            🗑️
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
        <div class="bg-slate-50/50 p-2.5 rounded-xl sm:bg-transparent sm:p-0">
          <span class="font-medium text-slate-500 text-[11px] block">🎂 День рождения</span>
          <p class="text-slate-800 font-semibold mt-0.5">${formatBirthDate(guest.birth_date)}</p>
        </div>
        <div class="bg-slate-50/50 p-2.5 rounded-xl sm:bg-transparent sm:p-0">
          <span class="font-medium text-slate-500 text-[11px] block">📅 Последний визит</span>
          <p class="text-slate-800 font-semibold mt-0.5">${lastVisitStr} <button onclick="openVisitsModal('${guest.id}')" class="text-xs text-indigo-600 underline font-normal ml-1">(${visits.length} всего)</button></p>
        </div>
        <div class="bg-slate-50/50 p-2.5 rounded-xl sm:bg-transparent sm:p-0">
          <span class="font-medium text-slate-500 text-[11px] block">❤️ Предпочтения</span>
          <p class="text-slate-800 mt-0.5">${guest.preferences || 'Не указаны'}</p>
          ${missingPreferences}
        </div>
      </div>

      ${guest.important_info ? `
        <div class="bg-amber-50 p-3 rounded-xl text-xs text-amber-900 border border-amber-200/60 leading-relaxed">
          <strong>💬 Важное:</strong> ${guest.important_info}
        </div>
      ` : ''}

      <!-- Заметки управляющих -->
      <div class="pt-2 border-t border-slate-100 space-y-2">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Заметки управляющих</span>
        
        <div class="space-y-1.5">
          ${comments.length === 0 ? '<p class="text-xs text-slate-400 italic">Комментариев пока нет</p>' : ''}
          ${comments.map(c => {
            // Безопасное экранирование текста заметки для атрибута onclick
            const safeText = (c.comment || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            return `
              <div class="bg-slate-50 p-2.5 rounded-xl text-xs flex justify-between items-center border border-slate-100 gap-2">
                <p class="text-slate-700 leading-relaxed flex-1">${c.comment}</p>
                
                <div class="flex items-center gap-1 shrink-0">
                  <span class="text-[10px] text-slate-400 font-medium mr-1">
                    ${new Date(c.created_at).toLocaleDateString('ru-RU')}
                  </span>
                  <button onclick="editComment('${c.id}', '${safeText}')" title="Редактировать заметку" class="p-1 hover:bg-slate-200 rounded text-slate-600 transition">✏️</button>
                  <button onclick="deleteComment('${c.id}')" title="Удалить заметку" class="p-1 hover:bg-rose-100 rounded text-rose-600 transition">🗑️</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="flex gap-2 pt-1">
          <input type="text" id="comment-input-${guest.id}" placeholder="Добавить заметку о госте..." 
            class="flex-1 text-base sm:text-xs px-3 py-2 sm:py-1.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500">
          <button onclick="addComment('${guest.id}')" class="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3.5 py-2 sm:py-1.5 rounded-xl font-medium transition shrink-0">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

function formatBirthDate(dateStr) {
  if (!dateStr) return 'Не указан';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function getCategoryBadge(cat) {
  switch(cat) {
    case 'VIP': return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
    case 'PROBLEM': return 'bg-rose-100 text-rose-800 border border-rose-200';
    case 'REGULAR': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    default: return 'bg-slate-100 text-slate-800 border border-slate-200';
  }
}

// --- Управление заметками (CRUD) ---
async function addComment(guestId) {
  const input = document.getElementById(`comment-input-${guestId}`);
  const text = input.value.trim();
  if (!text) return;

  const { error } = await supabaseClient.from('guest_comments').insert([{ guest_id: guestId, comment: text }]);
  if (error) alert('Ошибка при добавлении заметки: ' + error.message);
  else loadGuests();
}

async function editComment(commentId, currentText) {
  const newText = prompt('Редактировать заметку:', currentText);
  if (newText === null) return;
  if (!newText.trim()) return alert('Заметка не может быть пустой');

  const { error } = await supabaseClient
    .from('guest_comments')
    .update({ comment: newText.trim() })
    .eq('id', commentId);

  if (error) alert('Ошибка при обновлении заметки: ' + error.message);
  else loadGuests();
}

async function deleteComment(commentId) {
  if (!confirm('Вы точно хотите удалить эту заметку?')) return;

  const { error } = await supabaseClient
    .from('guest_comments')
    .delete()
    .eq('id', commentId);

  if (error) alert('Ошибка при удалении заметки: ' + error.message);
  else loadGuests();
}

// --- Управление модальными окнами и гостями ---
function toggleModal(show) {
  document.getElementById('guest-modal').classList.toggle('hidden', !show);
}

function toggleVisitsModal(show) {
  document.getElementById('visits-modal').classList.toggle('hidden', !show);
}

function openCreateModal() {
  document.getElementById('modal-title').innerText = 'Новый гость';
  document.getElementById('edit_guest_id').value = '';
  document.getElementById('add-guest-form').reset();
  toggleModal(true);
}

function openEditModal(guestId) {
  const guest = allGuests.find(g => g.id === guestId);
  if (!guest) return;

  document.getElementById('modal-title').innerText = 'Редактировать гостя';
  document.getElementById('edit_guest_id').value = guest.id;
  document.getElementById('full_name').value = guest.full_name || '';
  document.getElementById('phone').value = guest.phone || '';
  document.getElementById('birth_date').value = guest.birth_date || '';
  document.getElementById('category').value = guest.category || 'NEW';
  document.getElementById('preferences').value = guest.preferences || '';
  document.getElementById('important_info').value = guest.important_info || '';

  toggleModal(true);
}

async function saveGuest(e) {
  e.preventDefault();
  const guestId = document.getElementById('edit_guest_id').value;
  const currentBranch = document.getElementById('branch-select').value;
  const targetBranch = currentBranch === 'ALL' ? '11111111-1111-1111-1111-111111111111' : currentBranch;

  const birthDateVal = document.getElementById('birth_date').value;

  const guestData = {
    full_name: document.getElementById('full_name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    birth_date: birthDateVal ? birthDateVal : null,
    category: document.getElementById('category').value,
    preferences: document.getElementById('preferences').value.trim(),
    important_info: document.getElementById('important_info').value.trim()
  };

  let error;
  if (guestId) {
    ({ error } = await supabaseClient.from('guests').update(guestData).eq('id', guestId));
  } else {
    ({ error } = await supabaseClient.from('guests').insert([{ ...guestData, branch_id: targetBranch }]));
  }

  if (error) {
    alert('Ошибка сохранения: ' + error.message);
  } else {
    toggleModal(false);
    loadGuests();
  }
}

async function deleteGuest(guestId) {
  const guest = allGuests.find(g => g.id === guestId);
  if (!guest) return;

  if (!confirm(`Вы действительно хотите удалить гостя ${guest.full_name}?\nВсе связанные заметки и история визитов также будут удалены.`)) {
    return;
  }

  await supabaseClient.from('visit_history').delete().eq('guest_id', guestId);
  await supabaseClient.from('guest_comments').delete().eq('guest_id', guestId);

  const { error } = await supabaseClient.from('guests').delete().eq('id', guestId);

  if (error) {
    alert('Ошибка при удалении: ' + error.message);
  } else {
    loadGuests();
  }
}

// --- Управление визитами ---
async function recordVisit(guestId) {
  const guest = allGuests.find(g => g.id === guestId);
  const visits = guest?.visit_history || [];
  const todayDate = new Date().toDateString();

  const hasVisitToday = visits.some(v => new Date(v.visit_date).toDateString() === todayDate);

  if (hasVisitToday) {
    if (!confirm(`Для гостя ${guest.full_name} сегодня уже был отмечен визит.\nВы точно хотите добавить еще один?`)) {
      return;
    }
  }

  const { error } = await supabaseClient.from('visit_history').insert([{ guest_id: guestId }]);
  if (error) {
    alert('Ошибка: ' + error.message);
  } else {
    const note = prompt(`Визит гостя ${guest.full_name} отмечен!\nДобавить короткую заметку (что заказывал, впечатления)?`);
    if (note && note.trim()) {
      await supabaseClient.from('guest_comments').insert([{ guest_id: guestId, comment: note.trim() }]);
    }
    loadGuests();
  }
}

function openVisitsModal(guestId) {
  const guest = allGuests.find(g => g.id === guestId);
  const visits = (guest?.visit_history || []).sort((a,b) => new Date(b.visit_date) - new Date(a.visit_date));
  
  const container = document.getElementById('visits-modal-list');
  if (visits.length === 0) {
    container.innerHTML = '<p class="text-slate-400 text-xs text-center py-4">У гостя пока нет зафиксированных визитов</p>';
  } else {
    container.innerHTML = visits.map(v => `
      <div class="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl text-xs border border-slate-200">
        <div>
          <span class="font-medium text-slate-800">🗓️ ${new Date(v.visit_date).toLocaleString('ru-RU')}</span>
        </div>
        <button onclick="deleteVisit('${v.id}', '${guestId}')" class="text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 transition">
          Удалить
        </button>
      </div>
    `).join('');
  }
  toggleVisitsModal(true);
}

async function deleteVisit(visitId, guestId) {
  if (!confirm('Отменить и удалить эту запись о визите?')) return;

  const { error } = await supabaseClient.from('visit_history').delete().eq('id', visitId);
  if (error) {
    alert('Ошибка удаления: ' + error.message);
  } else {
    await loadGuests();
    openVisitsModal(guestId);
  }
}

// --- Экспорт в CSV ---
function exportToCSV() {
  if (!allGuests.length) {
    alert('Нет данных для экспорта');
    return;
  }

  const headers = ['Имя', 'Телефон', 'Дата рождения', 'Категория', 'Предпочтения', 'Важное'];
  const rows = allGuests.map(g => [
    `"${(g.full_name || '').replace(/"/g, '""')}"`,
    `"${(g.phone || '').replace(/"/g, '""')}"`,
    `"${g.birth_date || ''}"`,
    `"${g.category || ''}"`,
    `"${(g.preferences || '').replace(/"/g, '""')}"`,
    `"${(g.important_info || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `guests_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- Старт приложения ---
document.addEventListener('DOMContentLoaded', () => {
  checkSavedSession();
});