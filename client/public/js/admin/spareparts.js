(function () {
  let state = { page: 1, limit: 10, search: '', lowStockOnly: false };

  async function load() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = `<tr><td colspan="6"><div class="skeleton skeleton-row"></div></td></tr>`.repeat(6);
    try {
      const res = await api.get('/spare-parts', { page: state.page, limit: state.limit, search: state.search, lowStockOnly: state.lowStockOnly });
      renderTable(res.items);
      UI.pagination(document.getElementById('paginationBar'), res, (p) => { state.page = p; load(); });
    } catch (err) {
      Toast.error(err.message || 'Failed to load spare parts.');
    }
  }

  function renderTable(items) {
    const tbody = document.getElementById('tableBody');
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 8l-9-5-9 5 9 5 9-5z" stroke="currentColor" stroke-width="1.7"/></svg></div><h4>No spare parts found</h4><p>Add parts to your catalog to start tracking inventory.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = items.map((p) => {
      const low = p.quantity <= p.min_stock_threshold;
      return `
      <tr>
        <td class="cell-primary">${UI.escapeHtml(p.name)}</td>
        <td><span class="badge badge-neutral">${UI.escapeHtml(p.sku)}</span></td>
        <td>${UI.escapeHtml(p.category || '—')}</td>
        <td>${UI.formatCurrency(p.unit_price)}</td>
        <td>
          <span class="badge ${low ? 'badge-danger' : 'badge-success'}">${p.quantity} in stock</span>
          ${low ? '<div class="cell-sub text-danger">Low stock — reorder soon</div>' : ''}
        </td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-outline" data-edit="${p.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-delete="${p.id}" data-name="${UI.escapeHtml(p.name)}">Delete</button>
          </div>
        </td>
      </tr>
    `;
    }).join('');

    tbody.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => editPart(b.dataset.edit)));
    tbody.querySelectorAll('[data-delete]').forEach((b) => b.addEventListener('click', () => deletePart(b.dataset.delete, b.dataset.name)));
  }

  function formHTML(p = {}, isNew = true) {
    return `
      <form id="pForm" class="flex flex-col gap-4">
        <div class="field"><label>Part name</label><input class="input" id="p_name" value="${UI.escapeHtml(p.name || '')}" required /></div>
        <div class="form-grid">
          <div class="field"><label>SKU</label><input class="input" id="p_sku" value="${UI.escapeHtml(p.sku || '')}" required ${isNew ? '' : 'disabled'} /></div>
          <div class="field"><label>Category</label><input class="input" id="p_category" value="${UI.escapeHtml(p.category || '')}" placeholder="e.g. Brakes, Engine" /></div>
        </div>
        <div class="form-grid">
          <div class="field"><label>Unit price</label><input class="input" type="number" id="p_price" value="${p.unit_price || 0}" required min="0" step="0.01" /></div>
          <div class="field"><label>${isNew ? 'Initial quantity' : 'Quantity'} ${isNew ? '' : '<span class=\"text-faint\">(use Inventory page to adjust stock)</span>'}</label><input class="input" type="number" id="p_qty" value="${p.quantity || 0}" min="0" ${isNew ? '' : 'disabled'} /></div>
        </div>
        <div class="field"><label>Low stock threshold</label><input class="input" type="number" id="p_threshold" value="${p.min_stock_threshold || 5}" min="0" /></div>
      </form>
    `;
  }

  document.getElementById('addPartBtn').addEventListener('click', () => {
    const { close } = Modal.open({
      title: 'Add spare part',
      bodyHTML: formHTML({}, true),
      footerHTML: `<button class="btn btn-outline" id="p_cancel">Cancel</button><button class="btn btn-primary" id="p_save">Add part</button>`,
    });
    document.getElementById('p_cancel').addEventListener('click', close);
    document.getElementById('p_save').addEventListener('click', async () => {
      try {
        await api.post('/spare-parts', {
          name: document.getElementById('p_name').value.trim(),
          sku: document.getElementById('p_sku').value.trim(),
          category: document.getElementById('p_category').value.trim(),
          unitPrice: document.getElementById('p_price').value,
          quantity: document.getElementById('p_qty').value,
          minStockThreshold: document.getElementById('p_threshold').value,
        });
        Toast.success('Spare part added.');
        close();
        load();
      } catch (err) {
        Toast.error(err.message || 'Failed to add spare part.');
      }
    });
  });

  async function editPart(id) {
    try {
      const p = await api.get(`/spare-parts/${id}`);
      const { close } = Modal.open({
        title: 'Edit spare part',
        bodyHTML: formHTML(p, false),
        footerHTML: `<button class="btn btn-outline" id="p_cancel">Cancel</button><button class="btn btn-primary" id="p_save">Save changes</button>`,
      });
      document.getElementById('p_cancel').addEventListener('click', close);
      document.getElementById('p_save').addEventListener('click', async () => {
        try {
          await api.put(`/spare-parts/${id}`, {
            name: document.getElementById('p_name').value.trim(),
            category: document.getElementById('p_category').value.trim(),
            unitPrice: document.getElementById('p_price').value,
            minStockThreshold: document.getElementById('p_threshold').value,
          });
          Toast.success('Spare part updated.');
          close();
          load();
        } catch (err) {
          Toast.error(err.message || 'Failed to update spare part.');
        }
      });
    } catch (err) {
      Toast.error(err.message || 'Failed to load spare part.');
    }
  }

  async function deletePart(id, name) {
    const confirmed = await Modal.confirm({ title: 'Delete spare part?', message: `Remove ${name} from the catalog? This cannot be undone.`, confirmText: 'Delete', danger: true });
    if (!confirmed) return;
    try {
      await api.delete(`/spare-parts/${id}`);
      Toast.success('Spare part deleted.');
      load();
    } catch (err) {
      Toast.error(err.message || 'Failed to delete spare part.');
    }
  }

  document.getElementById('searchInput').addEventListener('input', UI.debounce((e) => {
    state.search = e.target.value;
    state.page = 1;
    load();
  }, 350));
  document.getElementById('lowStockOnly').addEventListener('change', (e) => {
    state.lowStockOnly = e.target.checked;
    state.page = 1;
    load();
  });

  load();
  WSocket.on('sparepart:updated', load);
  WSocket.on('inventory:updated', load);
})();
