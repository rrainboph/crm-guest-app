// js/app.js
let currentSession = null;
let allGuests = [];
let currentFilterMode = 'ALL';

// --- УВЕДОМЛЕНИЯ И МОДАЛКИ ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-indigo-600';
  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info';
  
  toast.className = `${bgColor} text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs sm:text-sm font-medium transform translate-y-2 opacity-0 transition-all duration-300 pointer-events-auto border border-white/10`;
  toast.innerHTML = `<i data-lucide="${iconName}" class="w-4 h-4 shrink-0"></i> <span>${message}</span>`;
  
  container.appendChild(toast);
  lucide.createIcons();

  requestAnimationFrame(() => toast.classList.remove('translate-y-2', 'opacity-0'));

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showConfirm(title, text, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-title').innerText = title;
  document.getElementById('confirm-text').innerText = text;
  
  const okBtn = document.getElementById('confirm-ok-btn');
  const newOkBtn = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOkBtn, okBtn);
  
  newOkBtn.addEventListener('click', () => {
    closeConfirmModal();
    onConfirm();
  });
  
  modal.classList.remove('hidden');
  lucide.createIcons();
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
}

function showPrompt(title, placeholder, defaultValue, onConfirm) {
  const modal = document.getElementById('prompt-modal');
  document.getElementById('prompt-title').innerText = title;
  const input = document.getElementById('prompt-input');
  input.placeholder = placeholder || '';
  input.value = defaultValue || '';
  
  const okBtn = document.getElementById('prompt-ok-btn');
  const newOkBtn = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOkBtn, okBtn);
  
  newOkBtn.addEventListener('click', () => {
    const val = input.value.trim();
    closePromptModal();
    onConfirm(val);
  });
  
  modal.classList.remove('hidden');
  input.focus();
  lucide.createIcons();
}

function closePromptModal() {
  document.getElementById('prompt-modal').classList.add('hidden');
}

function formatPhoneInput(e) {
  let input = e.target.value.replace(/\D/g, '');
  if (!input.startsWith('996')) {
    if (input.startsWith('0')) input = '996' + input.slice(1);
    else if (input.length > 0) input = '996' + input;
  }
  input = input.substring(0, 12);
  let formatted = '+996';
  if (input.length > 3) formatted += ' (' + input.substring(3, 6);
  if (input.length >= 6) formatted += ') ' + input.substring(6, 9);
  if (input.length >= 9) formatted += '-' + input.substring(9, 11);
  if (input.length >= 11) formatted += '-' + input.substring(11, 12);
  e.target.value = formatted;
}

// --- ОТПРАВКА ПРИГЛАШЕНИЯ В WHATSAPP ---
function sendBirthdayInvite(phone, fullName) {
  if (!phone) return showToast('У гостя не указан номер телефона', 'error');

  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '996' + cleanPhone.slice(1);
  if (!cleanPhone.startsWith('996') && cleanPhone.length === 9) cleanPhone = '996' + cleanPhone;

  const firstName = fullName ? fullName.split(' ')[0] : 'гость';

  const message = `Здравствуйте, ${firstName}! 👋\n\n` +
                  `Команда нашего заведения от всей души поздравляет вас с наступающим Днем рождения! 🎂\n\n` +
                  `В честь праздника мы приготовили для вас подарок — скидку 10% на весь чек и фирменный десерт от шефа! 🎉\n\n` +
                  `Скидка действует в день рождения и 3 дня после него. Желаете забронировать столик для себя и близких?`;

  const encodedText = encodeURIComponent(message);
  window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
}

// --- АВТОРИЗАЦИЯ ---
function handleAuth(e) {
  if (e) e.preventDefault();
  const keyInput = document.getElementById('access-key-input');
  const errEl = document.getElementById('auth-error');
  if (!keyInput) return;
  const key = keyInput.value.trim();
  
  if (ACCESS_KEYS[key]) {
    currentSession = ACCESS_KEYS[key];
    localStorage.setItem('crm_access_key', key);
    if (errEl) errEl.classList.add('hidden');
    showToast(`Добро пожаловать, ${currentSession.name}!`, 'info');
    initApp();
  } else {
    if (errEl) errEl.classList.remove('hidden');
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
  showToast('Вы вышли из системы', 'info');
}

function initApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  
  const roleBadge = document.getElementById('user-role-badge');
  if (roleBadge) roleBadge.innerHTML = `<i data-lucide="shield-check" class="w-3.5 h-3.5"></i> ${currentSession.name}`;

  const branchSelect = document.getElementById('branch-select');
  if (branchSelect) {
    if (currentSession.role === 'BRANCH_MANAGER') {
      branchSelect.value = currentSession.branchId;
      branchSelect.disabled = true;
    } else {
      branchSelect.value = 'ALL';
      branchSelect.disabled = false;
    }
  }

  loadGuests();
}

// --- ЗАГРУЗКА И ФИЛЬТРАЦИЯ ---
async function loadGuests() {
  renderSkeletons();
  const branchSelect = document.getElementById('branch-select');
  const branchId = branchSelect ? branchSelect.value : 'ALL';
  
  let query = supabaseClient.from('guests').select('*, guest_comments(*), visit_history(*)');
  if (branchId !== 'ALL') query = query.eq('branch_id', branchId);

  const { data: guests, error } = await query.order('created_at', { ascending: false });

  if (error) {
    document.getElementById('guests-list').innerHTML = `
      <div class="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs sm:text-sm flex items-center gap-2">
        <i data-lucide="alert-circle" class="w-5 h-5"></i> Ошибка загрузки: ${error.message}
      </div>`;
    lucide.createIcons();
    return;
  }

  allGuests = guests || [];
  updateStats();
  applyFilters();
}

function renderSkeletons() {
  const container = document.getElementById('guests-list');
  if (!container) return;
  container.innerHTML = [1, 2, 3].map(() => `
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 space-y-4 animate-skeleton">
      <div class="flex justify-between items-center">
        <div class="h-6 bg-slate-200 rounded-lg w-1/3"></div>
        <div class="h-8 bg-slate-200 rounded-lg w-1/4"></div>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div class="h-10 bg-slate-100 rounded-xl"></div>
        <div class="h-10 bg-slate-100 rounded-xl"></div>
        <div class="h-10 bg-slate-100 rounded-xl"></div>
      </div>
    </div>
  `).join('');
}

function changeBranch() { loadGuests(); }

// Изменено по умолчанию на 3 дня
function isBirthdaySoon(dateStr, daysAhead = 3) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const birthDate = new Date(dateStr);
  const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }
  
  const diffDays = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= daysAhead;
}

function updateStats() {
  const totalEl = document.getElementById('stat-total');
  const vipEl = document.getElementById('stat-vip');
  const inactiveEl = document.getElementById('stat-inactive');
  const bdayEl = document.getElementById('stat-birthdays');

  if (totalEl) totalEl.innerText = allGuests.length;
  if (vipEl) vipEl.innerText = allGuests.filter(g => g.category === 'VIP').length;
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

  const inactiveCount = allGuests.filter(g => {
    if (!g.visit_history || g.visit_history.length === 0) return true;
    const lastVisit = new Date(Math.max(...g.visit_history.map(v => new Date(v.visit_date))));
    return lastVisit < thirtyDaysAgo;
  }).length;

  if (inactiveEl) inactiveEl.innerText = inactiveCount;
  if (bdayEl) bdayEl.innerText = allGuests.filter(g => isBirthdaySoon(g.birth_date, 3)).length;
}

function setFilter(mode) {
  currentFilterMode = mode;
  ['total', 'vip', 'inactive', 'birthdays'].forEach(m => {
    document.getElementById(`card-${m}`)?.classList.remove('border-2', 'border-emerald-500', 'border-indigo-500', 'border-rose-500', 'border-amber-500');
  });

  const badgeText = document.getElementById('filter-name-text');
  if (mode === 'VIP') {
    document.getElementById('card-vip')?.classList.add('border-2', 'border-indigo-500');
    if (badgeText) badgeText.innerText = '⭐ VIP-гости';
  } else if (mode === 'INACTIVE') {
    document.getElementById('card-inactive')?.classList.add('border-2', 'border-rose-500');
    if (badgeText) badgeText.innerText = '⚠️ Не были > 30 дней';
  } else if (mode === 'BIRTHDAYS') {
    document.getElementById('card-birthdays')?.classList.add('border-2', 'border-amber-500');
    if (badgeText) badgeText.innerText = '🎂 ДР в ближайшие 3 дня';
  } else {
    document.getElementById('card-total')?.classList.add('border-2', 'border-emerald-500');
    if (badgeText) badgeText.innerText = 'Все гости';
  }

  applyFilters();
}

function applyFilters() {
  const searchInput = document.getElementById('search');
  const q = searchInput ? searchInput.value.toLowerCase() : '';
  const now = new Date();
  const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

  let filtered = allGuests.filter(g => {
    const matchesSearch = (g.full_name || '').toLowerCase().includes(q) || (g.phone || '').includes(q);
    if (!matchesSearch) return false;

    if (currentFilterMode === 'VIP') return g.category === 'VIP';
    if (currentFilterMode === 'BIRTHDAYS') return isBirthdaySoon(g.birth_date, 3);
    if (currentFilterMode === 'INACTIVE') {
      if (!g.visit_history || g.visit_history.length === 0) return true;
      const lastVisit = new Date(Math.max(...g.visit_history.map(v => new Date(v.visit_date))));
      return lastVisit < thirtyDaysAgo;
    }
    return true;
  });

  renderGuests(filtered);
}

// --- РЕНДЕРИНГ И РАБОТА С ГОСТЯМИ ---
function renderGuests(guests) {
  const container = document.getElementById('guests-list');
  if (!container) return;

  if (!guests.length) {
    container.innerHTML = `<div class="p-8 bg-white rounded-2xl text-center text-slate-400 text-sm border border-slate-200/80">Гости не найдены</div>`;
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

    const hasBirthdaySoon = isBirthdaySoon(guest.birth_date, 3);
    const birthdayWarning = hasBirthdaySoon ? `
      <div class="inline-flex items-center gap-1.5 flex-wrap">
        <span class="inline-flex items-center gap-1 text-amber-600 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
          <i data-lucide="cake" class="w-3.5 h-3.5"></i> Скоро ДР!
        </span>
        <button onclick="sendBirthdayInvite('${guest.phone}', '${guest.full_name}')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md transition shadow-sm flex items-center gap-1 active:scale-95">
          <i data-lucide="message-square" class="w-3 h-3"></i> Пригласить в WA
        </button>
      </div>` : '';

    const missingPreferences = !guest.preferences ? '<span class="text-amber-600 text-xs font-semibold block mt-0.5 flex items-center gap-1"><i data-lucide="alert-circle" class="w-3 h-3"></i> Укажите предпочтения</span>' : '';

    return `
    <div class="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200/80 space-y-4 hover:shadow-md transition-all duration-200">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3 border-slate-100">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-base sm:text-lg font-bold text-slate-900">${guest.full_name}</h2>
            <span class="px-2.5 py-0.5 rounded-md text-[11px] font-bold ${getCategoryBadge(guest.category)}">${guest.category}</span>
            ${birthdayWarning}
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1 font-medium flex items-center gap-1">
            <i data-lucide="phone" class="w-3.5 h-3.5 text-slate-400"></i> ${guest.phone}
          </p>
        </div>
        
        <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-0 border-slate-100">
          <button onclick="openEditModal('${guest.id}')" title="Редактировать" class="flex-1 sm:flex-none bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition flex items-center justify-center gap-1">
            <i data-lucide="pencil" class="w-3.5 h-3.5"></i> <span class="inline sm:hidden lg:inline">Изменить</span>
          </button>
          <button onclick="openVisitsModal('${guest.id}')" title="Визиты" class="flex-1 sm:flex-none bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 transition flex items-center justify-center gap-1">
            <i data-lucide="clock" class="w-3.5 h-3.5"></i> <span class="inline sm:hidden lg:inline">Визиты</span>
          </button>
          <button onclick="recordVisit('${guest.id}')" class="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-sm flex items-center justify-center gap-1 active:scale-95">
            <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> + Визит
          </button>
          <button onclick="deleteGuest('${guest.id}')" title="Удалить" class="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold p-1.5 rounded-xl transition flex items-center justify-center">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
        <div class="bg-slate-50/70 p-2.5 rounded-xl sm:bg-transparent sm:p-0">
          <span class="font-medium text-slate-400 text-[11px] block flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> День рождения</span>
          <p class="text-slate-800 font-semibold mt-0.5">${formatBirthDate(guest.birth_date)}</p>
        </div>
        <div class="bg-slate-50/70 p-2.5 rounded-xl sm:bg-transparent sm:p-0">
          <span class="font-medium text-slate-400 text-[11px] block flex items-center gap-1"><i data-lucide="history" class="w-3 h-3"></i> Последний визит</span>
          <p class="text-slate-800 font-semibold mt-0.5">${lastVisitStr} <button onclick="openVisitsModal('${guest.id}')" class="text-xs text-indigo-600 font-normal underline ml-1">(${visits.length} всего)</button></p>
        </div>
        <div class="bg-slate-50/70 p-2.5 rounded-xl sm:bg-transparent sm:p-0">
          <span class="font-medium text-slate-400 text-[11px] block flex items-center gap-1"><i data-lucide="heart" class="w-3 h-3"></i> Предпочтения</span>
          <p class="text-slate-800 mt-0.5">${guest.preferences || 'Не указаны'}</p>
          ${missingPreferences}
        </div>
      </div>

      ${guest.important_info ? `
        <div class="bg-amber-50/80 p-3 rounded-xl text-xs text-amber-900 border border-amber-200/60 leading-relaxed flex items-start gap-2">
          <i data-lucide="info" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i>
          <div><strong>Важная информация:</strong> ${guest.important_info}</div>
        </div>
      ` : ''}

      <div class="pt-2 border-t border-slate-100 space-y-2">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1"><i data-lucide="message-square" class="w-3 h-3"></i> Заметки</span>
        <div class="space-y-1.5">
          ${comments.length === 0 ? '<p class="text-xs text-slate-400 italic">Заметок пока нет</p>' : ''}
          ${comments.map(c => `
            <div class="bg-slate-50 p-2.5 rounded-xl text-xs flex justify-between items-center border border-slate-200/60 gap-2">
              <p class="text-slate-700 leading-relaxed flex-1">${c.comment}</p>
              <div class="flex items-center gap-1 shrink-0">
                <span class="text-[10px] text-slate-400 font-medium mr-1">${new Date(c.created_at).toLocaleDateString('ru-RU')}</span>
                <button onclick="editComment('${c.id}')" class="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition"><i data-lucide="pencil" class="w-3 h-3"></i></button>
                <button onclick="deleteComment('${c.id}')" class="p-1 hover:bg-rose-100 rounded-lg text-rose-600 transition"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="flex gap-2 pt-1">
          <input type="text" id="comment-input-${guest.id}" placeholder="Добавить заметку..." class="flex-1 text-base sm:text-xs px-3.5 py-2 sm:py-1.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition">
          <button onclick="addComment('${guest.id}')" class="bg-slate-800 hover:bg-slate-900 text-white text-xs px-3.5 py-2 sm:py-1.5 rounded-xl font-medium transition shrink-0 flex items-center gap-1">
            <i data-lucide="send" class="w-3 h-3"></i> Сохранить
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  lucide.createIcons();
}

function formatBirthDate(dateStr) {
  if (!dateStr) return 'Не указан';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function getCategoryBadge(cat) {
  switch(cat) {
    case 'VIP': return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
    case 'PROBLEM': return 'bg-rose-100 text-rose-800 border border-rose-200';
    case 'REGULAR': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    default: return 'bg-slate-100 text-slate-800 border border-slate-200';
  }
}

async function addComment(guestId) {
  const input = document.getElementById(`comment-input-${guestId}`);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const { error } = await supabaseClient.from('guest_comments').insert([{ guest_id: guestId, comment: text }]);
  if (error) showToast('Ошибка добавления заметки', 'error');
  else { showToast('Заметка добавлена'); loadGuests(); }
}

async function editComment(commentId) {
  let currentText = '';
  allGuests.forEach(g => {
    const found = (g.guest_comments || []).find(c => c.id === commentId);
    if (found) currentText = found.comment;
  });

  showPrompt('Редактировать заметку', 'Заметка...', currentText, async (newText) => {
    if (!newText) return showToast('Заметка не может быть пустой', 'error');
    const { error } = await supabaseClient.from('guest_comments').update({ comment: newText }).eq('id', commentId);
    if (error) showToast('Ошибка обновления', 'error');
    else { showToast('Заметка обновлена'); loadGuests(); }
  });
}

async function deleteComment(commentId) {
  showConfirm('Удаление заметки', 'Удалить эту заметку?', async () => {
    const { error } = await supabaseClient.from('guest_comments').delete().eq('id', commentId);
    if (error) showToast('Ошибка удаления', 'error');
    else { showToast('Заметка удалена'); loadGuests(); }
  });
}

function toggleModal(show) { document.getElementById('guest-modal')?.classList.toggle('hidden', !show); }
function toggleVisitsModal(show) { document.getElementById('visits-modal')?.classList.toggle('hidden', !show); }

function openCreateModal() {
  document.getElementById('modal-title').innerHTML = `<i data-lucide="user-plus" class="w-5 h-5 text-indigo-600"></i> Новый гость`;
  document.getElementById('edit_guest_id').value = '';
  document.getElementById('add-guest-form').reset();
  toggleModal(true);
  lucide.createIcons();
}

function openEditModal(guestId) {
  const guest = allGuests.find(g => g.id === guestId);
  if (!guest) return;

  document.getElementById('modal-title').innerHTML = `<i data-lucide="user-check" class="w-5 h-5 text-indigo-600"></i> Редактировать гостя`;
  document.getElementById('edit_guest_id').value = guest.id;
  document.getElementById('full_name').value = guest.full_name || '';
  document.getElementById('phone').value = guest.phone || '';
  document.getElementById('birth_date').value = guest.birth_date || '';
  document.getElementById('category').value = guest.category || 'NEW';
  document.getElementById('preferences').value = guest.preferences || '';
  document.getElementById('important_info').value = guest.important_info || '';

  toggleModal(true);
  lucide.createIcons();
}

async function saveGuest(e) {
  e.preventDefault();
  const guestId = document.getElementById('edit_guest_id').value;
  const currentBranch = document.getElementById('branch-select').value;
  const targetBranch = currentBranch === 'ALL' ? '11111111-1111-1111-1111-111111111111' : currentBranch;

  const guestData = {
    full_name: document.getElementById('full_name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    birth_date: document.getElementById('birth_date').value || null,
    category: document.getElementById('category').value,
    preferences: document.getElementById('preferences').value.trim(),
    important_info: document.getElementById('important_info').value.trim()
  };

  let error;
  if (guestId) ({ error } = await supabaseClient.from('guests').update(guestData).eq('id', guestId));
  else ({ error } = await supabaseClient.from('guests').insert([{ ...guestData, branch_id: targetBranch }]));

  if (error) showToast('Ошибка сохранения: ' + error.message, 'error');
  else {
    showToast(guestId ? 'Данные обновлены' : 'Гость создан!');
    toggleModal(false);
    loadGuests();
  }
}

async function deleteGuest(guestId) {
  const guest = allGuests.find(g => g.id === guestId);
  if (!guest) return;

  showConfirm('Удаление гостя', `Удалить гостя ${guest.full_name}? Вся история будет удалена.`, async () => {
    await supabaseClient.from('visit_history').delete().eq('guest_id', guestId);
    await supabaseClient.from('guest_comments').delete().eq('guest_id', guestId);
    const { error } = await supabaseClient.from('guests').delete().eq('id', guestId);

    if (error) showToast('Ошибка удаления', 'error');
    else { showToast('Карточка удалена', 'info'); loadGuests(); }
  });
}

async function recordVisit(guestId) {
  const guest = allGuests.find(g => g.id === guestId);
  const visits = guest?.visit_history || [];
  const todayDate = new Date().toDateString();
  const hasVisitToday = visits.some(v => new Date(v.visit_date).toDateString() === todayDate);

  const doRecord = async () => {
    const { error } = await supabaseClient.from('visit_history').insert([{ guest_id: guestId }]);
    if (error) showToast('Ошибка записи визита', 'error');
    else {
      showToast(`Визит зафиксирован!`);
      showPrompt('Заметка к визиту', 'Заказ / впечатления...', '', async (note) => {
        if (note) await supabaseClient.from('guest_comments').insert([{ guest_id: guestId, comment: note }]);
        loadGuests();
      });
    }
  };

  if (hasVisitToday) showConfirm('Повторный визит', `Для ${guest.full_name} сегодня уже отмечен визит. Добавить еще один?`, doRecord);
  else doRecord();
}

function openVisitsModal(guestId) {
  const guest = allGuests.find(g => g.id === guestId);
  const visits = (guest?.visit_history || []).sort((a,b) => new Date(b.visit_date) - new Date(a.visit_date));
  const container = document.getElementById('visits-modal-list');
  if (!container) return;

  if (visits.length === 0) {
    container.innerHTML = '<p class="text-slate-400 text-xs text-center py-4">Нет визитов</p>';
  } else {
    container.innerHTML = visits.map(v => `
      <div class="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl text-xs border border-slate-200/80">
        <span class="font-medium text-slate-800 flex items-center gap-1.5"><i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i> ${new Date(v.visit_date).toLocaleString('ru-RU')}</span>
        <button onclick="deleteVisit('${v.id}', '${guestId}')" class="text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 transition flex items-center gap-1">
          <i data-lucide="trash-2" class="w-3 h-3"></i> Удалить
        </button>
      </div>
    `).join('');
  }
  toggleVisitsModal(true);
  lucide.createIcons();
}

async function deleteVisit(visitId, guestId) {
  showConfirm('Удаление визита', 'Удалить этот визит?', async () => {
    const { error } = await supabaseClient.from('visit_history').delete().eq('id', visitId);
    if (error) showToast('Ошибка удаления', 'error');
    else {
      showToast('Визит удален', 'info');
      await loadGuests();
      openVisitsModal(guestId);
    }
  });
}

function exportToCSV() {
  if (!allGuests.length) return showToast('Нет данных для экспорта', 'error');

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
  showToast('Экспорт завершен');
}

// --- ИНИЦИАЛИЗАЦИЯ ---
document.addEventListener('DOMContentLoaded', () => {
  checkSavedSession();
  lucide.createIcons();
});