(function () {
  let activeTab = 'revenue';
  let range = { from: '', to: '' };

  function skeleton() {
    document.getElementById('reportContent').innerHTML = `
      <div class="card card-pad" style="margin-top:16px;">
        <div class="skeleton skeleton-row"></div>
        <div class="skeleton skeleton-row"></div>
        <div class="skeleton skeleton-row"></div>
      </div>
    `;
  }

  async function load() {
    skeleton();
    try {
      if (activeTab === 'revenue') return renderRevenue(await api.get('/reports/revenue', range));
      if (activeTab === 'services') return renderServices(await api.get('/reports/services', range));
      if (activeTab === 'bookings') return renderBookings(await api.get('/reports/bookings', range));
      if (activeTab === 'inventory') return renderInventory(await api.get('/reports/inventory'));
    } catch (err) {
      Toast.error(err.message || 'Failed to load report.');
    }
  }

  function renderRevenue(data) {
    const el = document.getElementById('reportContent');
    el.innerHTML = `
      <div class="stat-grid" style="margin-top:16px;">
        <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">${UI.formatCurrency(data.total)}</div></div>
        <div class="stat-card"><div class="stat-label">Paid Invoices</div><div class="stat-value">${data.count}</div></div>
        <div class="stat-card"><div class="stat-label">Avg. Invoice</div><div class="stat-value">${UI.formatCurrency(data.count ? data.total / data.count : 0)}</div></div>
      </div>
      <div class="card" style="margin-top:16px;">
        <div class="card-header"><h3>By payment method</h3></div>
        <div class="card-body" id="methodBreakdown"></div>
      </div>
      <div class="card" style="margin-top:16px;">
        <div class="card-header"><h3>14-day trend</h3></div>
        <div class="card-body" id="trendChart"></div>
      </div>
    `;

    const methodEl = document.getElementById('methodBreakdown');
    if (!data.byMethod.length) {
      UI.emptyState(methodEl, { title: 'No paid invoices in range' });
    } else {
      const max = Math.max(...data.byMethod.map((m) => m.total), 1);
      methodEl.innerHTML = data.byMethod.map((m) => `
        <div style="margin-bottom:12px;">
          <div class="flex justify-between text-sm" style="margin-bottom:4px;"><span class="fw-600" style="text-transform:capitalize;">${m.payment_method}</span><span class="text-faint">${UI.formatCurrency(m.total)} (${m.count})</span></div>
          <div style="height:8px;background:#F1F5F9;border-radius:999px;overflow:hidden;"><div style="height:100%;width:${(m.total / max) * 100}%;background:var(--color-primary);"></div></div>
        </div>
      `).join('');
    }

    const trendEl = document.getElementById('trendChart');
    const max = Math.max(...data.trend.map((t) => t.total), 1);
    trendEl.innerHTML = `<div style="display:flex; align-items:flex-end; gap:6px; height:160px;">
      ${data.trend.map((t) => {
        const h = Math.max(4, Math.round((t.total / max) * 140));
        return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;" title="${t.date}: ${UI.formatCurrency(t.total)}">
          <div style="width:100%; max-width:22px; height:${h}px; background:var(--color-primary); border-radius:5px 5px 2px 2px;"></div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function renderServices(data) {
    const el = document.getElementById('reportContent');
    el.innerHTML = `
      <div class="stat-grid" style="margin-top:16px;">
        <div class="stat-card"><div class="stat-label">Total Services</div><div class="stat-value">${data.totalServices}</div></div>
        <div class="stat-card"><div class="stat-label">Completed Revenue</div><div class="stat-value">${UI.formatCurrency(data.totalFinalCost)}</div></div>
        <div class="stat-card"><div class="stat-label">Avg. Turnaround</div><div class="stat-value">${data.avgTurnaroundHours}h</div></div>
      </div>
      <div class="card" style="margin-top:16px;">
        <div class="card-header"><h3>By status</h3></div>
        <div class="card-body" id="statusBreak"></div>
      </div>
    `;
    const container = document.getElementById('statusBreak');
    if (!data.byStatus.length || data.byStatus.every((s) => s.count === 0)) {
      UI.emptyState(container, { title: 'No services in range' });
      return;
    }
    const max = Math.max(...data.byStatus.map((s) => s.count), 1);
    container.innerHTML = data.byStatus.map((s) => `
      <div style="margin-bottom:12px;">
        <div class="flex justify-between text-sm" style="margin-bottom:4px;"><span class="fw-600">${s.label}</span><span class="text-faint">${s.count}</span></div>
        <div style="height:8px;background:#F1F5F9;border-radius:999px;overflow:hidden;"><div style="height:100%;width:${(s.count / max) * 100}%;background:var(--color-primary);"></div></div>
      </div>
    `).join('');
  }

  function renderBookings(data) {
    const el = document.getElementById('reportContent');
    el.innerHTML = `
      <div class="card" style="margin-top:16px;">
        <div class="card-header"><h3>Bookings by status</h3></div>
        <div class="card-body" id="bookingBreak"></div>
      </div>
    `;
    const container = document.getElementById('bookingBreak');
    if (!data.byStatus.length) {
      UI.emptyState(container, { title: 'No bookings in range' });
      return;
    }
    const max = Math.max(...data.byStatus.map((s) => s.count), 1);
    container.innerHTML = data.byStatus.map((s) => `
      <div style="margin-bottom:12px;">
        <div class="flex justify-between text-sm" style="margin-bottom:4px;"><span class="fw-600" style="text-transform:capitalize;">${s.status}</span><span class="text-faint">${s.count}</span></div>
        <div style="height:8px;background:#F1F5F9;border-radius:999px;overflow:hidden;"><div style="height:100%;width:${(s.count / max) * 100}%;background:var(--color-primary);"></div></div>
      </div>
    `).join('');
  }

  function renderInventory(data) {
    const el = document.getElementById('reportContent');
    el.innerHTML = `
      <div class="stat-grid" style="margin-top:16px;">
        <div class="stat-card"><div class="stat-label">Total Parts</div><div class="stat-value">${data.totalParts}</div></div>
        <div class="stat-card"><div class="stat-label">Total Units</div><div class="stat-value">${data.totalUnits}</div></div>
        <div class="stat-card"><div class="stat-label">Inventory Value</div><div class="stat-value">${UI.formatCurrency(data.totalValue)}</div></div>
        <div class="stat-card"><div class="stat-label">Low Stock Items</div><div class="stat-value">${data.lowStockCount}</div></div>
      </div>
      <div class="card" style="margin-top:16px;">
        <div class="card-header"><h3>Low stock items</h3></div>
        <div class="table-wrap" style="border:none;">
          <table class="data-table">
            <thead><tr><th>Part</th><th>SKU</th><th>Quantity</th><th>Threshold</th></tr></thead>
            <tbody>
              ${data.lowStockItems.length ? data.lowStockItems.map((i) => `
                <tr><td class="cell-primary">${UI.escapeHtml(i.name)}</td><td>${UI.escapeHtml(i.sku)}</td><td><span class="badge badge-danger">${i.quantity}</span></td><td>${i.min_stock_threshold}</td></tr>
              `).join('') : `<tr><td colspan="4" class="text-center text-faint" style="padding:24px;">All parts are sufficiently stocked.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  document.querySelectorAll('#reportTabs .tab-btn').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#reportTabs .tab-btn').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      load();
    });
  });

  document.getElementById('applyRange').addEventListener('click', () => {
    range.from = document.getElementById('fromDate').value;
    range.to = document.getElementById('toDate').value;
    load();
  });
  document.getElementById('clearRange').addEventListener('click', () => {
    document.getElementById('fromDate').value = '';
    document.getElementById('toDate').value = '';
    range = { from: '', to: '' };
    load();
  });

  load();
})();
