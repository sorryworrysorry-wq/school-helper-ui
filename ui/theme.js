// theme.js — переключение тёмной/светлой темы
(function () {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);

  window.toggleTheme = function () {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    document.querySelectorAll('.theme-toggle').forEach(b => {
      b.textContent = next === 'dark' ? '🌙' : '☀️';
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.theme-toggle').forEach(b => {
      const cur = document.documentElement.getAttribute('data-theme');
      b.textContent = cur === 'dark' ? '🌙' : '☀️';
      b.onclick = window.toggleTheme;
    });
  });
})();