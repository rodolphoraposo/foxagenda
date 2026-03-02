// ──────────────────────────────
//  CONSTANTS & STATE
// ──────────────────────────────
const STORAGE_KEY = 'routineos_entries';
const MONTH_KEY   = 'routineos_active_month';

const CATS = {
  work:     { label:'Trabalho',   emoji:'💼', color:'#f97316' },
  study:    { label:'Estudo',     emoji:'📚', color:'#3b82f6' },
  reading:  { label:'Leitura',    emoji:'📖', color:'#10b981' },
  exercise: { label:'Exercício',  emoji:'🏃', color:'#ec4899' },
  rest:     { label:'Descanso',   emoji:'😴', color:'#8b5cf6' },
  food:     { label:'Alimentação',emoji:'🍽️', color:'#f59e0b' },
};

const DAY_NAMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

let state = {
  entries: [],
  view: 'dashboard',
  filter: 'all',
  editId: null,
  deleteId: null,
  calYear: 0,
  calMonth: 0,
};

// ──────────────────────────────
//  STORAGE
// ──────────────────────────────
function loadData() {
  const today = new Date();
  const activeMonth = localStorage.getItem(MONTH_KEY);
  const currentMonth = `${today.getFullYear()}-${today.getMonth()}`;

  if (activeMonth && activeMonth !== currentMonth) {
    // Month changed → clear data
    localStorage.removeItem(STORAGE_KEY);
    showToast('Novo mês iniciado! Dados do mês anterior foram limpos.', 'info');
  }
  localStorage.setItem(MONTH_KEY, currentMonth);

  const raw = localStorage.getItem(STORAGE_KEY);
  state.entries = raw ? JSON.parse(raw) : [];
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

// ──────────────────────────────
//  UTILS
// ──────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(str) {
  if (!str) return '';
  const [y,m,d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function formatDuration(min) {
  if (!min) return '';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min/60), rm = min%60;
  return rm ? `${h}h ${rm}min` : `${h}h`;
}

function showToast(msg, type='success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type==='success'?'✅':type==='error'?'❌':'ℹ️'}</span><span>${msg}</span>`;
  document.getElementById('toastArea').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ──────────────────────────────
//  VIEWS
// ──────────────────────────────
function switchView(viewId, filter) {
  state.view = viewId;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${viewId}`).classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll(`.nav-btn[data-view="${viewId}"]`).forEach(b => {
    if (!b.dataset.filter) b.classList.add('active');
  });

  const titles = {
    dashboard:{ t:'Dashboard', s:'Resumo da sua rotina' },
    entries:  { t:'Entradas',  s:'Gerencie todas as atividades' },
    calendar: { t:'Calendário',s:'Visualização mensal' },
  };
  const info = titles[viewId] || titles.dashboard;
  document.getElementById('viewTitle').textContent = info.t;
  document.getElementById('viewSubtitle').textContent = info.s;

  if (filter) {
    state.filter = filter;
    setActiveChip(filter);
  }

  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'entries')   renderEntries();
  if (viewId === 'calendar')  renderCalendar();
}

// ──────────────────────────────
//  DASHBOARD
// ──────────────────────────────
function renderDashboard() {
  renderStats();
  renderBarChart();
  renderProgress();
}

function renderStats() {
  const today = todayStr();
  const todayEntries = state.entries.filter(e => e.date === today);
  const grid = document.getElementById('statsGrid');
  grid.innerHTML = '';
  const totals = {};
  state.entries.forEach(e => { totals[e.cat] = (totals[e.cat]||0)+1; });
  const maxTotal = Math.max(...Object.values(totals), 1);

  Object.keys(CATS).forEach(cat => {
    const todayCt = todayEntries.filter(e => e.cat===cat).length;
    const totalCt = totals[cat]||0;
    const barW = Math.round(totalCt/maxTotal*100);
    grid.innerHTML += `
      <div class="stat-card" data-cat="${cat}">
        <div class="cat-label">${CATS[cat].emoji} ${CATS[cat].label}</div>
        <div class="cat-count">${todayCt}</div>
        <div class="cat-sub">${totalCt} no mês</div>
        <div class="cat-bar" style="width:${barW}%"></div>
      </div>`;
  });
}

function renderBarChart() {
  const chart = document.getElementById('barChart');
  chart.innerHTML = '';
  const days = [];
  for (let i=6; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const str = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    days.push({ str, label: DAY_NAMES[d.getDay()] });
  }
  const counts = days.map(d => state.entries.filter(e => e.date===d.str).length);
  const maxC = Math.max(...counts, 1);

  days.forEach((d, i) => {
    const h = Math.round(counts[i]/maxC*90) + 10;
    const isToday = d.str === todayStr();
    chart.innerHTML += `
      <div class="bar-col">
        <div class="bar-val">${counts[i]||''}</div>
        <div class="bar-fill" style="height:${h}px;background:${isToday?'var(--accent)':'var(--surface2)'}"></div>
        <div class="bar-day" style="color:${isToday?'var(--accent)':'var(--muted)'}">${d.label}</div>
      </div>`;
  });
}

function renderProgress() {
  const today = todayStr();
  const todayEntries = state.entries.filter(e => e.date === today);
  const goals = { work:3, study:2, reading:1, exercise:1, rest:1, food:3 };
  const section = document.getElementById('progressSection');
  section.innerHTML = '';

  Object.keys(CATS).forEach(cat => {
    const done = todayEntries.filter(e => e.cat===cat).length;
    const goal = goals[cat];
    const pct = Math.min(done/goal, 1);
    const r = 24, circ = 2*Math.PI*r;
    const offset = circ*(1-pct);
    section.innerHTML += `
      <div class="progress-card">
        <div class="ring-wrap">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle class="ring-bg" cx="28" cy="28" r="${r}"/>
            <circle class="ring-fg" cx="28" cy="28" r="${r}"
              stroke="${CATS[cat].color}"
              stroke-dasharray="${circ}"
              stroke-dashoffset="${offset}"/>
          </svg>
          <div class="ring-text" style="color:${CATS[cat].color}">${Math.round(pct*100)}%</div>
        </div>
        <div>
          <div class="pc-title">${CATS[cat].emoji} ${CATS[cat].label}</div>
          <div class="pc-sub">${done} de ${goal} hoje</div>
        </div>
      </div>`;
  });
}

// ──────────────────────────────
//  ENTRIES
// ──────────────────────────────
function renderEntries() {
  const list = document.getElementById('entriesList');
  const search = document.getElementById('searchInput').value.toLowerCase();

  let filtered = state.entries.filter(e => {
    const matchCat = state.filter === 'all' || e.cat === state.filter;
    const matchSearch = !search ||
      e.title.toLowerCase().includes(search) ||
      (e.desc||'').toLowerCase().includes(search);
    return matchCat && matchSearch;
  });

  // Sort by date desc then start time
  filtered.sort((a,b) => {
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    return (a.start||'') < (b.start||'') ? 1 : -1;
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="icon">📭</div>
      <p>Nenhuma entrada encontrada.<br>Clique em <strong>Nova Entrada</strong> para começar.</p>
    </div>`;
    return;
  }

  list.innerHTML = filtered.map(e => {
    const timeStr = e.start ? `${e.start}${e.end?' – '+e.end:''}` : '';
    const durStr  = formatDuration(e.duration);
    const statusColor = { pendente:'#6b6b85','em andamento':'#f59e0b','concluído':'#10b981','cancelado':'#ef4444' };
    return `
    <div class="entry-card" data-cat="${e.cat}" data-id="${e.id}">
      <div class="entry-cat-badge"></div>
      <div class="entry-body">
        <div class="entry-title">${e.title}</div>
        <div class="entry-meta">
          <span>${CATS[e.cat].emoji} ${CATS[e.cat].label}</span>
          <span>📅 ${formatDate(e.date)}</span>
          ${timeStr ? `<span>🕐 ${timeStr}</span>` : ''}
          ${durStr  ? `<span>⏱ ${durStr}</span>` : ''}
          ${e.priority !== 'normal' ? `<span style="color:${e.priority==='alta'?'#ef4444':'#6b6b85'}">▲ ${e.priority}</span>` : ''}
          <span style="color:${statusColor[e.status]||'#6b6b85'}">● ${e.status}</span>
        </div>
        ${e.desc ? `<div class="entry-desc">${e.desc}</div>` : ''}
      </div>
      <div class="entry-time">${timeStr||formatDate(e.date)}</div>
      <div class="entry-actions">
        <button class="btn-icon" onclick="openEdit('${e.id}')">✏️</button>
        <button class="btn-icon danger" onclick="askDelete('${e.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function setActiveChip(cat) {
  document.querySelectorAll('.filter-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.cat === cat);
  });
}

// ──────────────────────────────
//  CALENDAR
// ──────────────────────────────
function renderCalendar() {
  const { calYear: y, calMonth: m } = state;
  document.getElementById('calTitle').textContent = `${MONTH_NAMES[m]} ${y}`;

  const grid = document.getElementById('calendarGrid');
  // Headers
  let html = DAY_NAMES.map(d => `<div class="cal-head">${d}</div>`).join('');

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const daysInPrev  = new Date(y, m, 0).getDate();
  const today = new Date(); 

  // Prev month padding
  for (let i=firstDay-1; i>=0; i--) {
    html += `<div class="cal-day other-month"><div class="cal-day-num">${daysInPrev-i}</div></div>`;
  }

  for (let d=1; d<=daysInMonth; d++) {
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = d===today.getDate() && m===today.getMonth() && y===today.getFullYear();
    const dayEntries = state.entries.filter(e => e.date===dateStr);
    const dots = [...new Set(dayEntries.map(e=>e.cat))].map(cat =>
      `<div class="cal-dot" style="background:${CATS[cat].color}"></div>`
    ).join('');
    html += `
      <div class="cal-day${isToday?' today':''}" onclick="calDayClick('${dateStr}')">
        <div class="cal-day-num">${d}</div>
        <div class="cal-dots">${dots}</div>
      </div>`;
  }

  // Fill remaining
  const total = firstDay + daysInMonth;
  const rem = (7 - total%7)%7;
  for (let i=1; i<=rem; i++) {
    html += `<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;
  }

  grid.innerHTML = html;
}

function calDayClick(dateStr) {
  state.filter = 'all';
  switchView('entries');
  // Filter by day
  const dayEntries = state.entries.filter(e => e.date===dateStr);
  if (!dayEntries.length) {
    openModal(); 
    document.getElementById('fDate').value = dateStr;
  }
  // Highlight day entries
  document.getElementById('searchInput').value = '';
  const list = document.getElementById('entriesList');
  const filtered = state.entries.filter(e => e.date === dateStr);
  if (!filtered.length) return;

  list.innerHTML = `<div style="font-size:.78rem;color:var(--muted);margin-bottom:8px;padding:4px 8px;background:var(--surface2);border-radius:6px;display:inline-block">
    📅 Entradas de ${formatDate(dateStr)} — <a style="color:var(--accent);cursor:pointer" onclick="renderEntries()">ver todas</a>
  </div>` + filtered.map(e => {
    const timeStr = e.start ? `${e.start}${e.end?' – '+e.end:''}` : '';
    const durStr  = formatDuration(e.duration);
    const statusColor = { pendente:'#6b6b85','em andamento':'#f59e0b','concluído':'#10b981','cancelado':'#ef4444' };
    return `
    <div class="entry-card" data-cat="${e.cat}" data-id="${e.id}">
      <div class="entry-cat-badge"></div>
      <div class="entry-body">
        <div class="entry-title">${e.title}</div>
        <div class="entry-meta">
          <span>${CATS[e.cat].emoji} ${CATS[e.cat].label}</span>
          ${timeStr ? `<span>🕐 ${timeStr}</span>` : ''}
          ${durStr  ? `<span>⏱ ${durStr}</span>` : ''}
          <span style="color:${statusColor[e.status]||'#6b6b85'}">● ${e.status}</span>
        </div>
        ${e.desc ? `<div class="entry-desc">${e.desc}</div>` : ''}
      </div>
      <div class="entry-actions">
        <button class="btn-icon" onclick="openEdit('${e.id}')">✏️</button>
        <button class="btn-icon danger" onclick="askDelete('${e.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

// ──────────────────────────────
//  MODAL
// ──────────────────────────────
function openModal(entry) {
  state.editId = entry ? entry.id : null;
  document.getElementById('modalTitle').textContent = entry ? 'Editar Entrada' : 'Nova Entrada';
  document.getElementById('fTitle').value    = entry?.title    || '';
  document.getElementById('fDate').value     = entry?.date     || todayStr();
  document.getElementById('fStart').value    = entry?.start    || '';
  document.getElementById('fEnd').value      = entry?.end      || '';
  document.getElementById('fDuration').value = entry?.duration || '';
  document.getElementById('fDesc').value     = entry?.desc     || '';
  document.getElementById('fPriority').value = entry?.priority || 'normal';
  document.getElementById('fStatus').value   = entry?.status   || 'pendente';

  document.querySelectorAll('.cat-option').forEach(r => {
    r.checked = r.value === (entry?.cat || 'work');
  });

  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  state.editId = null;
}

function openEdit(id) {
  const entry = state.entries.find(e => e.id===id);
  if (entry) openModal(entry);
}

function saveEntry() {
  const cat      = document.querySelector('.cat-option:checked')?.value;
  const title    = document.getElementById('fTitle').value.trim();
  const date     = document.getElementById('fDate').value;
  const start    = document.getElementById('fStart').value;
  const end      = document.getElementById('fEnd').value;
  const duration = parseInt(document.getElementById('fDuration').value)||0;
  const desc     = document.getElementById('fDesc').value.trim();
  const priority = document.getElementById('fPriority').value;
  const status   = document.getElementById('fStatus').value;

  if (!cat)  { showToast('Selecione uma categoria.', 'error'); return; }
  if (!title){ showToast('Informe o título da entrada.', 'error'); return; }
  if (!date) { showToast('Informe a data.', 'error'); return; }

  if (state.editId) {
    const idx = state.entries.findIndex(e => e.id===state.editId);
    if (idx>=0) state.entries[idx] = { ...state.entries[idx], cat,title,date,start,end,duration,desc,priority,status };
    showToast('Entrada atualizada com sucesso!');
  } else {
    state.entries.push({ id:uid(), cat,title,date,start,end,duration,desc,priority,status, createdAt: Date.now() });
    showToast('Entrada adicionada com sucesso!');
  }

  saveData();
  closeModal();

  if (state.view==='dashboard') renderDashboard();
  if (state.view==='entries')   renderEntries();
  if (state.view==='calendar')  renderCalendar();
}

// ──────────────────────────────
//  DELETE
// ──────────────────────────────
function askDelete(id) {
  state.deleteId = id;
  document.getElementById('confirmOverlay').classList.add('open');
}

function confirmDelete() {
  state.entries = state.entries.filter(e => e.id !== state.deleteId);
  saveData();
  document.getElementById('confirmOverlay').classList.remove('open');
  showToast('Entrada excluída.', 'info');
  if (state.view==='dashboard') renderDashboard();
  if (state.view==='entries')   renderEntries();
  if (state.view==='calendar')  renderCalendar();
}

// ──────────────────────────────
//  INIT
// ──────────────────────────────
function init() {
  loadData();

  // Sidebar date
  const now = new Date();
  document.getElementById('sidebarDate').textContent =
    now.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });

  // Month footer
  const activeMonth = localStorage.getItem(MONTH_KEY) || '';
  document.getElementById('monthInfo').textContent =
    `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()} — dados do mês`;

  // Calendar state
  state.calYear  = now.getFullYear();
  state.calMonth = now.getMonth();

  // Event: nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      const filter = btn.dataset.filter;
      switchView(view, filter || 'all');
      if (filter) {
        state.filter = filter;
        setActiveChip(filter);
      }
    });
  });

  // Event: filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.filter = chip.dataset.cat;
      setActiveChip(chip.dataset.cat);
      renderEntries();
    });
  });

  // Event: search
  document.getElementById('searchInput').addEventListener('input', renderEntries);

  // Event: modal
  document.getElementById('btnAddEntry').addEventListener('click', () => openModal());
  document.getElementById('btnCloseModal').addEventListener('click', closeModal);
  document.getElementById('btnCancelModal').addEventListener('click', closeModal);
  document.getElementById('btnSaveEntry').addEventListener('click', saveEntry);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target===document.getElementById('modalOverlay')) closeModal();
  });

  // Event: delete confirm
  document.getElementById('btnConfirmDelete').addEventListener('click', confirmDelete);
  document.getElementById('btnCancelDelete').addEventListener('click', () => {
    document.getElementById('confirmOverlay').classList.remove('open');
  });

  // Event: calendar nav
  document.getElementById('calPrev').addEventListener('click', () => {
    state.calMonth--;
    if (state.calMonth<0) { state.calMonth=11; state.calYear--; }
    renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    state.calMonth++;
    if (state.calMonth>11) { state.calMonth=0; state.calYear++; }
    renderCalendar();
  });
  document.getElementById('calToday').addEventListener('click', () => {
    const n = new Date();
    state.calYear = n.getFullYear(); state.calMonth = n.getMonth();
    renderCalendar();
  });

  // Keyboard: Escape closes modal
  document.addEventListener('keydown', e => {
    if (e.key==='Escape') {
      closeModal();
      document.getElementById('confirmOverlay').classList.remove('open');
    }
  });

  // Initial render
  renderDashboard();
}

init();