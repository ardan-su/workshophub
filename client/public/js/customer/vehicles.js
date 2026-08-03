(function () {
  async function load() {
    const grid = document.getElementById('vehicleGrid');
    grid.innerHTML = Array.from({ length: 3 }).map(() => '<div class="skeleton" style="height:180px; border-radius:16px;"></div>').join('');
    try {
      const vehicles = await api.get('/vehicles/mine');
      renderGrid(vehicles);
    } catch (err) {
      Toast.error(err.message || 'Failed to load vehicles.');
    }
  }

  function renderGrid(vehicles) {
    const grid = document.getElementById('vehicleGrid');
    if (!vehicles.length) {
      grid.innerHTML = `<div class="card" style="grid-column:1/-1;">${emptyHTML()}</div>`;
      return;
    }
    grid.innerHTML = vehicles.map((v) => `
      <div class="card card-pad">
        <div class="flex justify-between items-start" style="margin-bottom:12px;">
          <span class="avatar avatar-lg">${v.photo_url ? `<img src="${v.photo_url}"/>` : '🚗'}</span>
          <span class="badge badge-neutral">${UI.escapeHtml(v.license_plate)}</span>
        </div>
        <div class="fw-700" style="font-size:16px;">${UI.escapeHtml(v.brand)} ${UI.escapeHtml(v.model)}</div>
        <div class="text-sm text-faint">${v.year} · ${UI.escapeHtml(v.color || 'No color set')}</div>
        <div class="text-sm text-muted" style="margin-top:8px;">${Number(v.mileage).toLocaleString()} km</div>
        <div class="flex gap-2" style="margin-top:16px;">
          <button class="btn btn-sm btn-outline" data-history="${v.id}" style="flex:1;">History</button>
          <button class="btn btn-sm btn-outline" data-edit="${v.id}" style="flex:1;">Edit</button>
          <button class="btn btn-sm btn-danger" data-delete="${v.id}" data-name="${UI.escapeHtml(v.brand + ' ' + v.model)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6h12z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('[data-history]').forEach((b) => b.addEventListener('click', () => showHistory(b.dataset.history)));
    grid.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editVehicle(b.dataset.edit)));
    grid.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', () => deleteVehicle(b.dataset.delete, b.dataset.name)));
  }

  function emptyHTML() {
    return `<div class="empty-state">
      <div class="empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 13l1.5-4.5A2 2 0 016.4 7h11.2a2 2 0 011.9 1.5L21 13" stroke="currentColor" stroke-width="1.7"/><rect x="2.5" y="13" width="19" height="5.5" rx="1.5" stroke="currentColor" stroke-width="1.7"/></svg></div>
      <h4>No vehicles yet</h4>
      <p>Register your first vehicle to start booking services.</p>
    </div>`;
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
            <div class="text-xs text-faint" style="margin-top:4px;">Cost: ${UI.formatCurrency(r.final_cost ?? r.estimated_cost)}</div>
          </div>
        `).join('')
        : '<p class="text-sm text-faint">No service history yet.</p>';
      Modal.open({ title: 'Service history', bodyHTML: body, size: 'lg' });
    } catch (err) {
      Toast.error(err.message || 'Failed to load history.');
    }
  }

  function formHTML(v = {}) {
    return `
      <form id="vForm" class="flex flex-col gap-4">
        <div class="form-grid">
          <div class="field"><label>Brand</label><input class="input" id="v_brand" value="${UI.escapeHtml(v.brand || '')}" required /></div>
          <div class="field"><label>Model</label><input class="input" id="v_model" value="${UI.escapeHtml(v.model || '')}" required /></div>
        </div>
        <div class="form-grid">
          <div class="field"><label>Year</label><input class="input" type="number" id="v_year" value="${v.year || ''}" required min="1950" max="2100" /></div>
          <div class="field"><label>License plate</label><input class="input" id="v_plate" value="${UI.escapeHtml(v.license_plate || '')}" required /></div>
        </div>
        <div class="form-grid">
          <div class="field"><label>Color</label><input class="input" id="v_color" value="${UI.escapeHtml(v.color || '')}" /></div>
          <div class="field"><label>Mileage (km)</label><input class="input" type="number" id="v_mileage" value="${v.mileage || 0}" min="0" /></div>
        </div>
        <div class="field"><label>Photo <span class="text-faint">(optional)</span></label><input class="input" type="file" id="v_photo" accept="image/*" /></div>
      </form>
    `;
  }

  document.getElementById('addVehicleBtn').addEventListener('click', () => {
    const { close } = Modal.open({
      title: 'Register vehicle',
      bodyHTML: formHTML(),
      footerHTML: `<button class="btn btn-outline" id="v_cancel">Cancel</button><button class="btn btn-primary" id="v_save">Register</button>`,
    });
    document.getElementById('v_cancel').addEventListener('click', close);
    document.getElementById('v_save').addEventListener('click', async () => {
      try {
        const fd = new FormData();
        fd.append('brand', document.getElementById('v_brand').value.trim());
        fd.append('model', document.getElementById('v_model').value.trim());
        fd.append('year', document.getElementById('v_year').value);
        fd.append('licensePlate', document.getElementById('v_plate').value.trim());
        fd.append('color', document.getElementById('v_color').value.trim());
        fd.append('mileage', document.getElementById('v_mileage').value || 0);
        const photo = document.getElementById('v_photo').files[0];
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
        bodyHTML: formHTML(v),
        footerHTML: `<button class="btn btn-outline" id="v_cancel">Cancel</button><button class="btn btn-primary" id="v_save">Save changes</button>`,
      });
      document.getElementById('v_cancel').addEventListener('click', close);
      document.getElementById('v_save').addEventListener('click', async () => {
        try {
          const fd = new FormData();
          fd.append('brand', document.getElementById('v_brand').value.trim());
          fd.append('model', document.getElementById('v_model').value.trim());
          fd.append('year', document.getElementById('v_year').value);
          fd.append('licensePlate', document.getElementById('v_plate').value.trim());
          fd.append('color', document.getElementById('v_color').value.trim());
          fd.append('mileage', document.getElementById('v_mileage').value || 0);
          const photo = document.getElementById('v_photo').files[0];
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
    const confirmed = await Modal.confirm({ title: 'Delete vehicle?', message: `Remove ${name} from your account? This also deletes its service history.`, confirmText: 'Delete', danger: true });
    if (!confirmed) return;
    try {
      await api.delete(`/vehicles/${id}`);
      Toast.success('Vehicle deleted.');
      load();
    } catch (err) {
      Toast.error(err.message || 'Failed to delete vehicle.');
    }
  }

  load();
})();
