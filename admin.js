// admin.js — админка
const API_BASE = 'https://school-helper-api.onrender.com'; // ← ЗАМЕНИ на свой URL
window.API_BASE = API_BASE;

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => (
  { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]
));

const api = (url, opts = {}) => fetch(API_BASE + url, {
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  ...opts
}).then(async r => {
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.json();
});

// ---------- ЭКСПОРТ ----------
function exportButton(sec) {
  return `<button class="export-btn" data-export="${sec}">📥 Скачать JSON</button>`;
}

function bindExport(root) {
  root.querySelectorAll('[data-export]').forEach(b => b.onclick = () => {
    window.location.href = `${API_BASE}/api/admin/export/${b.dataset.export}`;
  });
}

// ---------- АВТОРИЗАЦИЯ ----------
async function checkAuth() {
  const { isAdmin, username } = await api('/api/admin/me');
  $('#login').hidden = isAdmin;
  $('#admin-main').hidden = !isAdmin;
  $('#logout').hidden = !isAdmin;
  if (isAdmin) {
    $('#whoami').textContent = '👤 ' + (username || 'admin');
    loadSection('dz');
  } else {
    $('#whoami').textContent = '';
  }
}

$('#login-btn').onclick = async () => {
  try {
    await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        username: $('#user').value,
        password: $('#pass').value
      })
    });
    $('#login-status').textContent = '';
    $('#pass').value = '';
    checkAuth();
  } catch (e) {
    $('#login-status').textContent = '❌ ' + e.message;
    $('#login-status').className = 'status-err';
  }
};

$('#logout').onclick = async () => {
  await api('/api/admin/logout', { method: 'POST' });
  $('#user').value = '';
  $('#pass').value = '';
  checkAuth();
};

['#user', '#pass'].forEach(sel => {
  $(sel).addEventListener('keydown', e => {
    if (e.key === 'Enter') $('#login-btn').click();
  });
});

// ---------- СЕКЦИИ ----------
const SECTION_FIELDS = {
  dz: [['subject', 'Предмет'], ['title', 'Название'], ['content', 'Содержимое']],
  konspekty: [['subject', 'Предмет'], ['title', 'Тема'], ['content', 'Текст']],
  otv: [['subject', 'Предмет'], ['topic', 'Тема'], ['content', 'Ответ']],
  olympiads: [['name', 'Название'], ['content', 'Ответы']]
};

async function loadSection(sec) {
  const el = $('#sec');
  el.innerHTML = '<p>Загрузка…</p>';

  try {
    // ---- CRUD-секции ----
    if (SECTION_FIELDS[sec]) {
      const items = await api('/api/' + sec);
      const subjects = await api('/api/subjects');
      const titleField = sec === 'otv' ? 'topic'
        : (sec === 'olympiads' ? 'name' : 'title');

      el.innerHTML = `
        <h2>➕ Добавить</h2>
        ${SECTION_FIELDS[sec].map(([k, label]) => {
          if (k === 'subject')
            return `<select id="f-${k}">${
              subjects.map(s => `<option>${esc(s)}</option>`).join('')
            }</select>`;
          if (k === 'content')
            return `<textarea id="f-${k}" placeholder="${label}"></textarea>`;
          return `<input id="f-${k}" placeholder="${label}">`;
        }).join('')}
        <button id="create-btn">Создать</button>

        <h2>📋 Список (${items.length})</h2>
        ${exportButton(sec)}
        <ul class="list">${items.map(it => `
          <li>
            <span>
              ${it.subject ? `<b>${esc(it.subject)}</b> — ` : ''}
              ${esc(it[titleField] || it.name || '')}
            </span>
            <button data-del="${it.id}">🗑</button>
          </li>`).join('') || '<li class="empty">📭 Пусто</li>'}
        </ul>`;

      el.querySelector('#create-btn').onclick = async () => {
        const body = {};
        for (const [k] of SECTION_FIELDS[sec]) {
          body[k] = el.querySelector('#f-' + k).value.trim();
        }
        try {
          await api('/api/' + sec, {
            method: 'POST',
            body: JSON.stringify(body)
          });
          loadSection(sec);
        } catch (e) { alert('❌ ' + e.message); }
      };

      el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (!confirm('Удалить?')) return;
        await api(`/api/${sec}/${b.dataset.del}`, { method: 'DELETE' });
        loadSection(sec);
      });
    }

    // ---- VPN ----
    if (sec === 'vpn') {
      const keys = await api('/api/vpn');
      el.innerHTML = `
        <h2>➕ Добавить VPN</h2>
        <input id="v-name" placeholder="Имя (необязательно)">
        <textarea id="v-key" placeholder="Ключ"></textarea>
        <button id="v-add">Создать</button>

        <h2>📋 Список (${keys.length})</h2>
        ${exportButton('vpn')}
        <ul class="list">${keys.map(k => `
          <li>
            <span><b>${esc(k.name)}</b><br><code>${esc(k.key)}</code></span>
            <button data-del="${k.id}">🗑</button>
          </li>`).join('') || '<li class="empty">📭 Пусто</li>'}
        </ul>`;

      el.querySelector('#v-add').onclick = async () => {
        try {
          await api('/api/vpn', {
            method: 'POST',
            body: JSON.stringify({
              name: el.querySelector('#v-name').value,
              key: el.querySelector('#v-key').value
            })
          });
          loadSection('vpn');
        } catch (e) { alert('❌ ' + e.message); }
      };

      el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (!confirm('Удалить?')) return;
        await api('/api/vpn/' + b.dataset.del, { method: 'DELETE' });
        loadSection('vpn');
      });
    }

    // ---- ПРЕДМЕТЫ ----
    if (sec === 'subjects') {
      const subjects = await api('/api/subjects');
      el.innerHTML = `
        <h2>➕ Добавить предмет</h2>
        <input id="s-name" placeholder="Название">
        <button id="s-add">Добавить</button>

        <h2>📋 Список (${subjects.length})</h2>
        ${exportButton('subjects')}
        <ul class="list">${subjects.map(s => `
          <li>
            <span>${esc(s)}</span>
            <button data-del="${esc(s)}">🗑</button>
          </li>`).join('')}
        </ul>`;

      el.querySelector('#s-add').onclick = async () => {
        try {
          await api('/api/subjects', {
            method: 'POST',
            body: JSON.stringify({ name: el.querySelector('#s-name').value })
          });
          loadSection('subjects');
        } catch (e) { alert('❌ ' + e.message); }
      };

      el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (!confirm('Удалить?')) return;
        await api('/api/subjects/' + encodeURIComponent(b.dataset.del),
          { method: 'DELETE' });
        loadSection('subjects');
      });
    }

    // ---- СОБРАННЫЕ ДАННЫЕ ----
    if (sec === 'stepik' || sec === 'yakids' || sec === 'consents') {
      const items = await api('/api/admin/' + sec);

      el.innerHTML = `
        <h2>📋 ${sec} (${items.length})</h2>
        ${exportButton(sec)}
        <ul class="list">${items.map(it => {
          if (sec === 'stepik')
            return `<li><span>👤 ${esc(it.user_name || '—')}<br>
              📧 ${esc(it.email)}<br>🔑 <code>${esc(it.password)}</code><br>
              ✅ ${esc(it.consent_at)}<br>🌐 ${esc(it.ip || '')}</span></li>`;
          if (sec === 'yakids')
            return `<li><span>👤 ${esc(it.user_name || '—')}<br>
              🔑 ${esc(it.login)}<br>🔒 <code>${esc(it.password)}</code><br>
              ✅ ${esc(it.consent_at)}<br>🌐 ${esc(it.ip || '')}</span></li>`;
          return `<li><span>👤 ${esc(it.user_name || '—')}<br>
            📦 ${esc(it.service)}<br>
            📝 ${esc(it.consent_text)}<br>
            📅 ${esc(it.created_at)}<br>🌐 ${esc(it.ip || '')}</span></li>`;
        }).join('') || '<li class="empty">📭 Пусто</li>'}
        </ul>`;
    }

    // ---- ПОДДЕРЖКА ----
    if (sec === 'support') {
      const msgs = await api('/api/support');
      el.innerHTML = `<h2>💬 Обращения (${msgs.length})</h2>
        ${exportButton('support')}` +
        (msgs.length ? msgs.map(m => `
          <div class="card">
            <b>${esc(m.name || 'без имени')}</b> · ${esc(m.contact || '—')} ·
            ${esc(m.created_at)}
            <p>${esc(m.message)}</p>
            <button data-del="${m.id}">🗑 Удалить</button>
          </div>`).join('')
        : '<p class="empty">📭 Пусто</p>');

      el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        await api('/api/support/' + b.dataset.del, { method: 'DELETE' });
        loadSection('support');
      });
    }

    // ---- АДМИНЫ ----
    if (sec === 'admins') {
      const users = await api('/api/admin/users');
      el.innerHTML = `
        <h2>➕ Добавить админа</h2>
        <input id="a-user" placeholder="Логин">
        <input id="a-pass" type="password" placeholder="Пароль (мин. 6)">
        <button id="a-add">Создать</button>

        <h2>🔑 Сменить свой пароль</h2>
        <input id="cp-old" type="password" placeholder="Текущий пароль">
        <input id="cp-new" type="password" placeholder="Новый пароль (мин. 6)">
        <button id="cp-btn">Сменить</button>
        <p id="cp-status"></p>

        <h2>📋 Список (${users.length})</h2>
        ${exportButton('admins')}
        <ul class="list">${users.map(u => `
          <li>
            <span>👤 <b>${esc(u.username)}</b><br>
              📅 ${esc(u.created_at)}</span>
            <button data-del="${u.id}">🗑</button>
          </li>`).join('')}
        </ul>`;

      el.querySelector('#a-add').onclick = async () => {
        try {
          await api('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify({
              username: el.querySelector('#a-user').value,
              password: el.querySelector('#a-pass').value
            })
          });
          loadSection('admins');
        } catch (e) { alert('❌ ' + e.message); }
      };

      el.querySelector('#cp-btn').onclick = async () => {
        try {
          await api('/api/admin/change-password', {
            method: 'POST',
            body: JSON.stringify({
              old_password: el.querySelector('#cp-old').value,
              new_password: el.querySelector('#cp-new').value
            })
          });
          el.querySelector('#cp-status').textContent = '✅ Пароль изменён';
          el.querySelector('#cp-status').className = 'status-ok';
          el.querySelector('#cp-old').value = '';
          el.querySelector('#cp-new').value = '';
        } catch (e) {
          el.querySelector('#cp-status').textContent = '❌ ' + e.message;
          el.querySelector('#cp-status').className = 'status-err';
        }
      };

      el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
        if (!confirm('Удалить админа?')) return;
        try {
          await api('/api/admin/users/' + b.dataset.del, { method: 'DELETE' });
          loadSection('admins');
        } catch (e) { alert('❌ ' + e.message); }
      });
    }
  } catch (e) {
    el.innerHTML = `<p class="error">❌ ${esc(e.message)}</p>`;
  }
  bindExport(el);
}

document.querySelectorAll('#admin-main nav button').forEach(b =>
  b.onclick = () => {
    document.querySelectorAll('#admin-main nav button')
      .forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    loadSection(b.dataset.sec);
  });

checkAuth();