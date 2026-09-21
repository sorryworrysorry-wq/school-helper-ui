// app.js — фронт ученика
const API_BASE = 'https://school-helper-api.onrender.com'; // ← ЗАМЕНИ на свой URL
window.API_BASE = API_BASE;

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s).replace(/[&<>"']/g, c => (
  { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]
));

// ---------- ТАБЫ ----------
$$('nav button').forEach(b => b.onclick = () => {
  $$('nav button').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  $$('.tab').forEach(t => t.classList.remove('active'));
  $('#tab-' + b.dataset.tab).classList.add('active');
  load(b.dataset.tab);
});

// ---------- API ----------
async function fetchJson(url, opts) {
  const r = await fetch(API_BASE + url, {
    credentials: 'include',
    ...opts
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.json();
}

// ---------- РЕНДЕР ГРУПП ----------
function renderGrouped(el, items, keyField, titleField, endpoint) {
  const groups = {};
  for (const it of items) (groups[it[keyField]] ||= []).push(it);
  const subjects = Object.keys(groups).sort();

  if (!subjects.length) {
    el.innerHTML = '<p class="empty">📭 Пока пусто</p>';
    return;
  }

  el.innerHTML = `
    <h2>Выбери предмет</h2>
    <div class="subjects">${subjects.map(s =>
      `<button class="subj" data-subj="${esc(s)}">${esc(s)} <span style="opacity:.5">(${groups[s].length})</span></button>`
    ).join('')}</div>
    <div id="items-view"></div>`;

  el.querySelectorAll('.subj').forEach(btn => btn.onclick = () => {
    const s = btn.dataset.subj;
    const view = el.querySelector('#items-view');
    view.innerHTML = `<h3>${esc(s)}</h3>` + groups[s].map(it =>
      `<button class="item" data-id="${it.id}">${esc(it[titleField])}</button>`
    ).join('');
    view.querySelectorAll('.item').forEach(b => b.onclick = () =>
      showDetail(endpoint, b.dataset.id));
  });
}

async function showDetail(endpoint, id) {
  const item = await fetchJson(`${endpoint}/${id}`);
  const name = item.title || item.topic || item.name || '';
  const subj = item.subject ? `${esc(item.subject)} — ` : '';
  const w = window.open('', '_blank');
  w.document.write(`<!doctype html><html lang="ru" data-theme="${document.documentElement.getAttribute('data-theme')}"><head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${esc(name)}</title>
    <link rel="stylesheet" href="${location.origin}${location.pathname.replace(/\/[^/]*$/, '')}/style.css">
    </head><body class="detail">
    <h1>${subj}${esc(name)}</h1>
    <p class="meta">📅 ${esc(item.created_at || '')} · 👤 ${esc(item.author || '')}</p>
    <pre class="content">${esc(item.content)}</pre>
    <button onclick="window.close()">⬅️ Закрыть</button>
    </body></html>`);
  w.document.close();
}

// ---------- ЗАГРУЗКА ТАБОВ ----------
async function load(tab) {
  try {
    if (tab === 'dz' || tab === 'konspekty' || tab === 'otv') {
      const items = await fetchJson('/api/' + tab);
      const el = $('#tab-' + tab);
      const titleField = tab === 'otv' ? 'topic' : 'title';
      renderGrouped(el, items, 'subject', titleField, '/api/' + tab);
    }

    if (tab === 'olympiads') {
      const items = await fetchJson('/api/olympiads');
      const el = $('#tab-olympiads');
      if (!items.length) {
        el.innerHTML = '<p class="empty">📭 Пока пусто</p>';
        return;
      }
      el.innerHTML = '<h2>📝 Олимпиады</h2>' + items.map(it =>
        `<button class="item" data-id="${it.id}">${esc(it.name)}</button>`
      ).join('');
      el.querySelectorAll('.item').forEach(b => b.onclick = () =>
        showDetail('/api/olympiads', b.dataset.id));
    }

    if (tab === 'vpn') {
      const keys = await fetchJson('/api/vpn');
      const el = $('#tab-vpn');
      if (!keys.length) {
        el.innerHTML = '<h2>🔐 VPN ключи</h2><p class="empty">📭 Пока нет ключей</p>';
        return;
      }
      el.innerHTML = '<h2>🔐 VPN ключи (Happ)</h2>' + keys.map(k =>
        `<div class="vpn">
          <b>${esc(k.name)}</b>
          <code>${esc(k.key)}</code>
          <button data-copy="${esc(k.key)}">📋</button>
        </div>`).join('');
      el.querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
        try {
          await navigator.clipboard.writeText(b.dataset.copy);
          b.textContent = '✅';
          setTimeout(() => b.textContent = '📋', 1500);
        } catch { alert('Не удалось скопировать'); }
      });
    }
  } catch (e) {
    $('#tab-' + tab).innerHTML = `<p class="error">❌ ${esc(e.message)}</p>`;
  }
}

// ---------- ШПАРГАЛКА: УРАВНЕНИЯ ----------
$('#eq-btn').onclick = async () => {
  const equation = $('#eq-input').value;
  try {
    const { result } = await fetchJson('/api/solve/equation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equation })
    });
    $('#eq-result').textContent = result;
  } catch (e) {
    $('#eq-result').textContent = '❌ ' + e.message;
  }
};

// ---------- ШПАРГАЛКА: РУССКИЙ ----------
$('#rus-btn').onclick = () => {
  const t = $('#rus-input').value.toLowerCase();
  const out = [];
  if (t.includes('встав') || t.includes('пропущ') || t.includes('_'))
    out.push('🔤 Вставить пропущенные буквы:\n1. Прочитай слово\n2. Определи часть слова\n3. Вспомни правило\n4. Вставь букву');
  if (t.includes('морфолог'))
    out.push('🔍 Морфологический разбор:\n1. Часть речи\n2. Начальная форма\n3. Постоянные признаки\n4. Непостоянные\n5. Синтаксическая роль');
  if (t.includes('синтакс'))
    out.push('📖 Синтаксический разбор:\n1. Грамматическая основа\n2. Тип предложения\n3. Второстепенные члены\n4. Схема');
  if (!out.length) out.push('🤔 Уточни задание: вставить буквы / морфологический / синтаксический разбор');
  $('#rus-result').textContent = out.join('\n\n');
};

// ---------- ПОДДЕРЖКА ----------
$('#sup-btn').onclick = async () => {
  const body = {
    name: $('#sup-name').value,
    contact: $('#sup-contact').value,
    message: $('#sup-msg').value
  };
  try {
    await fetchJson('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    $('#sup-status').textContent = '✅ Отправлено!';
    $('#sup-status').className = 'status-ok';
    $('#sup-msg').value = '';
  } catch (e) {
    $('#sup-status').textContent = '❌ ' + e.message;
    $('#sup-status').className = 'status-err';
  }
};

// ---------- STEPIK ----------
$('#st-btn').onclick = async () => {
  const body = {
    name: $('#st-name').value,
    email: $('#st-email').value,
    password: $('#st-pass').value,
    consent: $('#st-consent').checked
  };
  try {
    await fetchJson('/api/stepik', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    $('#st-status').textContent = '✅ Данные отправлены. Владелец свяжется.';
    $('#st-status').className = 'status-ok';
    $('#st-email').value = '';
    $('#st-pass').value = '';
    $('#st-consent').checked = false;
  } catch (e) {
    $('#st-status').textContent = '❌ ' + e.message;
    $('#st-status').className = 'status-err';
  }
};

$('#st-del-btn').onclick = async () => {
  try {
    await fetchJson('/api/stepik', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: $('#st-del-email').value,
        password: $('#st-del-pass').value
      })
    });
    $('#st-del-status').textContent = '✅ Удалено';
    $('#st-del-status').className = 'status-ok';
    $('#st-del-email').value = '';
    $('#st-del-pass').value = '';
  } catch (e) {
    $('#st-del-status').textContent = '❌ ' + e.message;
    $('#st-del-status').className = 'status-err';
  }
};

// ---------- ЯНДЕКС УЧЕБНИК ----------
$('#ya-btn').onclick = async () => {
  const body = {
    name: $('#ya-name').value,
    login: $('#ya-login').value,
    password: $('#ya-pass').value,
    consent: $('#ya-consent').checked
  };
  try {
    await fetchJson('/api/yakids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    $('#ya-status').textContent = '✅ Данные отправлены.';
    $('#ya-status').className = 'status-ok';
    $('#ya-login').value = '';
    $('#ya-pass').value = '';
    $('#ya-consent').checked = false;
  } catch (e) {
    $('#ya-status').textContent = '❌ ' + e.message;
    $('#ya-status').className = 'status-err';
  }
};

$('#ya-del-btn').onclick = async () => {
  try {
    await fetchJson('/api/yakids', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: $('#ya-del-login').value,
        password: $('#ya-del-pass').value
      })
    });
    $('#ya-del-status').textContent = '✅ Удалено';
    $('#ya-del-status').className = 'status-ok';
    $('#ya-del-login').value = '';
    $('#ya-del-pass').value = '';
  } catch (e) {
    $('#ya-del-status').textContent = '❌ ' + e.message;
    $('#ya-del-status').className = 'status-err';
  }
};

// ---------- СТАРТ ----------
load('dz');