(function () {
  let state = { page: 1, limit: 15 };

  async function load() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = `<tr><td colspan="6"><div class="skeleton skeleton-row"></div></td></tr>`.repeat(8);
    try {
      const res = await api.get('/inventory/history', { page: state.page, limit: state.limit });
      renderTable(res.items);
      UI.pagination(document.getElementById('paginationBar'), res, (p) => { state.page = p; load(); });
    } catch (err) {
      Toast.error(err.message || 'Failed to load inventory history.');
    }
  }

  function renderTable(items) {
    const tbody = document.getElementById('tableBody');
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="7" width="17" height="13" rx="2" stroke="currentColor" stroke-width="1.7"/></svg></div><h4>No stock movements yet</h4><p>Stock-ins, stock-outs and automatic reductions will appear here.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = items.map((i) => `
      <tr>
        <td>${UI.formatDateTime(i.created_at)}</td>
        <td class="cell-primary">${UI.escapeHtml(i.part_name)} <div class="cell-sub">${UI.escapeHtml(i.sku)}</div></td>
        <td><span class="badge ${i.type === 'in' ? 'badge-success' : 'badge-warning'}">${i.type === 'in' ? 'Stock In' : 'Stock Out'}</span></td>
        <td>${i.type === 'in' ? '+' : '-'}${i.quantity}</td>
        <td>${UI.escapeHtml(i.reference || '—')}</td>
        <td>${UI.escapeHtml(i.created_by_name || 'System')}</td>
      </tr>
    `).join('');
  }

  async function loadPartOptions(selectEl) {
    const parts = await api.get('/spare-parts/simple');
    selectEl.innerHTML = parts.map((p) => `<option value="${p.id}">${UI.escapeHtml(p.name)} (${p.quantity} in stock)</option>`).join('');
  }

  function movementForm(title, label) {
    const { close } = Modal.open({
      title,
      bodyHTML: `
        <form id="moveForm" class="flex flex-col gap-4">
          <div class="field"><label>Spare part</label><select class="select" id="mv_part"></select></div>
          <div class="field"><label>Quantity</label><input class="input" type="number" id="mv_qty" min="1" value="1" required /></div>
          <div class="field"><label>Reference / note</label><input class="input" id="mv_ref" placeholder="e.g. Supplier delivery #204" /></div>
        </form>
      `,
      footerHTML: `<button class="btn btn-outline" id="mv_cancel">Cancel</button><button class="btn btn-primary" id="mv_save">${label}</button>`,
    });
    loadPartOptions(document.getElementById('mv_part'));
    document.getElementById('mv_cancel').addEventListener('click', close);
    return close;
  }

  document.getElementById('stockInBtn').addEventListener('click', () => {
    const close = movementForm('Stock in', 'Add stock');
    document.getElementById('mv_save').addEventListener('click', async () => {
      try {
        await api.post('/inventory/stock-in', {
          sparePartId: document.getElementById('mv_part').value,
          quantity: document.getElementById('mv_qty').value,
          reference: document.getElementById('mv_ref').value.trim(),
        });
        Toast.success('Stock added.');
        close();
        load();
      } catch (err) {
        Toast.error(err.message || 'Failed to add stock.');
      }
    });
  });

  document.getElementById('stockOutBtn').addEventListener('click', () => {
    const close = movementForm('Stock out', 'Remove stock');
    document.getElementById('mv_save').addEventListener('click', async () => {
      try {
        await api.post('/inventory/stock-out', {
          sparePartId: document.getElementById('mv_part').value,
          quantity: document.getElementById('mv_qty').value,
          reference: document.getElementById('mv_ref').value.trim(),
        });
        Toast.success('Stock removed.');
        close();
        load();
      } catch (err) {
        Toast.error(err.message || 'Failed to remove stock.');
      }
    });
  });

  load();
  WSocket.on('inventory:updated', load);
})();
