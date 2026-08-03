/**
 * Lightweight toast notifications. Call Toast.success('Saved!') etc.
 * Injects its own container into <body> on first use.
 */
const Toast = (() => {
  let stack = null;

  function ensureStack() {
    if (stack) return stack;
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
    return stack;
  }

  const ICONS = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#22C55E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    danger: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#EF4444" stroke-width="2"/><path d="M12 8v5M12 16h.01" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/></svg>',
    warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.3 3.9L2.7 17a1.8 1.8 0 001.5 2.7h15.6a1.8 1.8 0 001.5-2.7L13.7 3.9a1.8 1.8 0 00-3.4 0z" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#8FD3FF" stroke-width="2"/><path d="M12 16v-5M12 8h.01" stroke="#8FD3FF" stroke-width="2" stroke-linecap="round"/></svg>',
  };

  function show(message, type = 'info', timeout = 4200) {
    const container = ensureStack();
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
      <span>${message}</span>
      <span class="toast-close">&times;</span>
    `;
    container.appendChild(el);

    const remove = () => {
      el.classList.add('toast-out');
      setTimeout(() => el.remove(), 180);
    };
    el.querySelector('.toast-close').addEventListener('click', remove);
    if (timeout) setTimeout(remove, timeout);
  }

  return {
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'danger'),
    warning: (msg) => show(msg, 'warning'),
    info: (msg) => show(msg, 'info'),
  };
})();
