(function () {
  const user = Session.getUser();
  document.getElementById('greeting').textContent = `Welcome back, ${(user.fullName || user.username).split(' ')[0]}`;

  function statCard(icon, label, value) {
    return `
      <div class="stat-card">
        <div class="stat-icon">${icon}</div>
        <div class="stat-label">${label}</div>
        <div class="stat-value">${value}</div>
      </div>
    `;
  }

  async function load() {
    const grid = document.getElementById('statGrid');
    grid.innerHTML = Array.from({ length: 3 }).map(() => `
      <div class="stat-card">
        <div class="skeleton" style="width:40px;height:40px;border-radius:10px;margin-bottom:16px;"></div>
        <div class="skeleton skeleton-text" style="width:70%;"></div>
        <div class="skeleton skeleton-text" style="width:40%; height:22px;"></div>
      </div>
    `).join('');

    try {
      const data = await api.get('/dashboard/customer');

      grid.innerHTML =
        statCard(vehicleIcon(), 'My Vehicles', data.vehicleCount) +
        statCard(wrenchIcon(), 'Active Services', data.currentServices.length) +
        statCard(calendarIcon(), 'Upcoming Booking', data.upcomingBooking ? UI.formatDate(data.upcomingBooking.requested_date) : 'None');

      renderCurrentServices(data.currentServices);
      renderUpcomingBooking(data.upcomingBooking);
      renderTransactions(data.recentTransactions);
    } catch (err) {
      Toast.error(err.message || 'Failed to load dashboard.');
    }
  }

  function vehicleIcon() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 13l1.5-4.5A2 2 0 016.4 7h11.2a2 2 0 011.9 1.5L21 13" stroke="currentColor" stroke-width="1.7"/><rect x="2.5" y="13" width="19" height="5.5" rx="1.5" stroke="currentColor" stroke-width="1.7"/></svg>'; }
  function wrenchIcon() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a3.5 3.5 0 01-4.6 4.6L4 17v3h3l6.1-6.1a3.5 3.5 0 004.6-4.6l-2.3 2.3-2-2 2.3-2.3z" stroke="currentColor" stroke-width="1.5"/></svg>'; }
  function calendarIcon() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 9.5h17M8 3v3M16 3v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'; }

  function renderCurrentServices(services) {
    const el = document.getElementById('currentServices');
    if (!services.length) {
      UI.emptyState(el, { title: 'No active services', message: 'When your vehicle enters the queue, you can track it live here.' });
      return;
    }
    el.innerHTML = services.map((s) => `
      <div style="padding:12px 0; border-bottom:1px solid var(--color-border);">
        <div class="flex justify-between items-center">
          <div>
            <div class="fw-600 text-sm">${UI.escapeHtml(s.brand)} ${UI.escapeHtml(s.model)}</div>
            <div class="text-xs text-faint">${UI.escapeHtml(s.service_type)}</div>
          </div>
          <span class="badge ${UI.statusBadgeClass(s.status_code)}">${UI.escapeHtml(s.status_label)}</span>
        </div>
        ${s.queue_position ? `<div class="text-xs text-faint" style="margin-top:6px;">Queue position #${s.queue_position}</div>` : ''}
      </div>
    `).join('');
  }

  function renderUpcomingBooking(booking) {
    const el = document.getElementById('upcomingBooking');
    if (!booking) {
      UI.emptyState(el, { title: 'No upcoming bookings', message: 'Book a service to see it here.' });
      return;
    }
    el.innerHTML = `
      <div class="fw-600" style="margin-bottom:4px;">${UI.escapeHtml(booking.service_type)}</div>
      <div class="text-sm text-muted">${UI.escapeHtml(booking.brand)} ${UI.escapeHtml(booking.model)} · ${UI.escapeHtml(booking.license_plate)}</div>
      <div class="text-sm text-muted" style="margin-top:8px;">${UI.formatDate(booking.requested_date)} at ${UI.formatTime(booking.requested_time)}</div>
      <span class="badge ${UI.statusBadgeClass(booking.status)}" style="margin-top:10px;">${booking.status}</span>
    `;
  }

  function renderTransactions(list) {
    const tbody = document.getElementById('txBody');
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-faint" style="padding:24px;">No transactions yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = list.map((t) => `
      <tr>
        <td class="cell-primary">${UI.escapeHtml(t.invoice_number)}</td>
        <td>${UI.escapeHtml(t.service_type)}</td>
        <td>${UI.formatCurrency(t.amount)}</td>
        <td><span class="badge ${UI.statusBadgeClass(t.status)}">${t.status}</span></td>
        <td>${UI.formatDate(t.created_at)}</td>
      </tr>
    `).join('');
  }

  load();
  ['service:created', 'service:updated', 'booking:created', 'booking:updated', 'transaction:created', 'transaction:updated'].forEach((evt) => WSocket.on(evt, load));
})();
