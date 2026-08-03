(function () {
  let state = { page: 1, limit: 10, search: '' };

  async function load() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = `<tr><td colspan="5"><div class="skeleton skeleton-row"></div></td></tr>`.repeat(5);
    try {
      const res = await api.get('/vehicles', { page: state.page, limit: state.limit, search: state.search });
      renderTable(res.items);
      UI.pagination(document.getElementById('paginationBar'), res, (p) => { state.page = p; load(); });
    } catch (err) {
      Toast.error(err.message || 'Failed to load vehicles.');
    }
  }

  function renderTable(items) {
    const tbody = document.getElementById('tableBody');
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">${UI.escapeHtml('')}<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 13l1.5-4.5A2 2 0 016.4 7h11.2a2 2 0 011.9 1.5L21 13" stroke="currentColor" stroke-width="1.7"/><rect x="2.5" y="13" width="19" height="5.5" rx="1.5" stroke="currentColor" stroke-width="1.7"/></svg></div><h4>No vehicles found</h4><p>Register a vehicle for a customer to get started.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = items.map((v) => `
      <tr>
        <td>
          <div class="flex items-center gap-3">
            <span class="avatar avatar-sm">${v.photo_url ? `<img src="${v.photo_url}"/>` : '🚗'}</span>
            <div>
              <div class="cell-primary">${UI.escapeHtml(v.brand)} ${UI.escapeHtml(v.model)}</div>
              <div class="cell-sub">${v.year} · ${UI.escapeHtml(v.color || '—')}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-neutral">${UI.escapeHtml(v.license_plate)}</span></td>
        <td>${UI.escapeHtml(v.customer_name)}</td>
        <td>${Number(v.mileage).toLocaleString()} km</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-outline" data-history="${v.id}">History</button>
            <button class="btn btn-sm btn-outline" data-edit="${v.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-delete="${v.id}" data-name="${UI.escapeHtml(v.brand + ' ' + v.model)}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-history]').forEach((b) => b.addEventListener('click', () => showHistory(b.dataset.history)));
    tbody.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editVehicle(b.dataset.edit)));
    tbody.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', () => deleteVehicle(b.dataset.delete, b.dataset.name)));
  }

  async function showHistory(id) {
    try {
      const records = await api.get(`/vehicles/${id}/history`);
      const body = records.length
        ? records.map((r) => `
          <div style="padding:12px 0; border-bottom:1px solid var(--color-border);">
            <div class="flex justify-between">
              <span class="fw-600 text-sm">${UI.escapeHtml(r.service_type)}</span>
              <span class="badge ${UI.statusBadgeClass(r.status_code)}">${UI.escapeHtml(r.status_label)}</span>
            </div>
            <div class="text-xs text-faint" style="margin-top:4px;">${UI.formatDate(r.created_at)} ${r.mechanic_name ? '· ' + UI.escapeHtml(r.mechanic_name) : ''}</div>
            ${r.repair_notes ? `<div class="text-sm text-muted" style="margin-top:6px;">${UI.escapeHtml(r.repair_notes)}</div>` : ''}
            <div class="text-xs text-faint" style="margin-top:4px;">Cost: ${UI.formatCurrency(r.final_cost ?? r.estimated_cost)}</div>
          </div>
        `).join('')
        : '<p class="text-sm text-faint">No service history yet.</p>';

      Modal.open({ title: 'Vehicle service history', bodyHTML: body, size: 'lg' });
    } catch (err) {
      Toast.error(err.message || 'Failed to load history.');
    }
  }

  function vehicleFormHTML(v = {}, customerLabel = '') {
    return `
      <form id="vehicleForm" class="flex flex-col gap-4">
        <div class="field">
          <label>Customer</label>
          <div style="position:relative;">
            <input class="input" id="vf_customerSearch" placeholder="Search customer by name or email…" value="${UI.escapeHtml(customerLabel)}" autocomplete="off" ${v.id ? 'disabled' : ''} />
            <input type="hidden" id="vf_customerId" value="${v.customer_id || ''}" />
            <div id="vf_customerResults" class="card" style="position:absolute; top:44px; left:0; right:0; z-index:20; max-height:200px; overflow-y:auto; display:none;"></div>
          </div>
        </div>
        <div class="form-grid">
          <div class="field"><label>Brand</label><input class="input" id="vf_brand" value="${UI.escapeHtml(v.brand || '')}" required /></div>
          <div class="field"><label>Model</label><input class="input" id="vf_model" value="${UI.escapeHtml(v.model || '')}" required /></div>
        </div>
        <div class="form-grid">
          <div class="field"><label>Year</label><input class="input" type="number" id="vf_year" value="${v.year || ''}" required min="1950" max="2100" /></div>
          <div class="field"><label>License plate</label><input class="input" id="vf_plate" value="${UI.escapeHtml(v.license_plate || '')}" required /></div>
        </div>
        <div class="form-grid">
          <div class="field"><label>Color</label><input class="input" id="vf_color" value="${UI.escapeHtml(v.color || '')}" /></div>
          <div class="field"><label>Mileage (km)</label><input class="input" type="number" id="vf_mileage" value="${v.mileage || 0}" min="0" /></div>
        </div>
        <div class="field"><label>Photo <span class="text-faint">(optional)</span></label><input class="input" type="file" id="vf_photo" accept="image/*" /></div>
      </form>
    `;
  }

  function wireCustomerSearch() {
    const input = document.getElementById('vf_customerSearch');
    const hidden = document.getElementById('vf_customerId');
    const results = document.getElementById('vf_customerResults');
    if (!input || input.disabled) return;

    const search = UI.debounce(async (q) => {
      if (!q.trim()) { results.style.display = 'none'; return; }
      try {
        const res = await api.get('/customers', { search: q, limit: 6 });
        if (!res.items.length) {
          results.innerHTML = `<div class="text-sm text-faint" style="padding:10px;">No matches</div>`;
        } else {
          results.innerHTML = res.items.map((c) => `
            <div class="dropdown-item" data-pick="${c.id}" data-label="${UI.escapeHtml(c.full_name)} (${UI.escapeHtml(c.email)})">
              ${UI.escapeHtml(c.full_name)} <span class="text-faint" style="margin-left:6px;">${UI.escapeHtml(c.email)}</span>
            </div>
          `).join('');
        }
        results.style.display = 'block';
      } catch (e) { /* ignore */ }
    }, 300);

    input.addEventListener('input', () => search(input.value));
    results.addEventListener('click', (e) => {
      const item = e.target.closest('[data-pick]');
      if (!item) return;
      hidden.value = item.dataset.pick;
      input.value = item.dataset.label;
      results.style.display = 'none';
    });
  }

  document.getElementById('addVehicleBtn').addEventListener('click', () => {
    const { close } = Modal.open({
      title: 'Register vehicle',
      bodyHTML: vehicleFormHTML(),
      footerHTML: `<button class="btn btn-outline" id="cancelVf">Cancel</button><button class="btn btn-primary" id="saveVf">Register</button>`,
      size: 'lg',
    });
    wireCustomerSearch();
    document.getElementById('cancelVf').addEventListener('click', close);
    document.getElementById('saveVf').addEventListener('click', async () => {
      const customerId = document.getElementById('vf_customerId').value;
      if (!customerId) return Toast.error('Please select a customer.');
      try {
        const fd = new FormData();
        fd.append('customerId', customerId);
        fd.append('brand', document.getElementById('vf_brand').value.trim());
        fd.append('model', document.getElementById('vf_model').value.trim());
        fd.append('year', document.getElementById('vf_year').value);
        fd.append('licensePlate', document.getElementById('vf_plate').value.trim());
        fd.append('color', document.getElementById('vf_color').value.trim());
        fd.append('mileage', document.getElementById('vf_mileage').value || 0);
        const photo = document.getElementById('vf_photo').files[0];
        if (photo) fd.append('photo', photo);

        await api.post('/vehicles', fd, { isForm: true });
        Toast.success('Vehicle registered.');
        close();
        load();
      } catch (err) {
        Toast.error(err.message || 'Failed to register vehicle.');
      }
    });
  });

  async function editVehicle(id) {
    try {
      const v = await api.get(`/vehicles/${id}`);
      const { close } = Modal.open({
        title: 'Edit vehicle',
        bodyHTML: vehicleFormHTML(v, v.customer_name),
        footerHTML: `<button class="btn btn-outline" id="cancelVf">Cancel</button><button class="btn btn-primary" id="saveVf">Save changes</button>`,
        size: 'lg',
      });
      document.getElementById('cancelVf').addEventListener('click', close);
      document.getElementById('saveVf').addEventListener('click', async () => {
        try {
          const fd = new FormData();
          fd.append('brand', document.getElementById('vf_brand').value.trim());
          fd.append('model', document.getElementById('vf_model').value.trim());
          fd.append('year', document.getElementById('vf_year').value);
          fd.append('licensePlate', document.getElementById('vf_plate').value.trim());
          fd.append('color', document.getElementById('vf_color').value.trim());
          fd.append('mileage', document.getElementById('vf_mileage').value || 0);
          const photo = document.getElementById('vf_photo').files[0];
          if (photo) fd.append('photo', photo);

          await api.put(`/vehicles/${id}`, fd, { isForm: true });
          Toast.success('Vehicle updated.');
          close();
          load();
        } catch (err) {
          Toast.error(err.message || 'Failed to update vehicle.');
        }
      });
    } catch (err) {
      Toast.error(err.message || 'Failed to load vehicle.');
    }
  }

  async function deleteVehicle(id, name) {
    const confirmed = await Modal.confirm({
      title: 'Delete vehicle?',
      message: `This will permanently remove ${name} and its service history.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/vehicles/${id}`);
      Toast.success('Vehicle deleted.');
      load();
    } catch (err) {
      Toast.error(err.message || 'Failed to delete vehicle.');
    }
  }

  document.getElementById('searchInput').addEventListener('input', UI.debounce((e) => {
    state.search = e.target.value;
    state.page = 1;
    load();
  }, 350));

  load();
  WSocket.on('vehicle:created', load);
})();
