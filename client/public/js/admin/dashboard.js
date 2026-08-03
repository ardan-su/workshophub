(function () {
  const STAT_DEFS = [
    { key: 'totalCustomers', label: 'Total Customers', icon: iconUsers(), format: (v) => v },
    { key: 'totalVehicles', label: 'Total Vehicles', icon: iconVehicle(), format: (v) => v },
    { key: 'vehiclesInQueue', label: 'Vehicles in Queue', icon: iconClock(), format: (v) => v },
    { key: 'vehiclesUnderRepair', label: 'Vehicles Under Repair', icon: iconWrench(), format: (v) => v },
    { key: 'completedServicesToday', label: 'Completed Today', icon: iconCheck(), format: (v) => v },
    { key: 'totalRevenue', label: 'Total Revenue', icon: iconDollar(), format: (v) => UI.formatCurrency(v) },
    { key: 'lowStockSpareParts', label: 'Low Stock Parts', icon: iconAlert(), format: (v) => v, danger: true },
    { key: 'pendingBookings', label: 'Pending Bookings', icon: iconBell(), format: (v) => v },
  ];

  function iconUsers() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="currentColor" stroke-width="1.7"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'; }
  function iconVehicle() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 13l1.5-4.5A2 2 0 016.4 7h11.2a2 2 0 011.9 1.5L21 13" stroke="currentColor" stroke-width="1.7"/><rect x="2.5" y="13" width="19" height="5.5" rx="1.5" stroke="currentColor" stroke-width="1.7"/></svg>'; }
  function iconClock() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'; }
  function iconWrench() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a3.5 3.5 0 01-4.6 4.6L4 17v3h3l6.1-6.1a3.5 3.5 0 004.6-4.6l-2.3 2.3-2-2 2.3-2.3z" stroke="currentColor" stroke-width="1.5"/></svg>'; }
  function iconCheck() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }
  function iconDollar() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 6.5c0-1.9-2.2-3.5-5-3.5s-5 1.6-5 3.5 2.2 3 5 3.5 5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'; }
  function iconAlert() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M10.3 3.9L2.7 17a1.8 1.8 0 001.5 2.7h15.6a1.8 1.8 0 001.5-2.7L13.7 3.9a1.8 1.8 0 00-3.4 0z" stroke="currentColor" stroke-width="1.7"/><path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'; }
  function iconBell() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 9a6 6 0 10-12 0c0 6-2.5 7.5-2.5 7.5h17S18 15 18 9z" stroke="currentColor" stroke-width="1.7"/></svg>'; }

  function renderStatSkeleton() {
    const grid = document.getElementById('statGrid');
    grid.innerHTML = STAT_DEFS.map(() => `
      <div class="stat-card">
        <div class="skeleton" style="width:40px;height:40px;border-radius:10px;margin-bottom:16px;"></div>
        <div class="skeleton skeleton-text" style="width:70%;"></div>
        <div class="skeleton skeleton-text" style="width:40%; height:22px;"></div>
      </div>
    `).join('');
  }

  function renderStats(data) {
    const grid = document.getElementById('statGrid');
    grid.innerHTML = STAT_DEFS.map((def) => `
      <div class="stat-card">
        <div class="stat-icon" ${def.danger && data[def.key] > 0 ? 'style="background:var(--color-danger-tint); color:var(--color-danger);"' : ''}>${def.icon}</div>
        <div class="stat-label">${def.label}</div>
        <div class="stat-value">${def.format(data[def.key] ?? 0)}</div>
      </div>
    `).join('');
  }

  function renderRevenueChart(trend) {
    const el = document.getElementById('revenueChart');
    if (!trend || !trend.length) {
      UI.emptyState(el, { title: 'No revenue yet', message: 'Paid invoices will appear here as a trend.' });
      return;
    }
    const max = Math.max(...trend.map((t) => t.total), 1);
    el.innerHTML = `
      <div style="display:flex; align-items:flex-end; gap:6px; height:180px;">
        ${trend.map((t) => {
          const h = Math.max(4, Math.round((t.total / max) * 160));
          const d = new Date(t.date);
          const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
          return `
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:6px;" title="${label}: ${UI.formatCurrency(t.total)}">
              <div style="width:100%; max-width:26px; height:${h}px; background:linear-gradient(180deg, var(--color-primary), var(--color-primary-dark)); border-radius:6px 6px 3px 3px;"></div>
              <span class="text-xs text-faint" style="writing-mode:vertical-rl; transform:rotate(180deg); height:34px;">${label}</span>
            </div>`;
        }).join('')}
      </div>
    `;
  }

  function renderPipeline(breakdown) {
    const el = document.getElementById('pipelineBreakdown');
    if (!breakdown || !breakdown.length) {
      UI.emptyState(el, { title: 'No services yet', message: 'Job cards will show their pipeline stage here.' });
      return;
    }
    const max = Math.max(...breakdown.map((b) => b.count), 1);
    el.innerHTML = breakdown.map((b) => `
      <div style="margin-bottom:12px;">
        <div class="flex justify-between text-xs" style="margin-bottom:4px;">
          <span class="fw-600">${b.label}</span><span class="text-faint">${b.count}</span>
        </div>
        <div style="height:8px; background:#F1F5F9; border-radius:999px; overflow:hidden;">
          <div style="height:100%; width:${(b.count / max) * 100}%; background:${b.code === 'completed' ? 'var(--color-success)' : 'var(--color-primary)'}; border-radius:999px;"></div>
        </div>
      </div>
    `).join('');
  }

  async function load() {
    renderStatSkeleton();
    try {
      const data = await api.get('/dashboard/admin');
      renderStats(data);
      renderRevenueChart(data.revenueTrend);
      renderPipeline(data.statusBreakdown);
      document.getElementById('revenueTodayBadge').textContent = `Today: ${UI.formatCurrency(data.revenueToday)}`;
    } catch (err) {
      Toast.error(err.message || 'Failed to load dashboard.');
    }
  }

  load();

  ['booking:created', 'booking:updated', 'service:created', 'service:updated', 'transaction:created', 'transaction:updated', 'sparepart:updated', 'inventory:updated', 'vehicle:created'].forEach((evt) => {
    WSocket.on(evt, () => load());
  });
})();
