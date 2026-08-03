(function () {
  let state = { page: 1, limit: 10, search: '', status: '' };

  async function load() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = `<tr><td colspan="6"><div class="skeleton skeleton-row"></div></td></tr>`.repeat(5);
    try {
      const res = await api.get('/bookings', { page: state.page, limit: state.limit, search: state.search, status: state.status });
      renderTable(res.items);
      UI.pagination(document.getElementById('paginationBar'), res, (p) => { state.page = p; load(); });
    } catch (err) {
      Toast.error(err.message || 'Failed to load bookings.');
    }
  }

  function renderTable(items) {
    const tbody = document.getElementById('tableBody');
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">${bookingIcon()}</div><h4>No bookings found</h4><p>New booking requests from customers will show up here.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = items.map((b) => `
      <tr>
        <td>
          <div class="cell-primary">${UI.escapeHtml(b.customer_name)}</div>
          <div class="cell-sub">${UI.escapeHtml(b.customer_phone || '')}</div>
        </td>
        <td>${UI.escapeHtml(b.brand)} ${UI.escapeHtml(b.model)} <div class="cell-sub">${UI.escapeHtml(b.license_plate)}</div></td>
        <td>${UI.escapeHtml(b.service_type)}</td>
        <td>${UI.formatDate(b.requested_date)} <div class="cell-sub">${UI.formatTime(b.requested_time)}</div></td>
        <td><span class="badge ${UI.statusBadgeClass(b.status)}">${b.status}</span></td>
        <td>
          <div class="table-actions">
            ${b.status === 'pending' ? `
              <button class="btn btn-sm btn-accent" data-accept="${b.id}">Accept</button>
              <button class="btn btn-sm btn-danger" data-reject="${b.id}">Reject</button>
            ` : ''}
            <button class="btn btn-sm btn-outline" data-reschedule="${b.id}" data-date="${b.requested_date}" data-time="${b.requested_time}">Reschedule</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-accept]').forEach((b) => b.addEventListener('click', () => accept(b.dataset.accept)));
    tbody.querySelectorAll('[data-reject]').forEach((b) => b.addEventListener('click', () => reject(b.dataset.reject)));
    tbody.querySelectorAll('[data-reschedule]').forEach((b) => b.addEventListener('click', () => reschedule(b.dataset.reschedule, b.dataset.date, b.dataset.time)));
  }

  function bookingIcon() {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 9.5h17" stroke="currentColor" stroke-width="1.7"/></svg>';
  }

  async function accept(id) {
    const confirmed = await Modal.confirm({ title: 'Accept booking?', message: 'This will add the vehicle to the live service queue.', confirmText: 'Accept' });
    if (!confirmed) return;
    try {
      await api.patch(`/bookings/${id}/accept`);
      Toast.success('Booking accepted and added to the queue.');
      load();
    } catch (err) {
      Toast.error(err.message || 'Failed to accept booking.');
    }
  }

  async function reject(id) {
    const confirmed = await Modal.confirm({ title: 'Reject booking?', message: 'The customer will be notified that this request was declined.', confirmText: 'Reject', danger: true });
    if (!confirmed) return;
    try {
      await api.patch(`/bookings/${id}/reject`);
      Toast.success('Booking rejected.');
      load();
    } catch (err) {
      Toast.error(err.message || 'Failed to reject booking.');
    }
  }

  function reschedule(id, currentDate, currentTime) {
    const { close } = Modal.open({
      title: 'Reschedule booking',
      bodyHTML: `
        <div class="form-grid">
          <div class="field"><label>New date</label><input class="input" type="date" id="rs_date" value="${currentDate}" /></div>
          <div class="field"><label>New time</label><input class="input" type="time" id="rs_time" value="${currentTime}" /></div>
        </div>
      `,
      footerHTML: `<button class="btn btn-outline" id="rs_cancel">Cancel</button><button class="btn btn-primary" id="rs_save">Save</button>`,
    });
    document.getElementById('rs_cancel').addEventListener('click', close);
    document.getElementById('rs_save').addEventListener('click', async () => {
      try {
        await api.patch(`/bookings/${id}/reschedule`, {
          requestedDate: document.getElementById('rs_date').value,
          requestedTime: document.getElementById('rs_time').value,
        });
        Toast.success('Booking rescheduled.');
        close();
        load();
      } catch (err) {
        Toast.error(err.message || 'Failed to reschedule.');
      }
    });
  }

  document.querySelectorAll('#statusTabs .tab-btn').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#statusTabs .tab-btn').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      state.status = tab.dataset.status;
      state.page = 1;
      load();
    });
  });

  document.getElementById('searchInput').addEventListener('input', UI.debounce((e) => {
    state.search = e.target.value;
    state.page = 1;
    load();
  }, 350));

  load();
  WSocket.on('booking:created', load);
  WSocket.on('booking:updated', load);
})();
