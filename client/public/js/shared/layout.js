/**
 * Renders the sidebar + topbar shared across every authenticated page.
 * Usage: Layout.render({ role: 'admin', active: 'dashboard' })
 */
const Layout = (() => {
  const ICONS = {
    dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="9" rx="2" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="3" width="7" height="5" rx="2" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="12" width="7" height="9" rx="2" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="16" width="7" height="5" rx="2" stroke="currentColor" stroke-width="1.7"/></svg>',
    customers: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="currentColor" stroke-width="1.7"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M16 4.5c1.7.4 3 2 3 3.9 0 1.9-1.3 3.5-3 3.9M20 20c0-2.8-2-5.2-4.6-5.9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    vehicles: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 13l1.5-4.5A2 2 0 016.4 7h11.2a2 2 0 011.9 1.5L21 13" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><rect x="2.5" y="13" width="19" height="5.5" rx="1.5" stroke="currentColor" stroke-width="1.7"/><circle cx="7" cy="18.5" r="1.6" fill="currentColor"/><circle cx="17" cy="18.5" r="1.6" fill="currentColor"/></svg>',
    bookings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 9.5h17M8 3v3M16 3v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M8 14l2.3 2.3L16 11" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mechanics: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a3.5 3.5 0 01-4.6 4.6L4 17v3h3l6.1-6.1a3.5 3.5 0 004.6-4.6l-2.3 2.3-2-2 2.3-2.3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    services: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M19.4 13.5a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V20a2 2 0 11-4 0v-.2a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H4a2 2 0 110-4h.2a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3H10a1.7 1.7 0 001-1.6V4a2 2 0 114 0v.2a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9V10a1.7 1.7 0 001.6 1H20a2 2 0 110 4h-.2a1.7 1.7 0 00-1.6 1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
    spareparts: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 8l-9-5-9 5 9 5 9-5z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M3 8v8l9 5 9-5V8M12 13v8" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    inventory: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="7" width="17" height="13" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 7V5.5A2.5 2.5 0 0110.5 3h3A2.5 2.5 0 0116 5.5V7M8 11h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    reports: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 20V10M11 20V4M18 20v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    booking2: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 4v16m8-8H4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    tracking: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    transactions: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 7h13M17 7l-3-3M17 7l-3 3M20 17H7M7 17l3 3M7 17l3-3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    profile: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.7"/><path d="M4.5 20c1-4 4-6 7.5-6s6.5 2 7.5 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 17l5-5-5-5M20 12H8M12 4H6a2 2 0 00-2 2v12a2 2 0 002 2h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    settings: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M19.4 13.5a1.7 1.7 0 00.3 1.9l.05.06a2 2 0 11-2.83 2.83l-.06-.05a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.55V19.5a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.51 1.7 1.7 0 00-1.9.3l-.06.05a2 2 0 11-2.83-2.83l.05-.06a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.51-1H4.5a2 2 0 110-4h.09a1.7 1.7 0 001.51-1 1.7 1.7 0 00-.3-1.9l-.05-.06a2 2 0 112.83-2.83l.06.05a1.7 1.7 0 001.9.3H10.5a1.7 1.7 0 001-1.55V4.5a2 2 0 114 0v.09c0 .66.39 1.25 1 1.51.62.26 1.34.14 1.9-.3l.06-.05a2 2 0 112.83 2.83l-.05.06a1.7 1.7 0 00-.3 1.9V10.5c.26.62.85 1.01 1.51 1H19.5a2 2 0 110 4h-.09a1.7 1.7 0 00-1.51 1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    search: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    bell: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M18 9a6 6 0 10-12 0c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10.5 20a1.7 1.7 0 003 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    chevron: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };

  const ADMIN_NAV = [
    { key: 'dashboard', label: 'Dashboard', href: '/admin/dashboard.html', icon: 'dashboard' },
    { key: 'customers', label: 'Customers', href: '/admin/customers.html', icon: 'customers' },
    { key: 'vehicles', label: 'Vehicles', href: '/admin/vehicles.html', icon: 'vehicles' },
    { key: 'bookings', label: 'Bookings', href: '/admin/bookings.html', icon: 'bookings' },
    { key: 'services', label: 'Services', href: '/admin/services.html', icon: 'services' },
    { key: 'mechanics', label: 'Mechanics', href: '/admin/mechanics.html', icon: 'mechanics' },
    { key: 'spareparts', label: 'Spare Parts', href: '/admin/spareparts.html', icon: 'spareparts' },
    { key: 'inventory', label: 'Inventory', href: '/admin/inventory.html', icon: 'inventory' },
    { key: 'reports', label: 'Reports', href: '/admin/reports.html', icon: 'reports' },
  ];

  const CUSTOMER_NAV = [
    { key: 'dashboard', label: 'Dashboard', href: '/customer/dashboard.html', icon: 'dashboard' },
    { key: 'vehicles', label: 'My Vehicles', href: '/customer/vehicles.html', icon: 'vehicles' },
    { key: 'booking', label: 'Book Service', href: '/customer/booking.html', icon: 'booking2' },
    { key: 'tracking', label: 'Track Service', href: '/customer/tracking.html', icon: 'tracking' },
    { key: 'transactions', label: 'Transactions', href: '/customer/transactions.html', icon: 'transactions' },
    { key: 'profile', label: 'Profile', href: '/customer/profile.html', icon: 'profile' },
  ];

  function sidebarHTML(role, active) {
    const nav = role === 'admin' ? ADMIN_NAV : CUSTOMER_NAV;
    const links = nav
      .map(
        (item) => `
      <a href="${item.href}" class="sidebar-link ${item.key === active ? 'active' : ''}">
        ${ICONS[item.icon]}<span>${item.label}</span>
      </a>`
      )
      .join('');

    return `
      <div class="sidebar-brand">
        <div class="brand-mark">W</div>
        <span>WorkshopHub</span>
      </div>
      <nav class="sidebar-nav">
        <div class="sidebar-section-label">${role === 'admin' ? 'Workspace' : 'My Account'}</div>
        ${links}
      </nav>
      <div class="sidebar-foot">
        <a href="#" id="layoutLogout" class="sidebar-link">${ICONS.logout}<span>Log out</span></a>
      </div>
    `;
  }

  function topbarHTML(role, user) {
    const initials = Session.initials(user.fullName || user.username);
    const searchBox = role === 'admin'
      ? `<div class="topbar-search" id="globalSearchBox">
           ${ICONS.search}
           <input type="text" id="globalSearchInput" placeholder="Search customers, vehicles, bookings, parts, invoices…" autocomplete="off" />
         </div>`
      : `<div></div>`;

    return `
      <button class="icon-btn menu-toggle" id="menuToggle">${ICONS.menu}</button>
      ${searchBox}
      <div class="flex items-center gap-3">
        <div class="dropdown" id="notifDropdown">
          <button class="icon-btn" id="notifBtn">${ICONS.bell}<span class="dot hidden" id="notifDot"></span></button>
        </div>
        <div class="dropdown" id="profileDropdown">
          <button class="flex items-center gap-2" id="profileBtn" style="border-radius:999px; padding:4px 10px 4px 4px; border:1px solid var(--color-border); background:var(--color-surface);">
            <span class="avatar avatar-sm">${user.avatarUrl ? `<img src="${user.avatarUrl}" />` : initials}</span>
            <span class="text-sm fw-600" style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${UI.escapeHtml(user.fullName || user.username)}</span>
            ${ICONS.chevron}
          </button>
        </div>
      </div>
    `;
  }

  function wireProfileDropdown(user) {
    const btn = document.getElementById('profileBtn');
    const wrap = document.getElementById('profileDropdown');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      const menu = document.createElement('div');
      menu.className = 'dropdown-menu';
      const profileHref = user.role === 'admin' ? '/admin/profile.html' : '/customer/profile.html';
      menu.innerHTML = `
        <div style="padding:8px 10px;">
          <div class="fw-600 text-sm">${UI.escapeHtml(user.fullName || user.username)}</div>
          <div class="text-xs text-faint">${UI.escapeHtml(user.email)}</div>
        </div>
        <div class="dropdown-divider"></div>
        <a class="dropdown-item" href="${profileHref}">${ICONS.profile} My Profile</a>
        <div class="dropdown-divider"></div>
        <a class="dropdown-item" href="#" id="ddLogout">${ICONS.logout} Log out</a>
      `;
      wrap.appendChild(menu);
      menu.querySelector('#ddLogout').addEventListener('click', (ev) => {
        ev.preventDefault();
        Session.logout();
      });
    });
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach((m) => m.remove());
  }

  async function wireNotifications() {
    const btn = document.getElementById('notifBtn');
    const wrap = document.getElementById('notifDropdown');
    const dot = document.getElementById('notifDot');
    if (!btn) return;

    async function refreshDot() {
      try {
        const res = await api.get('/notifications', { limit: 1 });
        dot.classList.toggle('hidden', !res.unread);
      } catch (e) { /* ignore */ }
    }
    refreshDot();
    WSocket.on('service:updated', refreshDot);
    WSocket.on('booking:updated', refreshDot);
    WSocket.on('booking:created', refreshDot);

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      const menu = document.createElement('div');
      menu.className = 'dropdown-menu';
      menu.style.width = '340px';
      menu.style.maxHeight = '420px';
      menu.style.overflowY = 'auto';
      menu.innerHTML = `<div style="padding:8px 10px;" class="flex items-center justify-between"><span class="fw-600 text-sm">Notifications</span><a href="#" id="markAllRead" class="text-xs" style="color:var(--color-primary-dark);">Mark all read</a></div><div class="dropdown-divider"></div><div id="notifList" class="text-sm text-faint" style="padding:14px 10px;">Loading…</div>`;
      wrap.appendChild(menu);

      menu.querySelector('#markAllRead').addEventListener('click', async (ev) => {
        ev.preventDefault();
        await api.patch('/notifications/read-all');
        dot.classList.add('hidden');
        loadList();
      });

      async function loadList() {
        try {
          const res = await api.get('/notifications', { limit: 10 });
          const list = document.getElementById('notifList');
          if (!res.items.length) {
            list.innerHTML = `<div style="padding:6px 4px;">No notifications yet.</div>`;
            return;
          }
          list.className = '';
          list.innerHTML = res.items
            .map(
              (n) => `
            <div class="dropdown-item" style="align-items:flex-start; ${n.is_read ? '' : 'background:#F7FCFF;'}">
              <span style="width:8px;height:8px;border-radius:50%;background:${n.is_read ? 'transparent' : 'var(--color-primary)'};margin-top:6px;flex-shrink:0;"></span>
              <div>
                <div class="fw-600 text-sm">${UI.escapeHtml(n.title)}</div>
                <div class="text-xs text-muted">${UI.escapeHtml(n.message)}</div>
                <div class="text-xs text-faint" style="margin-top:2px;">${UI.timeAgo(n.created_at)}</div>
              </div>
            </div>`
            )
            .join('');
        } catch (e) {
          document.getElementById('notifList').innerHTML = 'Could not load notifications.';
        }
      }
      loadList();
    });
  }

  function wireGlobalSearch() {
    const input = document.getElementById('globalSearchInput');
    const box = document.getElementById('globalSearchBox');
    if (!input) return;

    const doSearch = UI.debounce(async (q) => {
      closeAllDropdowns();
      if (!q.trim()) return;
      try {
        const res = await api.get('/search', { q });
        renderSearchResults(box, res, q);
      } catch (e) { /* ignore */ }
    }, 300);

    input.addEventListener('input', () => doSearch(input.value));
    input.addEventListener('focus', () => { if (input.value.trim()) doSearch(input.value); });
  }

  function renderSearchResults(box, res, q) {
    closeAllDropdowns();
    const groups = [
      { key: 'customers', label: 'Customers', href: (r) => `/admin/customers.html?open=${r.id}` },
      { key: 'vehicles', label: 'Vehicles', href: () => `/admin/vehicles.html` },
      { key: 'bookings', label: 'Bookings', href: () => `/admin/bookings.html` },
      { key: 'spareParts', label: 'Spare Parts', href: () => `/admin/spareparts.html` },
      { key: 'invoices', label: 'Invoices', href: () => `/admin/reports.html` },
    ];
    const total = groups.reduce((sum, g) => sum + (res[g.key] || []).length, 0);

    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';
    menu.style.left = '0';
    menu.style.right = 'auto';
    menu.style.width = '360px';
    menu.style.maxHeight = '420px';
    menu.style.overflowY = 'auto';

    if (!total) {
      menu.innerHTML = `<div class="text-sm text-faint" style="padding:14px 10px;">No results for "${UI.escapeHtml(q)}"</div>`;
    } else {
      menu.innerHTML = groups
        .filter((g) => (res[g.key] || []).length)
        .map((g) => {
          const items = res[g.key]
            .map((item) => {
              let label = '';
              if (g.key === 'customers') label = item.full_name;
              if (g.key === 'vehicles') label = `${item.brand} ${item.model} · ${item.license_plate}`;
              if (g.key === 'bookings') label = `${item.service_type} · ${item.status}`;
              if (g.key === 'spareParts') label = `${item.name} (${item.quantity} in stock)`;
              if (g.key === 'invoices') label = `${item.invoice_number} · ${UI.formatCurrency(item.amount)}`;
              return `<a class="dropdown-item" href="${g.href(item)}">${UI.escapeHtml(label)}</a>`;
            })
            .join('');
          return `<div class="sidebar-section-label" style="padding:8px 10px 4px;">${g.label}</div>${items}`;
        })
        .join('');
    }
    box.appendChild(menu);
  }

  function render({ role, active }) {
    const user = Session.getUser();
    if (!user) return;

    const sidebarEl = document.getElementById('sidebar');
    const topbarEl = document.getElementById('topbar');
    if (sidebarEl) sidebarEl.innerHTML = sidebarHTML(role, active);
    if (topbarEl) topbarEl.innerHTML = topbarHTML(role, user);

    // Mobile sidebar toggle
    const backdrop = document.getElementById('sidebarBackdrop');
    const toggle = document.getElementById('menuToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        sidebarEl.classList.toggle('open');
        backdrop.classList.toggle('open');
      });
    }
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        sidebarEl.classList.remove('open');
        backdrop.classList.remove('open');
      });
    }

    document.getElementById('layoutLogout').addEventListener('click', (e) => {
      e.preventDefault();
      Session.logout();
    });

    document.addEventListener('click', closeAllDropdowns);

    wireProfileDropdown(user);
    wireNotifications();
    wireGlobalSearch();
    WSocket.connect();
  }

  return { render };
})();
