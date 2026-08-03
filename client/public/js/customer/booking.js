(function () {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('bf_date').min = today;

  async function loadVehicles() {
    const select = document.getElementById('bf_vehicle');
    try {
      const vehicles = await api.get('/vehicles/mine');
      if (!vehicles.length) {
        select.innerHTML = '<option value="">No vehicles registered</option>';
        Toast.warning('Register a vehicle first before booking a service.');
        return;
      }
      select.innerHTML = vehicles.map((v) => `<option value="${v.id}">${UI.escapeHtml(v.brand)} ${UI.escapeHtml(v.model)} · ${UI.escapeHtml(v.license_plate)}</option>`).join('');
    } catch (err) {
      Toast.error(err.message || 'Failed to load vehicles.');
    }
  }

  async function loadBookings() {
    const tbody = document.getElementById('bookingsBody');
    tbody.innerHTML = `<tr><td colspan="4"><div class="skeleton skeleton-row"></div></td></tr>`.repeat(3);
    try {
      const bookings = await api.get('/bookings/mine');
      if (!bookings.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-faint" style="padding:24px;">No bookings yet. Submit your first request!</td></tr>`;
        return;
      }
      tbody.innerHTML = bookings.map((b) => `
        <tr>
          <td>${UI.escapeHtml(b.brand)} ${UI.escapeHtml(b.model)}<div class="cell-sub">${UI.escapeHtml(b.license_plate)}</div></td>
          <td>${UI.escapeHtml(b.service_type)}</td>
          <td>${UI.formatDate(b.requested_date)} <div class="cell-sub">${UI.formatTime(b.requested_time)}</div></td>
          <td><span class="badge ${UI.statusBadgeClass(b.status)}">${b.status}</span></td>
        </tr>
      `).join('');
    } catch (err) {
      Toast.error(err.message || 'Failed to load bookings.');
    }
  }

  document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('bf_submit');
    const vehicleId = document.getElementById('bf_vehicle').value;
    if (!vehicleId) return Toast.error('Please select a vehicle.');

    btn.disabled = true;
    btn.textContent = 'Submitting…';
    try {
      await api.post('/bookings', {
        vehicleId,
        serviceType: document.getElementById('bf_type').value,
        requestedDate: document.getElementById('bf_date').value,
        requestedTime: document.getElementById('bf_time').value,
        notes: document.getElementById('bf_notes').value.trim(),
      });
      Toast.success('Booking submitted! We will confirm it shortly.');
      document.getElementById('bookingForm').reset();
      loadBookings();
    } catch (err) {
      Toast.error(err.message || 'Failed to submit booking.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit booking request';
    }
  });

  loadVehicles();
  loadBookings();
  WSocket.on('booking:updated', loadBookings);
})();
