/**
 * Generic modal + confirmation dialog helper.
 * Modal.open({ title, bodyHTML, footerHTML, size }) -> { el, close }
 * Modal.confirm({ title, message, confirmText, danger }) -> Promise<boolean>
 */
const Modal = (() => {
  function open({ title, bodyHTML, footerHTML = '', size = '' }) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box ${size === 'lg' ? 'modal-lg' : ''}">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="icon-btn modal-close" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    function close() {
      overlay.remove();
      document.body.style.overflow = '';
    }

    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    return { el: overlay, close };
  }

  function confirm({ title = 'Are you sure?', message = '', confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
    return new Promise((resolve) => {
      const { close } = open({
        title,
        bodyHTML: `<p class="text-muted">${message}</p>`,
        footerHTML: `
          <button class="btn btn-outline" data-act="cancel">${cancelText}</button>
          <button class="btn ${danger ? 'btn-danger-solid' : 'btn-primary'}" data-act="confirm">${confirmText}</button>
        `,
      });
      const overlay = document.querySelector('.modal-overlay:last-of-type');
      overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => {
        close();
        resolve(false);
      });
      overlay.querySelector('[data-act="confirm"]').addEventListener('click', () => {
        close();
        resolve(true);
      });
    });
  }

  return { open, confirm };
})();
