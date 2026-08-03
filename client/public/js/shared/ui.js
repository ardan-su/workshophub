const UI = (() => {
  function formatCurrency(value) {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
  }

  function formatDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function formatTime(value) {
    if (!value) return '—';
    const [h, m] = String(value).split(':');
    const d = new Date();
    d.setHours(Number(h), Number(m));
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function timeAgo(value) {
    if (!value) return '—';
    const diff = Date.now() - new Date(value).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function debounce(fn, wait = 350) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function skeletonRows(container, count = 5) {
    container.innerHTML = Array.from({ length: count })
      .map(() => '<div class="skeleton skeleton-row"></div>')
      .join('');
  }

  function emptyState(container, { icon = defaultEmptyIcon(), title = 'Nothing here yet', message = '' }) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <h4>${title}</h4>
        <p>${message}</p>
      </div>
    `;
  }

  function defaultEmptyIcon() {
    return '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 7l2-4h14l2 4M3 7v12a1 1 0 001 1h16a1 1 0 001-1V7M3 7h18M8 11h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  /** Renders pagination bar; onPage(pageNumber) is called on click. */
  function pagination(container, { page, totalPages, total, limit }, onPage) {
    if (!container) return;
    if (!totalPages || totalPages <= 1) {
      container.innerHTML = total ? `<div class="text-xs text-faint">${total} total record${total === 1 ? '' : 's'}</div>` : '';
      return;
    }
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    let btns = '';
    const pagesToShow = new Set([1, totalPages, page, page - 1, page + 1].filter((p) => p >= 1 && p <= totalPages));
    const sorted = [...pagesToShow].sort((a, b) => a - b);
    let prev = 0;
    for (const p of sorted) {
      if (prev && p - prev > 1) btns += `<span class="page-btn" style="border:none;">…</span>`;
      btns += `<button class="page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
      prev = p;
    }

    container.innerHTML = `
      <div class="text-xs text-faint">${start}–${end} of ${total}</div>
      <div class="page-btns">
        <button class="page-btn" data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>&lsaquo;</button>
        ${btns}
        <button class="page-btn" data-page="${page + 1}" ${page === totalPages ? 'disabled' : ''}>&rsaquo;</button>
      </div>
    `;
    container.querySelectorAll('[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => onPage(Number(btn.dataset.page)));
    });
  }

  function statusBadgeClass(code) {
    const map = {
      pending: 'badge-warning',
      accepted: 'badge-info',
      rejected: 'badge-danger',
      rescheduled: 'badge-neutral',
      waiting: 'badge-neutral',
      checked_in: 'badge-info',
      inspection: 'badge-info',
      repairing: 'badge-primary',
      waiting_parts: 'badge-warning',
      quality_check: 'badge-primary',
      ready_pickup: 'badge-success',
      completed: 'badge-success',
      paid: 'badge-success',
      unpaid: 'badge-warning',
      active: 'badge-success',
      inactive: 'badge-neutral',
    };
    return map[code] || 'badge-neutral';
  }

  return {
    formatCurrency, formatDate, formatDateTime, formatTime, timeAgo,
    escapeHtml, debounce, skeletonRows, emptyState, pagination, statusBadgeClass,
  };
})();
