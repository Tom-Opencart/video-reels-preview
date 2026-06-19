// js/utils.js — shared utility functions

export function toast(msg, type = 'info') {
  const container = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    el.style.transition = 'all .25s';
    setTimeout(() => el.remove(), 250);
  }, 3000);
}
