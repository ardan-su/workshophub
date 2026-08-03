(function () {
  async function load() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = `<tr><td colspan="6"><div class="skeleton skeleton-row"></div></td></tr>`.repeat(4);
    try {
      const list = await api.get('/transactions/mine');
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 7h13M17 7l-3-3M17 7l-3 3M20 17H7M7 17l3 3M7 17l3-3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h4>No transactions yet</h4><p>Invoices will appear here once a service is completed and billed.</p></div></td></tr>`;
        return;
      }
      tbody.innerHTML = list.map((t) => `
        <tr>
          <td class="cell-primary">${UI.escapeHtml(t.invoice_number)}</td>
          <td>${UI.escapeHtml(t.service_type)}</td>
          <td>${UI.formatCurrency(t.amount)}</td>
          <td style="text-transform:capitalize;">${UI.escapeHtml(t.payment_method)}</td>
          <td><span class="badge ${UI.statusBadgeClass(t.status)}">${t.status}</span></td>
          <td>${UI.formatDate(t.created_at)}</td>
        </tr>
      `).join('');
    } catch (err) {
      Toast.error(err.message || 'Failed to load transactions.');
    }
  }

  load();
  WSocket.on('transaction:created', load);
  WSocket.on('transaction:updated', load);
})();
