/* ═══════════════════════════════════════════════════════════
   FoxAgenda — script.js
   Gestão de Rotina Diária
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────
   CONSTANTS
────────────────────────────────────── */
const STORAGE_KEY = 'foxagenda_entries';
const MONTH_KEY   = 'foxagenda_active_month';
const THEME_KEY   = 'foxagenda_theme';

const CATEGORIES = {
  work:     { label: 'Trabalho',    emoji: '💼', color: 'var(--work)' },
  study:    { label: 'Estudo',      emoji: '📚', color: 'var(--study)' },
  reading:  { label: 'Leitura',     emoji: '📖', color: 'var(--reading)' },
  exercise: { label: 'Exercício',   emoji: '🏃', color: 'var(--exercise)' },
  rest:     { label: 'Descanso',    emoji: '😴', color: 'var(--rest)' },
  food:     { label: 'Alimentação', emoji: '🍽️', color: 'var(--food)' },
};

const DAY_NAMES   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const STATUS_CONFIG = {
  'pendente':      { label: 'Pendente',      css: 'status-pendente' },
  'em andamento':  { label: 'Em Andamento',  css: 'status-em-andamento' },
  'concluído':     { label: 'Concluído',      css: 'status-concluido' },
  'cancelado':     { label: 'Cancelado',     css: 'status-cancelado' },
  'não realizado': { label: 'Não Realizado', css: 'status-nao-realizado' },
};

const DAILY_GOALS = { work: 3, study: 2, reading: 1, exercise: 1, rest: 1, food: 3 };

/* ──────────────────────────────────────
   APPLICATION STATE
────────────────────────────────────── */
const state = {
  entries:  [],
  view:     'dashboard',
  filter:   'all',
  sort:     'date_desc',
  editId:   null,
  deleteId: null,
  calYear:  0,
  calMonth: 0,
  theme:    'system',   // 'dark' | 'light' | 'system'
};

/* ──────────────────────────────────────
   UTILS
────────────────────────────────────── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayStr() {
  const d = new Date();
  return fmtDateStr(d);
}

function fmtDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function formatDuration(min) {
  if (!min || isNaN(min)) return '';
  min = parseInt(min, 10);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60), rm = min % 60;
  return rm ? `${h}h ${rm}min` : `${h}h`;
}

function parseDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const base = dateStr + (timeStr ? `T${timeStr}` : 'T00:00');
  return new Date(base);
}

/* ──────────────────────────────────────
   STORAGE
────────────────────────────────────── */
function loadData() {
  const today        = new Date();
  const currentMonth = `${today.getFullYear()}-${today.getMonth()}`;
  const savedMonth   = localStorage.getItem(MONTH_KEY);

  if (savedMonth && savedMonth !== currentMonth) {
    // New month → clear entries
    localStorage.removeItem(STORAGE_KEY);
    showToast('Novo mês iniciado! Os dados do mês anterior foram apagados.', 'info', 5000);
  }
  localStorage.setItem(MONTH_KEY, currentMonth);

  try {
    const raw       = localStorage.getItem(STORAGE_KEY);
    state.entries   = raw ? JSON.parse(raw) : [];
  } catch {
    state.entries   = [];
  }

}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

/* ──────────────────────────────────────
   THEME MANAGEMENT
────────────────────────────────────── */
function initTheme() {
  state.theme = localStorage.getItem(THEME_KEY) || 'system';
  applyTheme(state.theme);
  updateThemeButtons(state.theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  state.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  updateThemeButtons(theme);
}

function updateThemeButtons(active) {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeVal === active);
  });
}

/* ──────────────────────────────────────
   SIDEBAR / HAMBURGER
────────────────────────────────────── */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('active');
  document.getElementById('btnHamburger').classList.add('open');
  document.getElementById('btnHamburger').setAttribute('aria-expanded', 'true');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
  document.getElementById('btnHamburger').classList.remove('open');
  document.getElementById('btnHamburger').setAttribute('aria-expanded', 'false');
}

/* ──────────────────────────────────────
   TOAST NOTIFICATIONS
────────────────────────────────────── */
function showToast(msg, type = 'success', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `<span aria-hidden="true">${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  document.getElementById('toastArea').appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/* ──────────────────────────────────────
   VIEWS
────────────────────────────────────── */
function switchView(viewId, filter) {
  state.view = viewId;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${viewId}`)?.classList.add('active');

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll(`.nav-btn[data-view="${viewId}"]`).forEach(b => {
    if (!b.dataset.filter) b.classList.add('active');
  });

  // Update topbar text
  const titles = {
    dashboard: { t: 'Dashboard',    s: 'Resumo da sua rotina' },
    entries:   { t: 'Entradas',     s: 'Gerencie todas as atividades' },
    calendar:  { t: 'Calendário',   s: 'Visualização mensal' },
    history:   { t: 'Histórico',    s: 'Registro de realizações' },
  };
  const info = titles[viewId] || titles.dashboard;
  document.getElementById('viewTitle').textContent    = info.t;
  document.getElementById('viewSubtitle').textContent = info.s;

  if (filter !== undefined) {
    state.filter = filter;
    setActiveChip(filter);
  }

  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 1024) closeSidebar();

  renderCurrentView();
}

function renderCurrentView() {
  const v = state.view;
  if (v === 'dashboard') renderDashboard();
  if (v === 'entries')   renderEntries();
  if (v === 'calendar')  renderCalendar();
  if (v === 'history')   renderHistory();
}

/* ──────────────────────────────────────
   DASHBOARD
────────────────────────────────────── */
function renderDashboard() {
  renderStats();
  renderBarChart();
  renderProgress();
}

function renderStats() {
  const today   = todayStr();
  const todayEn = state.entries.filter(e => e.date === today);
  const totals  = {};
  state.entries.forEach(e => { totals[e.cat] = (totals[e.cat] || 0) + 1; });
  const maxTotal = Math.max(...Object.values(totals), 1);

  document.getElementById('statsGrid').innerHTML = Object.keys(CATEGORIES).map(cat => {
    const todayCt = todayEn.filter(e => e.cat === cat).length;
    const totalCt = totals[cat] || 0;
    const barW    = Math.round(totalCt / maxTotal * 100);
    const c       = CATEGORIES[cat];
    return `
      <div class="stat-card" data-cat="${cat}" role="button" tabindex="0"
           onclick="switchView('entries','${cat}')"
           onkeydown="if(event.key==='Enter')switchView('entries','${cat}')">
        <div class="cat-label">${c.emoji} ${c.label}</div>
        <div class="cat-count">${todayCt}</div>
        <div class="cat-sub">${totalCt} no mês</div>
        <div class="cat-bar" style="width:${barW}%"></div>
      </div>`;
  }).join('');
}

function renderBarChart() {
  const chart = document.getElementById('barChart');
  const days  = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push({ str: fmtDateStr(d), label: DAY_NAMES[d.getDay()] });
  }
  const counts  = days.map(d => state.entries.filter(e => e.date === d.str).length);
  const maxC    = Math.max(...counts, 1);
  const today   = todayStr();

  chart.innerHTML = days.map((d, i) => {
    const h       = Math.round(counts[i] / maxC * 85) + 15;
    const isToday = d.str === today;
    return `
      <div class="bar-col">
        <div class="bar-val">${counts[i] || ''}</div>
        <div class="bar-fill" style="height:${h}px;background:${isToday ? 'var(--accent)' : 'var(--surface2)'}"></div>
        <div class="bar-day" style="color:${isToday ? 'var(--accent)' : 'var(--muted)'}">${d.label}</div>
      </div>`;
  }).join('');
}

function renderProgress() {
  const today   = todayStr();
  const todayEn = state.entries.filter(e => e.date === today);
  const section = document.getElementById('progressSection');
  const r       = 24, circ = 2 * Math.PI * r;

  section.innerHTML = Object.keys(CATEGORIES).map(cat => {
    const c    = CATEGORIES[cat];
    const done = todayEn.filter(e => e.cat === cat && e.status === 'concluído').length;
    const goal = DAILY_GOALS[cat];
    const pct  = Math.min(done / goal, 1);
    const off  = circ * (1 - pct);
    return `
      <div class="progress-card">
        <div class="ring-wrap">
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            <circle class="ring-bg" cx="28" cy="28" r="${r}"/>
            <circle class="ring-fg" cx="28" cy="28" r="${r}"
              stroke="${c.color}"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${off}"/>
          </svg>
          <div class="ring-text" style="color:${c.color}">${Math.round(pct * 100)}%</div>
        </div>
        <div>
          <div class="pc-title">${c.emoji} ${c.label}</div>
          <div class="pc-sub">${done} de ${goal} concluídos hoje</div>
        </div>
      </div>`;
  }).join('');
}

/* ──────────────────────────────────────
   ENTRIES
────────────────────────────────────── */
function renderEntries() {
  const list   = document.getElementById('entriesList');
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();

  let filtered = state.entries.filter(e => {
    const matchCat    = state.filter === 'all' || e.cat === state.filter;
    const matchSearch = !search ||
      e.title.toLowerCase().includes(search) ||
      (e.desc || '').toLowerCase().includes(search);
    return matchCat && matchSearch;
  });

  // Sorting
  const sort = state.sort || 'date_desc';
  filtered.sort((a, b) => {
    if (sort === 'date_desc') {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (a.start || '') < (b.start || '') ? 1 : -1;
    }
    if (sort === 'date_asc') {
      if (a.date !== b.date) return a.date > b.date ? 1 : -1;
      return (a.start || '') > (b.start || '') ? 1 : -1;
    }
    if (sort === 'cat')    return a.cat.localeCompare(b.cat);
    if (sort === 'status') return a.status.localeCompare(b.status);
    return 0;
  });

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <p>Nenhuma entrada encontrada.<br>
        Clique em <strong>Nova Entrada</strong> para começar.</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(e => buildEntryCard(e)).join('');
}

function buildEntryCard(e) {
  const c        = CATEGORIES[e.cat];
  const timeStr  = e.start ? `${e.start}${e.end ? ' – ' + e.end : ''}` : '';
  const durStr   = formatDuration(e.duration);
  const sc       = STATUS_CONFIG[e.status] || STATUS_CONFIG['pendente'];
  const isDone   = e.status === 'concluído' || e.status === 'cancelado';
  const isCancel = e.status === 'cancelado';
  const hasWa    = !!e.whatsapp;

  // Build confirm action buttons based on status
  let confirmBtns = '';
  if (e.status === 'pendente') {
    confirmBtns = `
      <button class="btn-start" onclick="markStarted('${e.id}')" aria-label="Iniciar atividade">
        ▶ Iniciar
      </button>
      <button class="btn-mark-not-done" onclick="markNotDone('${e.id}')" aria-label="Marcar como não realizado">
        ✕ Não realizado
      </button>`;
  } else if (e.status === 'em andamento') {
    confirmBtns = `
      <button class="btn-finish" onclick="markFinished('${e.id}')" aria-label="Finalizar atividade">
        ✓ Finalizar
      </button>
      <button class="btn-mark-not-done" onclick="markNotDone('${e.id}')" aria-label="Marcar como não realizado">
        ✕ Não realizado
      </button>`;
  }

  return `
    <div class="entry-card${isDone ? ' is-done' : ''}${isCancel ? ' is-cancelled' : ''}"
         data-cat="${e.cat}" data-id="${e.id}" role="listitem">
      <div class="entry-cat-badge" aria-hidden="true"></div>
      <div class="entry-body">
        <div class="entry-title">${escapeHtml(e.title)}</div>
        <div class="entry-meta">
          <span>${c.emoji} ${c.label}</span>
          <span>📅 ${formatDate(e.date)}</span>
          ${timeStr ? `<span>🕐 ${timeStr}</span>` : ''}
          ${durStr  ? `<span>⏱ ${durStr}</span>` : ''}
          ${e.priority !== 'normal' ? `<span style="color:${e.priority === 'alta' ? 'var(--danger)' : 'var(--muted)'}">▲ ${e.priority}</span>` : ''}
          ${hasWa   ? `<span title="Lembrete WhatsApp ativo">📱</span>` : ''}
          <span class="status-badge ${sc.css}">● ${sc.label}</span>
        </div>
        ${e.desc ? `<div class="entry-desc">${escapeHtml(e.desc)}</div>` : ''}
        ${confirmBtns ? `<div class="entry-confirm-actions">${confirmBtns}</div>` : ''}
      </div>
      <div class="entry-side">
        <div class="entry-time">${timeStr || formatDate(e.date)}</div>
        <div class="entry-actions">
          <button class="btn-icon" onclick="openEdit('${e.id}')" aria-label="Editar entrada">✏️</button>
          <button class="btn-icon danger" onclick="askDelete('${e.id}')" aria-label="Excluir entrada">🗑️</button>
        </div>
      </div>
    </div>`;
}

function setActiveChip(cat) {
  document.querySelectorAll('.filter-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.cat === cat);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ──────────────────────────────────────
   ACTIVITY CONFIRMATION (Start / Finish)
────────────────────────────────────── */
function markStarted(id) {
  const entry = state.entries.find(e => e.id === id);
  if (!entry) return;
  entry.status    = 'em andamento';
  entry.startedAt = new Date().toISOString();
  saveData();
  showToast(`▶ "${entry.title}" iniciado!`, 'info');
  renderCurrentView();
}

function markFinished(id) {
  const entry = state.entries.find(e => e.id === id);
  if (!entry) return;
  entry.status     = 'concluído';
  entry.finishedAt = new Date().toISOString();
  saveData();
  cancelEntryAlerts(id);    // não precisa mais de lembrete
  scheduleAllAlerts();
  showToast(`✅ "${entry.title}" concluído!`, 'success');
  renderCurrentView();
}

function markNotDone(id) {
  const entry = state.entries.find(e => e.id === id);
  if (!entry) return;
  entry.status = 'não realizado';
  saveData();
  cancelEntryAlerts(id);    // não precisa mais de lembrete
  scheduleAllAlerts();
  showToast(`❌ "${entry.title}" marcado como não realizado.`, 'warning');
  renderCurrentView();
}

/* ──────────────────────────────────────
   CALENDAR
────────────────────────────────────── */
function renderCalendar() {
  const { calYear: y, calMonth: m } = state;
  document.getElementById('calTitle').textContent = `${MONTH_NAMES[m]} ${y}`;

  const firstDay    = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrev  = new Date(y, m, 0).getDate();
  const today       = new Date();

  let html = DAY_NAMES.map(d => `<div class="cal-head">${d}</div>`).join('');

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-day other-month"><div class="cal-day-num">${daysInPrev - i}</div></div>`;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
    const dayEn   = state.entries.filter(e => e.date === dateStr);
    const cats    = [...new Set(dayEn.map(e => e.cat))];
    const dots    = cats.map(cat => {
      const cssColor = cat === 'work'     ? '#f97316'
                     : cat === 'study'    ? '#3b82f6'
                     : cat === 'reading'  ? '#10b981'
                     : cat === 'exercise' ? '#ec4899'
                     : cat === 'rest'     ? '#8b5cf6'
                     :                     '#f59e0b';
      return `<div class="cal-dot" style="background:${cssColor}" title="${CATEGORIES[cat]?.label}"></div>`;
    }).join('');

    html += `
      <div class="cal-day${isToday ? ' today' : ''}"
           onclick="calDayClick('${dateStr}')"
           role="button" tabindex="0"
           aria-label="${formatDate(dateStr)}: ${dayEn.length} atividade(s)"
           onkeydown="if(event.key==='Enter')calDayClick('${dateStr}')">
        <div class="cal-day-num">${d}</div>
        <div class="cal-dots">${dots}</div>
      </div>`;
  }

  // Trailing padding
  const total = firstDay + daysInMonth;
  const rem   = (7 - (total % 7)) % 7;
  for (let i = 1; i <= rem; i++) {
    html += `<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;
  }

  document.getElementById('calendarGrid').innerHTML = html;
}

function calDayClick(dateStr) {
  const dayEntries = state.entries.filter(e => e.date === dateStr);

  if (!dayEntries.length) {
    // Open modal pre-filled with this date
    openModal(null, dateStr);
    return;
  }

  // Switch to entries view filtered for this day
  state.filter = 'all';
  switchView('entries');

  // Override the rendered list for this day
  const list = document.getElementById('entriesList');
  list.innerHTML =
    `<div style="font-size:.78rem;color:var(--muted);margin-bottom:12px;padding:6px 12px;
      background:var(--surface2);border-radius:8px;display:inline-flex;align-items:center;gap:8px">
      📅 Entradas de <strong>${formatDate(dateStr)}</strong>
      &nbsp;—&nbsp;
      <a style="color:var(--accent);cursor:pointer;text-decoration:underline"
         onclick="renderEntries()" role="button" tabindex="0">Ver todas</a>
    </div>` +
    dayEntries.map(e => buildEntryCard(e)).join('');
}

/* ──────────────────────────────────────
   HISTORY VIEW
────────────────────────────────────── */
function renderHistory() {
  const total      = state.entries.length;
  const concluded  = state.entries.filter(e => e.status === 'concluído').length;
  const notDone    = state.entries.filter(e => e.status === 'não realizado').length;
  const inProgress = state.entries.filter(e => e.status === 'em andamento').length;
  const pending    = state.entries.filter(e => e.status === 'pendente').length;
  const rate       = total ? Math.round(concluded / total * 100) : 0;

  document.getElementById('historySummary').innerHTML = `
    <div class="hist-card success">
      <div class="hc-label">✅ Concluídas</div>
      <div class="hc-count">${concluded}</div>
      <div class="hc-sub">Taxa: ${rate}%</div>
    </div>
    <div class="hist-card warning">
      <div class="hc-label">⏳ Em Andamento</div>
      <div class="hc-count">${inProgress}</div>
      <div class="hc-sub">do mês atual</div>
    </div>
    <div class="hist-card info">
      <div class="hc-label">🔖 Pendentes</div>
      <div class="hc-count">${pending}</div>
      <div class="hc-sub">aguardando início</div>
    </div>
    <div class="hist-card danger">
      <div class="hc-label">❌ Não Realizadas</div>
      <div class="hc-count">${notDone}</div>
      <div class="hc-sub">do mês atual</div>
    </div>`;

  // Render history list sorted by date desc
  const sorted = [...state.entries].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (a.start || '') < (b.start || '') ? 1 : -1;
  });

  if (!sorted.length) {
    document.getElementById('historyList').innerHTML =
      `<div class="empty-state">
        <div class="icon">📊</div>
        <p>Nenhuma atividade registrada este mês ainda.</p>
      </div>`;
    return;
  }

  document.getElementById('historyList').innerHTML =
    sorted.map(e => buildEntryCard(e)).join('');
}

/* ──────────────────────────────────────
   MODAL — OPEN / CLOSE
────────────────────────────────────── */
function openModal(entry, prefillDate) {
  state.editId = entry ? entry.id : null;

  document.getElementById('modalTitle').textContent = entry ? 'Editar Entrada' : 'Nova Entrada';
  document.getElementById('btnSaveText').textContent = entry ? 'Salvar Alterações' : 'Salvar Entrada';

  document.getElementById('fTitle').value     = entry?.title     || '';
  document.getElementById('fDate').value      = entry?.date      || prefillDate || todayStr();
  document.getElementById('fStart').value     = entry?.start     || '';
  document.getElementById('fEnd').value       = entry?.end       || '';
  document.getElementById('fDuration').value  = entry?.duration  || '';
  document.getElementById('fDesc').value      = entry?.desc      || '';
  document.getElementById('fPriority').value  = entry?.priority  || 'normal';
  document.getElementById('fStatus').value    = entry?.status    || 'pendente';
  document.getElementById('fWhatsapp').value  = entry?.whatsapp  || '';

  // Category radio
  document.querySelectorAll('.cat-option').forEach(r => {
    r.checked = r.value === (entry?.cat || '');
  });

  document.getElementById('modalOverlay').classList.add('open');
  fixModalTransform(document.querySelector('#modalOverlay .modal'));
  setTimeout(() => document.getElementById('fTitle').focus(), 100);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  state.editId = null;
}

/**
 * Após a animação de entrada do bottom-sheet, remove o transform residual.
 * Isso impede que o transform no pai quebre o posicionamento do
 * seletor nativo de hora/data do Chrome Android.
 */
function fixModalTransform(modalEl) {
  if (!modalEl) return;
  modalEl.addEventListener('animationend', () => {
    modalEl.style.transform = 'none';
  }, { once: true });
}

function openEdit(id) {
  const entry = state.entries.find(e => e.id === id);
  if (entry) openModal(entry);
}

/* ──────────────────────────────────────
   SAVE ENTRY
────────────────────────────────────── */
function saveEntry() {
  const cat      = document.querySelector('.cat-option:checked')?.value;
  const title    = document.getElementById('fTitle').value.trim();
  const date     = document.getElementById('fDate').value;
  const start    = document.getElementById('fStart').value;
  const end      = document.getElementById('fEnd').value;
  const duration = parseInt(document.getElementById('fDuration').value, 10) || 0;
  const desc     = document.getElementById('fDesc').value.trim();
  const priority = document.getElementById('fPriority').value;
  const status   = document.getElementById('fStatus').value;
  const whatsapp = document.getElementById('fWhatsapp').value.replace(/\D/g, '');

  // ── Validations ──
  if (!cat) {
    showToast('Selecione uma categoria.', 'error'); return;
  }
  if (!title) {
    showToast('Informe o título da atividade.', 'error'); return;
  }
  if (!date) {
    showToast('Informe a data da atividade.', 'error'); return;
  }

  // WhatsApp basic validation
  if (whatsapp && whatsapp.length < 10) {
    showToast('Número WhatsApp inválido. Use o formato: 5511999998888', 'error'); return;
  }

  if (state.editId) {
    const idx = state.entries.findIndex(e => e.id === state.editId);
    if (idx >= 0) {
      state.entries[idx] = {
        ...state.entries[idx],
        cat, title, date, start, end, duration, desc, priority, status, whatsapp,
        updatedAt: new Date().toISOString(),
      };
    }
    showToast('Entrada atualizada com sucesso!', 'success');
  } else {
    state.entries.push({
      id: uid(), cat, title, date, start, end, duration, desc, priority,
      status, whatsapp,
      createdAt: new Date().toISOString(),
    });
    showToast('Atividade cadastrada com sucesso!', 'success');
  }

  saveData();
  closeModal();
  scheduleAllAlerts();   // reagenda notificações com os dados atualizados
  renderCurrentView();
}

/* ──────────────────────────────────────
   DELETE
────────────────────────────────────── */
function askDelete(id) {
  state.deleteId = id;
  document.getElementById('confirmOverlay').classList.add('open');
}

function confirmDelete() {
  const id = state.deleteId;
  cancelEntryAlerts(id);                 // cancela alertas no SW
  state.entries = state.entries.filter(e => e.id !== id);
  saveData();
  document.getElementById('confirmOverlay').classList.remove('open');
  showToast('Entrada excluída.', 'info');
  scheduleAllAlerts();                   // reagenda o restante
  renderCurrentView();
}

/* ══════════════════════════════════════════════════════════
   SISTEMA DE LEMBRETES — Thread Principal + Service Worker
   ══════════════════════════════════════════════════════════
   ARQUITETURA CORRETA:
   • Os setTimeout vivem na THREAD PRINCIPAL (script.js).
     A página fica viva enquanto a aba estiver aberta.
     setTimeout na thread principal é confiável.
   • Quando o timer dispara, a página pede ao SW para
     exibir a notificação nativa via postMessage.
   • O SW só exibe — não agenda mais nada.

   POR QUE MUDOU:
   • setTimeout em Service Worker NÃO é confiável: o browser
     termina SWs ociosos em segundos/minutos para economizar
     bateria. Todos os timers são perdidos ao terminar o SW.
   ══════════════════════════════════════════════════════════ */

const ALERT_OFFSETS = [
  { min: 15, label: '15 minutos' },
  { min:  5, label:  '5 minutos' },
];

const SW_ICON = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<rect width="100" height="100" rx="20" fill="#7c6af5"/>' +
  '<text y="72" x="50" text-anchor="middle" font-size="62">🦊</text>' +
  '</svg>'
);

/* Map de alertKey → timeoutId na thread principal */
const scheduledTimers = new Map();

let swRegistration = null;

/* ── Registrar Service Worker (silencioso — não exibe toast de erro ao usuário) ── */
async function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return false;

  try {
    /* sw.js DEVE estar na RAIZ do site (mesmo nível de index.html) */
    swRegistration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    await navigator.serviceWorker.ready;
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    console.info('[FoxAgenda] SW registrado:', swRegistration.scope);
    return true;
  } catch (err) {
    /* Falha silenciosa — o sistema funciona sem SW (notificação via Notification API direta) */
    console.warn('[FoxAgenda] SW não registrado (normal em file://):', err.message);
    return false;
  }
}

/* ── Pedir permissão de notificação ── */
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied')  return false;

  const result = await Notification.requestPermission();
  if (result === 'granted') {
    showToast('✅ Notificações ativadas! Você será avisado antes das atividades.', 'success', 4000);
    return true;
  }
  showToast('⚠️ Permissão de notificação negada. Ative nas configurações do browser.', 'warning', 5000);
  return false;
}

/* ── Inicializar sistema de lembretes ── */
async function initReminders() {
  await initServiceWorker();
  await requestNotificationPermission();
  scheduleAllAlerts();

  /* Reagenda ao voltar do background (tab reativada) */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleAllAlerts();
  });
}

/* ══════════════════════════════════════════════════════════
   AGENDAMENTO NA THREAD PRINCIPAL
══════════════════════════════════════════════════════════ */

/**
 * Cancela todos os timers existentes e recalcula tudo do zero.
 * Chamar após qualquer criação, edição ou exclusão de entrada.
 */
function scheduleAllAlerts() {
  if (Notification.permission !== 'granted') return;

  /* Cancela timers anteriores */
  scheduledTimers.forEach(id => clearTimeout(id));
  scheduledTimers.clear();

  const now = Date.now();

  state.entries.forEach(entry => {
    if (!entry.start) return;
    if (['concluído', 'cancelado', 'não realizado'].includes(entry.status)) return;

    const activityMs = parseDateTime(entry.date, entry.start)?.getTime();
    if (!activityMs) return;

    const c = CATEGORIES[entry.cat];

    ALERT_OFFSETS.forEach(({ min, label }) => {
      const fireAt   = activityMs - min * 60_000;
      const delay    = fireAt - now;
      const alertKey = `${entry.id}_${min}`;

      if (delay <= 0)                         return;  /* já passou */
      if (delay > 7 * 24 * 60 * 60 * 1000)   return;  /* >7 dias — não agenda */

      const timerId = setTimeout(() => {
        scheduledTimers.delete(alertKey);
        fireAlert({
          entryId: entry.id,
          tag:     alertKey,
          title:   '⏰ FoxAgenda — Lembrete',
          body:    `${c.emoji} "${entry.title}" começa em ${label} (${entry.start}).`,
          icon:    SW_ICON,
        });
      }, delay);

      scheduledTimers.set(alertKey, timerId);
    });
  });

  console.info(`[FoxAgenda] ${scheduledTimers.size} alerta(s) agendado(s) na thread principal.`);
}

/**
 * Cancela timers de uma entrada específica (ao excluir ou finalizar).
 */
function cancelEntryAlerts(entryId) {
  ALERT_OFFSETS.forEach(({ min }) => {
    const key = `${entryId}_${min}`;
    if (scheduledTimers.has(key)) {
      clearTimeout(scheduledTimers.get(key));
      scheduledTimers.delete(key);
    }
  });
}

/**
 * Dispara o alerta: usa SW se disponível, senão Notification API direta.
 */
function fireAlert({ entryId, tag, title, body, icon }) {
  /* ① Tenta via SW (funciona com a aba em background no desktop) */
  if (swRegistration?.active) {
    swRegistration.active.postMessage({ type: 'SHOW_NOTIFICATION', entryId, tag, title, body, icon });
    return;
  }

  /* ② Fallback: Notification API direta (requer aba ativa/visível) */
  if ('Notification' in window && Notification.permission === 'granted') {
    const notif = new Notification(title, {
      body, icon, tag,
      requireInteraction: true,
    });
    notif.onclick = () => {
      window.focus();
      const entry = state.entries.find(e => e.id === entryId);
      if (entry) showReminderModal(entryId, tag.endsWith('_5') ? '5 minutos' : '15 minutos');
    };
  }
}

/* ── Mensagens recebidas do SW ── */
function onSwMessage(event) {
  const { type, entryId } = event.data || {};
  if (type === 'HIGHLIGHT_ENTRY' && entryId) {
    switchView('entries', 'all');
    setTimeout(() => {
      const card = document.querySelector(`.entry-card[data-id="${entryId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.outline = '2px solid var(--accent)';
        setTimeout(() => { card.style.outline = ''; }, 3000);
      }
    }, 300);
  }
}

/* ── Modal in-app de lembrete ── */
function showReminderModal(entryId, timeLabel) {
  const entry = state.entries.find(e => e.id === entryId);
  if (!entry) return;
  const c     = CATEGORIES[entry.cat];
  const msgEl = document.getElementById('reminderMsg');
  msgEl.innerHTML =
    `<strong>${c.emoji} "${escapeHtml(entry.title)}"</strong><br>` +
    `começa em <strong>${timeLabel}</strong> às <strong>${entry.start}</strong>.`;
  document.getElementById('reminderOverlay').classList.add('open');
}

/* ──────────────────────────────────────
   SIDEBAR DATE / MONTH INFO
────────────────────────────────────── */
function updateSidebarMeta() {
  const now = new Date();
  document.getElementById('sidebarDate').textContent =
    now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('monthInfo').textContent =
    `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()} — dados do mês`;
}

/* ──────────────────────────────────────
   BIND ALL EVENTS
────────────────────────────────────── */
function bindEvents() {

  // ── Hamburger ──
  document.getElementById('btnHamburger').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  document.getElementById('btnCloseSidebar').addEventListener('click', closeSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // ── Theme ──
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.themeVal));
  });

  // ── Nav buttons ──
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view   = btn.dataset.view;
      const filter = btn.dataset.filter;
      if (filter) state.filter = filter;
      switchView(view, filter !== undefined ? filter : state.filter);
      if (filter) setActiveChip(filter);
    });
  });

  // ── Stat cards (click → entries filtered) ──
  // Handled via onclick in renderStats()

  // ── Filter chips ──
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.filter = chip.dataset.cat;
      setActiveChip(chip.dataset.cat);
      renderEntries();
    });
  });

  // ── Search ──
  document.getElementById('searchInput').addEventListener('input', renderEntries);

  // ── Sort ──
  document.getElementById('sortSelect').addEventListener('change', e => {
    state.sort = e.target.value;
    renderEntries();
  });

  // ── Add entry button ──
  document.getElementById('btnAddEntry').addEventListener('click', () => openModal());

  // ── Modal close ──
  document.getElementById('btnCloseModal').addEventListener('click', closeModal);
  document.getElementById('btnCancelModal').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // ── Save entry ──
  document.getElementById('btnSaveEntry').addEventListener('click', saveEntry);

  // ── Delete confirm ──
  document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);
  document.getElementById('btnCancelDelete').addEventListener('click', () => {
    document.getElementById('confirmOverlay').classList.remove('open');
  });

  // ── Reminder modal ──
  document.getElementById('btnReminderDismiss').addEventListener('click', () => {
    document.getElementById('reminderOverlay').classList.remove('open');
  });

  // ── Calendar navigation ──
  document.getElementById('calPrev').addEventListener('click', () => {
    state.calMonth--;
    if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
    renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    state.calMonth++;
    if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
    renderCalendar();
  });
  document.getElementById('calToday').addEventListener('click', () => {
    const n = new Date();
    state.calYear = n.getFullYear(); state.calMonth = n.getMonth();
    renderCalendar();
  });

  // ── Keyboard shortcuts ──
  document.addEventListener('keydown', e => {
    // Escape closes any open modal/overlay
    if (e.key === 'Escape') {
      closeModal();
      document.getElementById('confirmOverlay').classList.remove('open');
      document.getElementById('reminderOverlay').classList.remove('open');
    }
    // Ctrl+N → new entry
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      openModal();
    }
  });
}

/* ──────────────────────────────────────
   INIT
────────────────────────────────────── */
function init() {
  loadData();
  initTheme();

  const now = new Date();
  state.calYear  = now.getFullYear();
  state.calMonth = now.getMonth();

  updateSidebarMeta();
  bindEvents();
  renderDashboard();
  initReminders();

  // Update sidebar date every minute
  setInterval(updateSidebarMeta, 60_000);

  console.info(
    '%cFoxAgenda 🦊 carregado com sucesso!',
    'color:#7c6af5;font-weight:bold;font-size:14px'
  );
}

// Expose globals needed for inline onclick handlers
window.openEdit    = openEdit;
window.askDelete   = askDelete;
window.markStarted = markStarted;
window.markFinished= markFinished;
window.markNotDone = markNotDone;
window.switchView  = switchView;
window.renderEntries = renderEntries;
window.calDayClick = calDayClick;

document.addEventListener('DOMContentLoaded', init);