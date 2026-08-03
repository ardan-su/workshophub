(function () {
  let state = { page: 1, limit: 10, search: '', status: '' };
  let STATUSES = [];
  let MECHANICS = [];

  async function bootstrap() {
    try {
      STATUSES = await api.get('/services/statuses');
      renderTabs();
    } catch (e) { /* ignore */ }
    load();
  }

  function renderTabs() {
    const wrap = document.getElementById('statusTabs');
    wrap.innerHTML = `<button class="tab-btn active" data-status="">All</button>` +
      STATUSES.map((s) => `<button class="tab-btn" data-status="${s.code}">${s.label}</button>`).join('');
    wrap.querySelectorAll('.tab-btn').forEach((tab) => {
      tab.addEventListener('click', () => {
        wrap.querySelectorAll('.tab-btn').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        state.status = tab.dataset.status;
        state.page = 1;
        load();
      });
    });
  }

  async function load() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = `<tr><td colspan="7"><div class="skeleton skeleton-row"></div></td></tr>`.repeat(6);
    try {
      const res = await api.get('/services', { page: state.page, limit: state.limit, search: state.search, status: state.status });
      renderTable(res.items);
      UI.pagination(document.getElementById('paginationBar'), res, (p) => { state.page = p; load(); });
    } catch (err) {
      Toast.error(err.message || 'Failed to load services.');
    }
  }

  function renderTable(items) {
    const tbody = document.getElementById('tableBody');
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/></svg></div><h4>No services found</h4><p>Accept a booking or create a walk-in service to fill the queue.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = items.map((s) => `
      <tr>
        <td class="text-faint">#${s.id}</td>
        <td>
          <div class="cell-primary">${UI.escapeHtml(s.brand)} ${UI.escapeHtml(s.model)}</div>
          <div class="cell-sub">${UI.escapeHtml(s.customer_name)} · ${UI.escapeHtml(s.license_plate)}</div>
        </td>
        <td>${UI.escapeHtml(s.service_type)}</td>
        <td>${s.mechanic_name ? UI.escapeHtml(s.mechanic_name) : '<span class="text-faint">Unassigned</span>'}</td>
        <td><span class="badge ${UI.statusBadgeClass(s.status_code)}">${UI.escapeHtml(s.status_label)}</span></td>
        <td>${s.queue_position ? `#${s.queue_position}` : '—'}</td>
        <td><button class="btn btn-sm btn-outline" data-open="${s.id}">Manage</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => openService(b.dataset.open)));
  }

  async function ensureMechanics() {
    if (MECHANICS.length) return MECHANICS;
    MECHANICS = await api.get('/mechanics/active');
    return MECHANICS;
  }

  async function openService(id) {
    try {
      const [service, mechanics] = await Promise.all([api.get(`/services/${id}`), ensureMechanics()]);
      renderServiceModal(service, mechanics);
    } catch (err) {
      Toast.error(err.message || 'Failed to load service.');
    }
  }

  function pipelineHTML(service) {
    return `
      <div class="pipeline" style="margin-bottom:20px;">
        ${STATUSES.map((s) => {
          const cls = s.sort_order < service.status_sort ? 'done' : s.sort_order === service.status_sort ? 'current' : '';
          return `<div class="pipeline-step ${cls}">${s.label}</div>`;
        }).join('')}
      </div>
    `;
  }

  function renderServiceModal(service, mechanics) {
    const nextStatuses = STATUSES;
    const { close } = Modal.open({
      title: `${service.brand} ${service.model} · #${service.id}`,
      size: 'lg',
      bodyHTML: `
        ${pipelineHTML(service)}
        <div class="tabs" id="svcTabs" style="margin-bottom:16px;">
          <button class="tab-btn active" data-tab="details">Details</button>
          <button class="tab-btn" data-tab="parts">Spare Parts</button>
          <button class="tab-btn" data-tab="invoice">Invoice</button>
        </div>

        <div id="tab-details">
          <div class="form-grid" style="margin-bottom:16px;">
            <div class="field">
              <label>Status</label>
              <select class="select" id="svc_status">
                ${nextStatuses.map((s) => `<option value="${s.code}" ${s.code === service.status_code ? 'selected' : ''}>${s.label}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label>Mechanic</label>
              <select class="select" id="svc_mechanic">
                <option value="">Unassigned</option>
                ${mechanics.map((m) => `<option value="${m.id}" ${service.mechanic_id === m.id ? 'selected' : ''}>${UI.escapeHtml(m.full_name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-grid" style="margin-bottom:16px;">
            <div class="field"><label>Estimated cost</label><input class="input" type="number" id="svc_estcost" value="${service.estimated_cost || 0}" /></div>
            <div class="field"><label>Final cost</label><input class="input" type="number" id="svc_finalcost" value="${service.final_cost || ''}" /></div>
          </div>
          <div class="field" style="margin-bottom:16px;">
            <label>Repair notes</label>
            <textarea class="textarea" id="svc_notes" placeholder="Progress notes visible to the customer…">${UI.escapeHtml(service.repair_notes || '')}</textarea>
          </div>
          <div class="flex justify-end">
            <button class="btn btn-primary" id="svc_saveDetails">Save changes</button>
          </div>
        </div>

        <div id="tab-parts" class="hidden">
          <div id="partsList" style="margin-bottom:16px;"></div>
          <div class="flex gap-2" style="align-items:flex-end;">
            <div class="field" style="flex:2;">
              <label>Spare part</label>
              <select class="select" id="svc_partSelect"></select>
            </div>
            <div class="field" style="flex:1;">
              <label>Qty</label>
              <input class="input" type="number" id="svc_partQty" value="1" min="1" />
            </div>
            <button class="btn btn-outline" id="svc_addPart">Add</button>
          </div>
        </div>

        <div id="tab-invoice" class="hidden">
          <p class="text-sm text-muted" style="margin-bottom:12px;">Create an invoice once the service is complete to record payment and revenue.</p>
          <div class="form-grid" style="margin-bottom:16px;">
            <div class="field"><label>Amount</label><input class="input" type="number" id="inv_amount" value="${service.final_cost || service.estimated_cost || 0}" /></div>
            <div class="field">
              <label>Payment method</label>
              <select class="select" id="inv_method">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="transfer">Bank Transfer</option>
                <option value="e-wallet">E-Wallet</option>
              </select>
            </div>
          </div>
          <button class="btn btn-primary" id="svc_createInvoice">Create invoice</button>
        </div>
      `,
    });

    // Tabs
    document.querySelectorAll('#svcTabs .tab-btn').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#svcTabs .tab-btn').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        ['details', 'parts', 'invoice'].forEach((t) => {
          document.getElementById(`tab-${t}`).classList.toggle('hidden', t !== tab.dataset.tab);
        });
        if (tab.dataset.tab === 'parts') loadParts(service.id);
      });
    });

    document.getElementById('svc_saveDetails').addEventListener('click', async () => {
      try {
        const newStatus = document.getElementById('svc_status').value;
        const mechanicId = document.getElementById('svc_mechanic').value;

        if (newStatus !== service.status_code) {
          await api.patch(`/services/${service.id}/status`, { status: newStatus });
        }
        if (mechanicId && Number(mechanicId) !== service.mechanic_id) {
          await api.patch(`/services/${service.id}/assign-mechanic`, { mechanicId });
        }
        await api.put(`/services/${service.id}/details`, {
          estimatedCost: document.getElementById('svc_estcost').value,
          finalCost: document.getElementById('svc_finalcost').value || undefined,
          repairNotes: document.getElementById('svc_notes').value,
        });

        Toast.success('Service updated.');
        close();
        load();
      } catch (err) {
        Toast.error(err.message || 'Failed to update service.');
      }
    });

    document.getElementById('svc_createInvoice').addEventListener('click', async () => {
      try {
        const amount = document.getElementById('inv_amount').value;
        const paymentMethod = document.getElementById('inv_method').value;
        const tx = await api.post('/transactions', { serviceId: service.id, amount, paymentMethod });
        const paid = await Modal.confirm({ title: `Invoice ${tx.invoice_number} created`, message: 'Mark this invoice as paid now?', confirmText: 'Mark as paid' });
        if (paid) await api.patch(`/transactions/${tx.id}/pay`);
        Toast.success('Invoice created.');
        close();
        load();
      } catch (err) {
        Toast.error(err.message || 'Failed to create invoice.');
      }
    });

    loadPartOptions();
  }

  async function loadPartOptions() {
    try {
      const parts = await api.get('/spare-parts/simple');
      const select = document.getElementById('svc_partSelect');
      select.innerHTML = parts.map((p) => `<option value="${p.id}">${UI.escapeHtml(p.name)} (${p.quantity} in stock · ${UI.formatCurrency(p.unit_price)})</option>`).join('');
    } catch (e) { /* ignore */ }
  }

  async function loadParts(serviceId) {
    const list = document.getElementById('partsList');
    list.innerHTML = `<div class="skeleton skeleton-row"></div>`;
    try {
      const service = await api.get(`/services/${serviceId}`);
      const used = service.partsUsed || [];
      list.innerHTML = used.length
        ? used.map((p) => `
          <div class="flex justify-between text-sm" style="padding:8px 0; border-bottom:1px solid var(--color-border);">
            <span>${UI.escapeHtml(p.part_name)} <span class="text-faint">×${p.quantity}</span></span>
            <span>${UI.formatCurrency(p.unit_price * p.quantity)}</span>
          </div>
        `).join('')
        : '<p class="text-sm text-faint">No spare parts used yet.</p>';

      document.getElementById('svc_addPart').onclick = async () => {
        const sparePartId = document.getElementById('svc_partSelect').value;
        const quantity = document.getElementById('svc_partQty').value;
        if (!sparePartId) return Toast.error('Select a spare part.');
        try {
          await api.post(`/services/${serviceId}/parts`, { sparePartId, quantity });
          Toast.success('Spare part added — stock reduced automatically.');
          loadParts(serviceId);
          loadPartOptions();
        } catch (err) {
          Toast.error(err.message || 'Failed to add spare part.');
        }
      };
    } catch (err) {
      list.innerHTML = '<p class="text-sm text-danger">Failed to load parts.</p>';
    }
  }

  // ---- New walk-in service ----
  document.getElementById('addServiceBtn').addEventListener('click', () => {
    const { close } = Modal.open({
      title: 'New walk-in service',
      size: 'lg',
      bodyHTML: `
        <form id="newSvcForm" class="flex flex-col gap-4">
          <div class="field">
            <label>Customer</label>
            <div style="position:relative;">
              <input class="input" id="ns_customerSearch" placeholder="Search customer…" autocomplete="off" />
              <input type="hidden" id="ns_customerId" />
              <div id="ns_customerResults" class="card" style="position:absolute; top:44px; left:0; right:0; z-index:20; max-height:200px; overflow-y:auto; display:none;"></div>
            </div>
          </div>
          <div class="field">
            <label>Vehicle</label>
            <select class="select" id="ns_vehicle" disabled><option>Select a customer first</option></select>
          </div>
          <div class="field"><label>Service type</label><input class="input" id="ns_type" placeholder="e.g. Oil change, brake service…" required /></div>
          <div class="field"><label>Estimated cost <span class="text-faint">(optional)</span></label><input class="input" type="number" id="ns_cost" value="0" /></div>
        </form>
      `,
      footerHTML: `<button class="btn btn-outline" id="ns_cancel">Cancel</button><button class="btn btn-primary" id="ns_save">Create service</button>`,
    });

    const search = UI.debounce(async (q) => {
      const results = document.getElementById('ns_customerResults');
      if (!q.trim()) { results.style.display = 'none'; return; }
      try {
        const res = await api.get('/customers', { search: q, limit: 6 });
        results.innerHTML = res.items.length
          ? res.items.map((c) => `<div class="dropdown-item" data-pick="${c.id}" data-label="${UI.escapeHtml(c.full_name)}">${UI.escapeHtml(c.full_name)} <span class="text-faint" style="margin-left:6px;">${UI.escapeHtml(c.email)}</span></div>`).join('')
          : `<div class="text-sm text-faint" style="padding:10px;">No matches</div>`;
        results.style.display = 'block';
      } catch (e) { /* ignore */ }
    }, 300);

    document.getElementById('ns_customerSearch').addEventListener('input', (e) => search(e.target.value));
    document.getElementById('ns_customerResults').addEventListener('click', async (e) => {
      const item = e.target.closest('[data-pick]');
      if (!item) return;
      document.getElementById('ns_customerId').value = item.dataset.pick;
      document.getElementById('ns_customerSearch').value = item.dataset.label;
      document.getElementById('ns_customerResults').style.display = 'none';

      const vehicleSelect = document.getElementById('ns_vehicle');
      vehicleSelect.disabled = true;
      vehicleSelect.innerHTML = '<option>Loading vehicles…</option>';
      try {
        const customer = await api.get(`/customers/${item.dataset.pick}`);
        if (!customer.vehicles.length) {
          vehicleSelect.innerHTML = '<option value="">No vehicles registered</option>';
        } else {
          vehicleSelect.innerHTML = customer.vehicles.map((v) => `<option value="${v.id}">${UI.escapeHtml(v.brand)} ${UI.escapeHtml(v.model)} · ${UI.escapeHtml(v.license_plate)}</option>`).join('');
          vehicleSelect.disabled = false;
        }
      } catch (err) {
        vehicleSelect.innerHTML = '<option value="">Failed to load vehicles</option>';
      }
    });

    document.getElementById('ns_cancel').addEventListener('click', close);
    document.getElementById('ns_save').addEventListener('click', async () => {
      const customerId = document.getElementById('ns_customerId').value;
      const vehicleId = document.getElementById('ns_vehicle').value;
      const serviceType = document.getElementById('ns_type').value.trim();
      if (!customerId || !vehicleId) return Toast.error('Please select a customer and vehicle.');
      if (!serviceType) return Toast.error('Service type is required.');
      try {
        await api.post('/services', { customerId, vehicleId, serviceType, estimatedCost: document.getElementById('ns_cost').value });
        Toast.success('Service created and added to the queue.');
        close();
        load();
      } catch (err) {
        Toast.error(err.message || 'Failed to create service.');
      }
    });
  });

  document.getElementById('searchInput').addEventListener('input', UI.debounce((e) => {
    state.search = e.target.value;
    state.page = 1;
    load();
  }, 350));

  bootstrap();
  ['service:created', 'service:updated', 'booking:updated'].forEach((evt) => WSocket.on(evt, load));
})();
