(function () {
  async function load() {
    try {
      const me = await api.get('/auth/me');
      document.getElementById('p_name').value = me.fullName || '';
      document.getElementById('p_username').value = me.username || '';
      document.getElementById('p_email').value = me.email || '';
      document.getElementById('p_phone').value = me.phone || '';

      const avatarEl = document.getElementById('profileAvatar');
      avatarEl.innerHTML = me.avatarUrl ? `<img src="${me.avatarUrl}" />` : Session.initials(me.fullName || me.username);
    } catch (err) {
      Toast.error(err.message || 'Failed to load profile.');
    }
  }

  document.getElementById('avatarInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const updated = await api.put('/auth/profile', fd, { isForm: true });
      const user = Session.getUser();
      user.avatarUrl = updated.avatarUrl;
      Session.setSession(Session.getToken(), user);
      Toast.success('Profile photo updated.');
      load();
    } catch (err) {
      Toast.error(err.message || 'Failed to upload photo.');
    }
  });

  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('fullName', document.getElementById('p_name').value.trim());
      fd.append('phone', document.getElementById('p_phone').value.trim());
      const updated = await api.put('/auth/profile', fd, { isForm: true });

      const user = Session.getUser();
      user.fullName = updated.fullName;
      user.phone = updated.phone;
      Session.setSession(Session.getToken(), user);

      Toast.success('Profile updated.');
      location.reload();
    } catch (err) {
      Toast.error(err.message || 'Failed to update profile.');
    }
  });

  document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.put('/auth/change-password', {
        currentPassword: document.getElementById('pw_current').value,
        newPassword: document.getElementById('pw_new').value,
      });
      Toast.success('Password updated.');
      document.getElementById('passwordForm').reset();
    } catch (err) {
      Toast.error(err.message || 'Failed to update password.');
    }
  });

  load();
})();
