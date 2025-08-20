/**
 * PlanWise Lite - UI Module
 * Handles loaders, toasts, modals and UI interactions
 */

class UIService {
  constructor() {
    this.init();
  }

  init() {
    this.createToastContainer();
    this.createLoader();
  }

  createToastContainer() {
    if (!document.getElementById('toast-container')) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
  }

  createLoader() {
    if (!document.getElementById('global-loader')) {
      const loader = document.createElement('div');
      loader.id = 'global-loader';
      loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      `;
      loader.innerHTML = `
        <div style="text-align: center;">
          <div class="loader" style="width: 40px; height: 40px; margin: 0 auto 1rem;"></div>
          <div id="loader-text">Laden...</div>
        </div>
      `;
      document.body.appendChild(loader);
    }
  }

  showLoader(message = 'Laden...') {
    const loader = document.getElementById('global-loader');
    const loaderText = document.getElementById('loader-text');
    
    if (loader && loaderText) {
      loaderText.textContent = message;
      loader.style.display = 'flex';
    }
  }

  hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.style.display = 'none';
    }
  }

  showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
      background: white;
      border: 1px solid var(--gray-200);
      border-left: 4px solid ${this.getToastColor(type)};
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-lg);
      padding: 1rem;
      margin-bottom: 0.5rem;
      max-width: 400px;
      pointer-events: auto;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    toast.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>${message}</div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          color: var(--gray-400);
          margin-left: 0.5rem;
        ">&times;</button>
      </div>
    `;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 10);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) {
          toast.style.transform = 'translateX(100%)';
          setTimeout(() => {
            if (toast.parentElement) {
              toast.remove();
            }
          }, 300);
        }
      }, duration);
    }
  }

  getToastColor(type) {
    switch (type) {
      case 'success': return 'var(--success)';
      case 'error': return 'var(--danger)';
      case 'warning': return 'var(--warning)';
      default: return 'var(--primary)';
    }
  }

  success(message, duration = 5000) {
    this.showToast(message, 'success', duration);
  }

  error(message, duration = 8000) {
    this.showToast(message, 'error', duration);
  }

  warning(message, duration = 6000) {
    this.showToast(message, 'warning', duration);
  }

  info(message, duration = 5000) {
    this.showToast(message, 'info', duration);
  }

  showModal(title, content, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
      background: white;
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-lg);
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      padding: 1.5rem 1.5rem 0;
      border-bottom: 1px solid var(--gray-200);
      margin-bottom: 1rem;
    `;
    header.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; color: var(--gray-900);">${title}</h3>
        <button onclick="this.closest('.modal').remove()" style="
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--gray-400);
        ">&times;</button>
      </div>
    `;

    const body = document.createElement('div');
    body.style.cssText = 'padding: 0 1.5rem 1.5rem;';
    body.innerHTML = content;

    modalContent.appendChild(header);
    modalContent.appendChild(body);

    // Add buttons if provided
    if (options.buttons) {
      const footer = document.createElement('div');
      footer.style.cssText = `
        padding: 1rem 1.5rem 1.5rem;
        border-top: 1px solid var(--gray-200);
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      `;

      options.buttons.forEach(button => {
        const btn = document.createElement('button');
        btn.className = `btn ${button.class || 'btn-secondary'}`;
        btn.textContent = button.text;
        btn.onclick = () => {
          if (button.onClick) button.onClick();
          if (button.close !== false) modal.remove();
        };
        footer.appendChild(btn);
      });

      modalContent.appendChild(footer);
    }

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    return modal;
  }

  confirm(message, onConfirm, onCancel) {
    return this.showModal('Bevestiging', `
      <p>${message}</p>
    `, {
      buttons: [
        {
          text: 'Annuleren',
          class: 'btn-secondary',
          onClick: onCancel
        },
        {
          text: 'Bevestigen',
          class: 'btn-primary',
          onClick: onConfirm
        }
      ]
    });
  }

  prompt(message, defaultValue = '', onConfirm, onCancel) {
    const inputId = 'prompt-input-' + Date.now();
    
    return this.showModal('Invoer', `
      <p>${message}</p>
      <input type="text" id="${inputId}" class="form-input" value="${defaultValue}" placeholder="Voer tekst in...">
    `, {
      buttons: [
        {
          text: 'Annuleren',
          class: 'btn-secondary',
          onClick: onCancel
        },
        {
          text: 'OK',
          class: 'btn-primary',
          onClick: () => {
            const input = document.getElementById(inputId);
            if (onConfirm) onConfirm(input.value);
          }
        }
      ]
    });
  }

  updateNavigation(activeRoute) {
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });

    // Add active class to current route
    const activeLink = document.querySelector(`[href="#${activeRoute}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }

  showRoleBasedElements(role) {
    // Hide all role-based elements first
    document.querySelectorAll('[data-role]').forEach(el => {
      el.style.display = 'none';
    });

    // Show elements for current role
    document.querySelectorAll(`[data-role="${role}"]`).forEach(el => {
      el.style.display = '';
    });

    // Show elements for roles with higher permissions
    const roleHierarchy = {
      'viewer': 0,
      'technician': 1,
      'planner': 2,
      'admin': 3,
      'superadmin': 4
    };

    const currentLevel = roleHierarchy[role] || 0;
    
    Object.entries(roleHierarchy).forEach(([roleName, level]) => {
      if (level <= currentLevel) {
        document.querySelectorAll(`[data-role="${roleName}"]`).forEach(el => {
          el.style.display = '';
        });
      }
    });
  }
}

// Create global instance
window.ui = new UIService();
