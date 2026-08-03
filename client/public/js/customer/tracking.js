(function () {
  let STATUSES = [];

  async function bootstrap() {
    try {
      STATUSES = await api.get('/services/statuses');
    } catch (e) { /* ignore */ }
    load();
  }

  async function load() {
    const wrap = document.getElementById('servicesWrap');
    wrap.innerHTML = Array.from({ length: 2 }).map(() => '<div class="skeleton" style="height:220px; border-radius:16px;"></div>').join('');
    try {
      const services = await api.get('/services/mine/active');
      render(services);
    } catch (err) {
      Toast.error(err.message || 'Failed to load service tracking.');
    }
  }

  function render(services) {
    const wrap = document.getElementById('servicesWrap');
    if (!services.length) {
      wrap.innerHTML = `<div class="card">${emptyHTML()}</div>`;
      return;
    }
    wrap.innerHTML = services.map((s) => serviceCard(s)).join('');
  }

  function emptyHTML() {
    return `<div class="empty-state">
      <div class="empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></div>
      <h4>No active services</h4>
      <p>Once a booking is accepted, you'll be able to track its live progress here.</p>
    </div>`;
  }

  function estimatedWait(s) {
    if (s.estimated_completion) return UI.formatDateTime(s.estimated_completion);
    if (s.status_code === 'waiting' && s.queue_position) {
      const mins = s.queue_position * 45;
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      return hrs ? `~${hrs}h ${rem}m` : `~${rem}m`;
    }
    return 'Calculating…';
  }

  function serviceCard(s) {
    const pipeline = STATUSES.map((st) => {
      const cls = st.sort_order < s.status_sort ? 'done' : st.sort_order === s.status_sort ? 'current' : '';
      return `<div class="pipeline-step ${cls}">${st.label}</div>`;
    }).join('');

    return `
      <div class="card card-pad">
        <div class="flex justify-between items-start" style="margin-bottom:16px; flex-wrap:wrap; gap:10px;">
          <div>
            <div class="fw-700" style="font-size:17px;">${UI.escapeHtml(s.brand)} ${UI.escapeHtml(s.model)} <span class="text-faint text-sm">· ${UI.escapeHtml(s.license_plate)}</span></div>
            <div class="text-sm text-muted">${UI.escapeHtml(s.service_type)}</div>
          </div>
          <span class="badge ${UI.statusBadgeClass(s.status_code)}" style="font-size:13px; padding:6px 14px;">${UI.escapeHtml(s.status_label)}</span>
        </div>

        <div class="pipeline" style="margin-bottom:20px;">${pipeline}</div>

        <div class="stat-grid" style="grid-template-columns:repeat(4,1fr); gap:12px;">
          <div class="card card-pad" style="box-shadow:none; padding:14px;">
            <div class="stat-label">Queue Position</div>
            <div class="stat-value" style="font-size:20px;">${s.queue_position ? '#' + s.queue_position : '—'}</div>
          </div>
          <div class="card card-pad" style="box-shadow:none; padding:14px;">
            <div class="stat-label">Est. Wait / Ready</div>
            <div class="stat-value" style="font-size:16px;">${estimatedWait(s)}</div>
          </div>
          <div class="card card-pad" style="box-shadow:none; padding:14px;">
            <div class="stat-label">Mechanic</div>
            <div class="stat-value" style="font-size:16px;">${s.mechanic_name ? UI.escapeHtml(s.mechanic_name) : 'Unassigned'}</div>
          </div>
          <div class="card card-pad" style="box-shadow:none; padding:14px;">
            <div class="stat-label">Estimated Cost</div>
            <div class="stat-value" style="font-size:16px;">${UI.formatCurrency(s.estimated_cost)}</div>
          </div>
        </div>

        ${s.repair_notes ? `
          <div style="margin-top:16px; background:var(--color-primary-tint); border-radius:var(--radius-sm); padding:14px;">
            <div class="text-xs fw-600" style="color:#0B3A56; margin-bottom:4px;">Repair notes from the workshop</div>
            <div class="text-sm" style="color:#0B3A56;">${UI.escapeHtml(s.repair_notes)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  bootstrap();
  ['service:updated', 'service:created'].forEach((evt) => WSocket.on(evt, load));
})();
