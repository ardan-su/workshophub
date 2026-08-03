(function () {
  let state = { page: 1, limit: 10, search: '' };

  async function load() {
    const tbody = document.getElementById('tableBody');
    UI.skeletonRows(tbody.closest('.table-wrap').parentElement.querySelector('.table-wrap') ? null : null);
    tbody.innerHTML = `<tr><td colspan="5"><div class="skeleton skeleton-row"></div></td></tr>`.repeat(5);

    try {
      const res = await api.get('/customers', { page: state.page, limit: state.limit, search: state.search });
      renderTable(res.items);
      UI.pagination(document.getElementById('paginationBar'), res, (p) => { state.page = p; load(); });
    } catch (err) {
      Toast.error(err.message || 'Failed to load customers.');
    }
  }

  function renderTable(items) {
    const tbody = document.getElementById('tableBody');
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="5">${emptyStateHTML()}</td></tr>`;
      return;
    }
    tbody.innerHTML = items.map((c) => `
      <tr>
        <td>
          <div class="flex items-center gap-3">
            <span class="avatar avatar-sm">${c.avatar_url ? `<img src="${c.avatar_url}"/>` : Session.initials(c.full_name)}</span>
            <div>
              <div class="cell-primary">${UI.escapeHtml(c.full_name)}</div>
              <div class="cell-sub">@${UI.escapeHtml(c.username)}</div>
            </div>
          </div>
        </td>
        <td>
          <div>${UI.escapeHtml(c.email)}</div>
          <div class="cell-sub">${UI.escapeHtml(c.phone || '—')}</div>
        </td>
        <td>${UI.formatDate(c.created_at)}</td>
        <td><span class="badge ${c.is_active ? 'badge-success' : 'badge-neutral'}">${c.is_active ? 'Active' : 'Deactivated'}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-outline" data-view="${c.id}">View</button>
            <button class="btn btn-sm btn-outline" data-edit="${c.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-delete="${c.id}" data-name="${UI.escapeHtml(c.full_name)}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => viewCustomer(b.dataset.view)));
    tbody.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editCustomer(b.dataset.edit)));
    tbody.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', () => deleteCustomer(b.dataset.delete, b.dataset.name)));
  }

  function emptyStateHTML() {
    return `<div class="empty-state">
      <div class="empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="currentColor" stroke-width="1.7"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></div>
      <h4>No customers found</h4>
      <p>Try a different search, or check back once customers register.</p>
    </div>`;
  }

  async function viewCustomer(id) {
    try {
      const c = await api.get(`/customers/${id}`);
      const vehiclesHTML = c.vehicles.length
        ? c.vehicles.map((v) => `<div class="flex justify-between text-sm" style="padding:8px 0; border-bottom:1px solid var(--color-border);"><span>${UI.escapeHtml(v.brand)} ${UI.escapeHtml(v.model)} (${v.year})</span><span class="text-faint">${UI.escapeHtml(v.license_plate)}</span></div>`).join('')
        : '<p class="text-sm text-faint">No vehicles registered.</p>';

      Modal.open({
        title: c.full_name,
        bodyHTML: `
          <div class="flex flex-col gap-2 text-sm" style="margin-bottom:16px;">
            <div><span class="text-faint">Email:</span> ${UI.escapeHtml(c.email)}</div>
            <div><span class="text-faint">Phone:</span> ${UI.escapeHtml(c.phone || '—')}</div>
            <div><span class="text-faint">Address:</span> ${UI.escapeHtml(c.address || '—')}${c.city ? ', ' + UI.escapeHtml(c.city) : ''}</div>
            <div><span class="text-faint">Joined:</span> ${UI.formatDate(c.created_at)}</div>
          </div>
          <h4 style="margin-bottom:8px;">Vehicles</h4>
          ${vehiclesHTML}
        `,
      });
    } catch (err) {
      Toast.error(err.message || 'Failed to load customer.');
    }
  }

  async function editCustomer(id) {
    try {
      const c = await api.get(`/customers/${id}`);
      const { close } = Modal.open({
        title: `Edit ${c.full_name}`,
        bodyHTML: `
          <form id="editForm" class="flex flex-col gap-4">
            <div class="field"><label>Full name</label><input class="input" id="ef_name" value="${UI.escapeHtml(c.full_name)}" required /></div>
            <div class="form-grid">
              <div class="field"><label>Phone</label><input class="input" id="ef_phone" value="${UI.escapeHtml(c.phone || '')}" /></div>
              <div class="field"><label>City</label><input class="input" id="ef_city" value="${UI.escapeHtml(c.city || '')}" /></div>
            </div>
            <div class="field"><label>Address</label><input class="input" id="ef_address" value="${UI.escapeHtml(c.address || '')}" /></div>
            <div class="field"><label>Notes</label><textarea class="textarea" id="ef_notes">${UI.escapeHtml(c.notes || '')}</textarea></div>
          </form>
        `,
        footerHTML: `<button class="btn btn-outline" id="cancelEdit">Cancel</button><button class="btn btn-primary" id="saveEdit">Save changes</button>`,
      });

      document.getElementById('cancelEdit').addEventListener('click', close);
      document.getElementById('saveEdit').addEventListener('click', async () => {
        try {
          await api.put(`/customers/${id}`, {
            fullName: document.getElementById('ef_name').value.trim(),
            phone: document.getElementById('ef_phone').value.trim(),
            city: document.getElementById('ef_city').value.trim(),
            address: document.getElementById('ef_address').value.trim(),
            notes: document.getElementById('ef_notes').value.trim(),
          });
          Toast.success('Customer updated.');
          close();
          load();
        } catch (err) {
          Toast.error(err.message || 'Failed to update customer.');
        }
      });
    } catch (err) {
      Toast.error(err.message || 'Failed to load customer.');
    }
  }

  async function deleteCustomer(id, name) {
    const confirmed = await Modal.confirm({
      title: 'Delete customer?',
      message: `This will permanently remove ${name} and all of their vehicles, bookings and service history. This cannot be undone.`,
      confirmText: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/customers/${id}`);
      Toast.success('Customer deleted.');
      load();
    } catch (err) {
      Toast.error(err.message || 'Failed to delete customer.');
    }
  }

  document.getElementById('searchInput').addEventListener('input', UI.debounce((e) => {
    state.search = e.target.value;
    state.page = 1;
    load();
  }, 350));

  load();
  ['booking:created'].forEach((evt) => WSocket.on(evt, load));
})();
