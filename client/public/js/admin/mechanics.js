(function () {
  let state = { page: 1, limit: 10, search: '' };

  async function load() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = `<tr><td colspan="6"><div class="skeleton skeleton-row"></div></td></tr>`.repeat(5);
    try {
      const res = await api.get('/mechanics', { page: state.page, limit: state.limit, search: state.search });
      renderTable(res.items);
      UI.pagination(document.getElementById('paginationBar'), res, (p) => { state.page = p; load(); });
    } catch (err) {
      Toast.error(err.message || 'Failed to load mechanics.');
    }
  }

  function renderTable(items) {
    const tbody = document.getElementById('tableBody');
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a3.5 3.5 0 01-4.6 4.6L4 17v3h3l6.1-6.1a3.5 3.5 0 004.6-4.6l-2.3 2.3-2-2 2.3-2.3z" stroke="currentColor" stroke-width="1.5"/></svg></div><h4>No mechanics yet</h4><p>Add your first technician to start assigning jobs.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = items.map((m) => `
      <tr>
        <td>
          <div class="flex items-center gap-3">
            <span class="avatar avatar-sm">${m.avatar_url ? `<img src="${m.avatar_url}"/>` : Session.initials(m.full_name)}</span>
            <span class="cell-primary">${UI.escapeHtml(m.full_name)}</span>
          </div>
        </td>
        <td>${UI.escapeHtml(m.specialization || '—')}</td>
        <td>${UI.escapeHtml(m.phone || '—')}<div class="cell-sub">${UI.escapeHtml(m.email || '')}</div></td>
        <td>${m.active_jobs}</td>
        <td><span class="badge ${UI.statusBadgeClass(m.status)}">${m.status}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-outline" data-edit="${m.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-delete="${m.id}" data-name="${UI.escapeHtml(m.full_name)}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editMechanic(b.dataset.edit)));
    tbody.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', () => deleteMechanic(b.dataset.delete, b.dataset.name)));
  }

  function formHTML(m = {}) {
    return `
      <form id="mForm" class="flex flex-col gap-4">
        <div class="field"><label>Full name</label><input class="input" id="m_name" value="${UI.escapeHtml(m.full_name || '')}" required /></div>
        <div class="form-grid">
          <div class="field"><label>Specialization</label><input class="input" id="m_spec" value="${UI.escapeHtml(m.specialization || '')}" placeholder="e.g. Engine, Electrical" /></div>
          <div class="field">
            <label>Status</label>
            <select class="select" id="m_status">
              <option value="active" ${m.status !== 'inactive' ? 'selected' : ''}>Active</option>
              <option value="inactive" ${m.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </div>
        <div class="form-grid">
          <div class="field"><label>Phone</label><input class="input" id="m_phone" value="${UI.escapeHtml(m.phone || '')}" /></div>
          <div class="field"><label>Email</label><input class="input" type="email" id="m_email" value="${UI.escapeHtml(m.email || '')}" /></div>
        </div>
        <div class="field"><label>Photo <span class="text-faint">(optional)</span></label><input class="input" type="file" id="m_avatar" accept="image/*" /></div>
      </form>
    `;
  }

  document.getElementById('addMechanicBtn').addEventListener('click', () => {
    const { close } = Modal.open({
      title: 'Add mechanic',
      bodyHTML: formHTML(),
      footerHTML: `<button class="btn btn-outline" id="m_cancel">Cancel</button><button class="btn btn-primary" id="m_save">Add mechanic</button>`,
    });
    document.getElementById('m_cancel').addEventListener('click', close);
    document.getElementById('m_save').addEventListener('click', async () => {
      try {
        const fd = new FormData();
        fd.append('fullName', document.getElementById('m_name').value.trim());
        fd.append('specialization', document.getElementById('m_spec').value.trim());
        fd.append('phone', document.getElementById('m_phone').value.trim());
        fd.append('email', document.getElementById('m_email').value.trim());
        const avatar = document.getElementById('m_avatar').files[0];
        if (avatar) fd.append('avatar', avatar);
        await api.post('/mechanics', fd, { isForm: true });
        Toast.success('Mechanic added.');
        close();
        load();
      } catch (err) {
        Toast.error(err.message || 'Failed to add mechanic.');
      }
    });
  });

  async function editMechanic(id) {
    try {
      const m = await api.get(`/mechanics/${id}`);
      const { close } = Modal.open({
        title: 'Edit mechanic',
        bodyHTML: formHTML(m),
        footerHTML: `<button class="btn btn-outline" id="m_cancel">Cancel</button><button class="btn btn-primary" id="m_save">Save changes</button>`,
      });
      document.getElementById('m_cancel').addEventListener('click', close);
      document.getElementById('m_save').addEventListener('click', async () => {
        try {
          const fd = new FormData();
          fd.append('fullName', document.getElementById('m_name').value.trim());
          fd.append('specialization', document.getElementById('m_spec').value.trim());
          fd.append('phone', document.getElementById('m_phone').value.trim());
          fd.append('email', document.getElementById('m_email').value.trim());
          fd.append('status', document.getElementById('m_status').value);
          const avatar = document.getElementById('m_avatar').files[0];
          if (avatar) fd.append('avatar', avatar);
          await api.put(`/mechanics/${id}`, fd, { isForm: true });
          Toast.success('Mechanic updated.');
          close();
          load();
        } catch (err) {
          Toast.error(err.message || 'Failed to update mechanic.');
        }
      });
    } catch (err) {
      Toast.error(err.message || 'Failed to load mechanic.');
    }
  }

  async function deleteMechanic(id, name) {
    const confirmed = await Modal.confirm({ title: 'Delete mechanic?', message: `Remove ${name} from your workshop roster?`, confirmText: 'Delete', danger: true });
    if (!confirmed) return;
    try {
      await api.delete(`/mechanics/${id}`);
      Toast.success('Mechanic deleted.');
      load();
    } catch (err) {
      Toast.error(err.message || 'Failed to delete mechanic.');
    }
  }

  document.getElementById('searchInput').addEventListener('input', UI.debounce((e) => {
    state.search = e.target.value;
    state.page = 1;
    load();
  }, 350));

  load();
})();
