/**
 * PlanWise Lite - Main Application Module
 * Initializes the application and handles the main lifecycle
 */

class PlanWiseApp {
  constructor() {
    this.initialized = false;
    this.initRunning = false;
  }

  /**
   * Bootstrap the application
   */
  async bootstrap() {
    if (this.initRunning) {
      window.logService?.warning('App initialization already running');
      return;
    }

    this.initRunning = true;
    
    try {
      window.logService?.info('Starting PlanWise Lite bootstrap');
      window.ui?.showLoader('PlanWise Lite wordt geladen...');

      // Step 1: Ensure seed exists (idempotent)
      window.logService?.info('Step 1: Ensuring seed data');
      window.dataService?.ensureSeed();

      // Step 2: Check authentication
      window.logService?.info('Step 2: Checking authentication');
      const auth = window.authService?.getCurrentAuth();

      if (auth) {
        window.logService?.info('User is authenticated', { orgSlug: auth.orgSlug, username: auth.username });
        await this.initAppFor(auth);
      } else {
        window.logService?.info('No authentication found, showing login');
        this.showLogin();
      }

      this.initialized = true;
      window.logService?.info('PlanWise Lite bootstrap completed successfully');

    } catch (error) {
      window.logService?.error('Bootstrap failed', { error: error.message });
      window.ui?.error('Fout bij het laden van de applicatie: ' + error.message);
    } finally {
      this.initRunning = false;
      window.ui?.hideLoader();
    }
  }

  /**
   * Initialize app for authenticated user
   */
  async initAppFor(auth) {
    try {
      window.logService?.info('Initializing app for user', { orgSlug: auth.orgSlug, username: auth.username });

      // Load organization state
      let state = window.dataService.loadOrgState(auth.orgSlug);
      
      if (!state) {
        window.logService?.info('No state found for organization, creating default');
        state = window.dataService.getDefaultState();
        window.dataService.saveOrgState(auth.orgSlug, state);
      }

      // Set global state
      window.state = state;

      // Update UI for role
      this.updateUIForRole(auth.role);

      // Navigate to dashboard
      window.router?.go('dashboard');

      window.logService?.info('App initialized successfully for user', { orgSlug: auth.orgSlug, username: auth.username });

    } catch (error) {
      window.logService?.error('Failed to initialize app for user', { error: error.message });
      throw error;
    }
  }

  /**
   * Update UI based on user role
   */
  updateUIForRole(role) {
    try {
      // Show/hide navigation elements based on role
      const navElements = document.querySelectorAll('[data-role]');
      
      navElements.forEach(element => {
        const requiredRole = element.getAttribute('data-role');
        const hasPermission = window.authService?.hasRole(requiredRole) || false;
        
        if (hasPermission) {
          element.style.display = '';
        } else {
          element.style.display = 'none';
        }
      });

      // Update role indicator
      const roleIndicator = document.getElementById('role-indicator');
      if (roleIndicator) {
        roleIndicator.textContent = role;
        roleIndicator.className = `role-badge role-${role}`;
      }

      window.logService?.info('UI updated for role', { role });

    } catch (error) {
      window.logService?.error('Failed to update UI for role', { role, error: error.message });
    }
  }

  /**
   * Show login page
   */
  showLogin() {
    window.router?.go('login');
  }

  /**
   * Handle login form submission
   */
  async handleLogin(event) {
    event.preventDefault();
    
    try {
      const form = event.target;
      const orgSlug = form.orgSlug.value.trim().toLowerCase();
      const username = form.username.value.trim();
      const password = form.password.value;

      if (!orgSlug || !username || !password) {
        window.ui?.error('Vul alle velden in');
        return;
      }

      window.ui?.showLoader('Inloggen...');

      const result = window.authService?.login(orgSlug, username, password);
      
      if (result.success) {
        window.ui?.success('Succesvol ingelogd');
        await this.initAppFor(result.auth);
      } else {
        window.ui?.error(result.error || 'Inloggen mislukt');
      }

    } catch (error) {
      window.logService?.error('Login error', { error: error.message });
      window.ui?.error('Fout bij inloggen: ' + error.message);
    } finally {
      window.ui?.hideLoader();
    }
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    try {
      window.ui?.confirm('Weet je zeker dat je wilt uitloggen?', () => {
        window.authService?.logout();
        window.ui?.success('Uitgelogd');
        this.showLogin();
      });
    } catch (error) {
      window.logService?.error('Logout error', { error: error.message });
      window.ui?.error('Fout bij uitloggen');
    }
  }

  /**
   * Reset application data
   */
  async handleReset() {
    try {
      window.ui?.confirm(
        'Weet je zeker dat je alle data wilt wissen? Dit kan niet ongedaan worden gemaakt.',
        () => {
          window.dataService?.clearAllData();
          window.authService?.logout();
          window.ui?.success('Alle data gewist');
          this.showLogin();
        }
      );
    } catch (error) {
      window.logService?.error('Reset error', { error: error.message });
      window.ui?.error('Fout bij resetten');
    }
  }

  /**
   * Show add event modal
   */
  showAddEventModal() {
    try {
      const auth = window.authService?.getCurrentAuth();
      if (!auth) return;

      const modal = window.ui?.showModal('Afspraak toevoegen', `
        <form id="add-event-form">
          <div class="form-group">
            <label>Titel</label>
            <input type="text" class="form-input" id="event-title" required>
          </div>
          <div class="form-group">
            <label>Datum</label>
            <input type="date" class="form-input" id="event-date" required>
          </div>
          <div class="form-group">
            <label>Tijd</label>
            <input type="time" class="form-input" id="event-time" required>
          </div>
          <div class="form-group">
            <label>Monteur</label>
            <input type="text" class="form-input" id="event-technician">
          </div>
          <div class="form-group">
            <label>Beschrijving</label>
            <textarea class="form-input" id="event-description" rows="3"></textarea>
          </div>
        </form>
      `, {
        buttons: [
          {
            text: 'Annuleren',
            class: 'btn-secondary'
          },
          {
            text: 'Toevoegen',
            class: 'btn-primary',
            onClick: () => this.addEvent()
          }
        ]
      });
    } catch (error) {
      window.logService?.error('Failed to show add event modal', { error: error.message });
      window.ui?.error('Fout bij openen van modal');
    }
  }

  /**
   * Add new event
   */
  async addEvent() {
    try {
      const auth = window.authService?.getCurrentAuth();
      if (!auth) return;

      const title = document.getElementById('event-title')?.value;
      const date = document.getElementById('event-date')?.value;
      const time = document.getElementById('event-time')?.value;
      const technician = document.getElementById('event-technician')?.value;
      const description = document.getElementById('event-description')?.value;

      if (!title || !date || !time) {
        window.ui?.error('Vul verplichte velden in');
        return;
      }

      const eventData = {
        title,
        date,
        time,
        technician: technician || null,
        description: description || null
      };

      const newEvent = window.dataService?.addEvent(auth.orgSlug, eventData);
      
      if (newEvent) {
        window.ui?.success('Afspraak toegevoegd');
        window.router?.go('planner');
      } else {
        window.ui?.error('Fout bij toevoegen van afspraak');
      }

    } catch (error) {
      window.logService?.error('Failed to add event', { error: error.message });
      window.ui?.error('Fout bij toevoegen van afspraak: ' + error.message);
    }
  }

  /**
   * Edit event
   */
  editEvent(eventId) {
    try {
      const auth = window.authService?.getCurrentAuth();
      if (!auth) return;

      const events = window.dataService?.getEvents(auth.orgSlug);
      const event = events.find(e => e.id === eventId);
      
      if (!event) {
        window.ui?.error('Afspraak niet gevonden');
        return;
      }

      const modal = window.ui?.showModal('Afspraak bewerken', `
        <form id="edit-event-form">
          <div class="form-group">
            <label>Titel</label>
            <input type="text" class="form-input" id="edit-event-title" value="${event.title}" required>
          </div>
          <div class="form-group">
            <label>Datum</label>
            <input type="date" class="form-input" id="edit-event-date" value="${event.date}" required>
          </div>
          <div class="form-group">
            <label>Tijd</label>
            <input type="time" class="form-input" id="edit-event-time" value="${event.time}" required>
          </div>
          <div class="form-group">
            <label>Monteur</label>
            <input type="text" class="form-input" id="edit-event-technician" value="${event.technician || ''}">
          </div>
          <div class="form-group">
            <label>Beschrijving</label>
            <textarea class="form-input" id="edit-event-description" rows="3">${event.description || ''}</textarea>
          </div>
        </form>
      `, {
        buttons: [
          {
            text: 'Annuleren',
            class: 'btn-secondary'
          },
          {
            text: 'Opslaan',
            class: 'btn-primary',
            onClick: () => this.saveEvent(eventId)
          }
        ]
      });
    } catch (error) {
      window.logService?.error('Failed to show edit event modal', { error: error.message });
      window.ui?.error('Fout bij openen van modal');
    }
  }

  /**
   * Save edited event
   */
  async saveEvent(eventId) {
    try {
      const auth = window.authService?.getCurrentAuth();
      if (!auth) return;

      const title = document.getElementById('edit-event-title')?.value;
      const date = document.getElementById('edit-event-date')?.value;
      const time = document.getElementById('edit-event-time')?.value;
      const technician = document.getElementById('edit-event-technician')?.value;
      const description = document.getElementById('edit-event-description')?.value;

      if (!title || !date || !time) {
        window.ui?.error('Vul verplichte velden in');
        return;
      }

      const eventData = {
        title,
        date,
        time,
        technician: technician || null,
        description: description || null
      };

      const updatedEvent = window.dataService?.updateEvent(auth.orgSlug, eventId, eventData);
      
      if (updatedEvent) {
        window.ui?.success('Afspraak bijgewerkt');
        window.router?.go('planner');
      } else {
        window.ui?.error('Fout bij bijwerken van afspraak');
      }

    } catch (error) {
      window.logService?.error('Failed to save event', { error: error.message });
      window.ui?.error('Fout bij bijwerken van afspraak: ' + error.message);
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(eventId) {
    try {
      window.ui?.confirm('Weet je zeker dat je deze afspraak wilt verwijderen?', async () => {
        const auth = window.authService?.getCurrentAuth();
        if (!auth) return;

        const success = window.dataService?.deleteEvent(auth.orgSlug, eventId);
        
        if (success) {
          window.ui?.success('Afspraak verwijderd');
          window.router?.go('planner');
        } else {
          window.ui?.error('Fout bij verwijderen van afspraak');
        }
      });
    } catch (error) {
      window.logService?.error('Failed to delete event', { error: error.message });
      window.ui?.error('Fout bij verwijderen van afspraak: ' + error.message);
    }
  }

  /**
   * Save settings
   */
  async saveSettings(event) {
    event.preventDefault();
    
    try {
      const auth = window.authService?.getCurrentAuth();
      if (!auth) return;

      const startTime = document.getElementById('work-start')?.value;
      const endTime = document.getElementById('work-end')?.value;

      if (!startTime || !endTime) {
        window.ui?.error('Vul alle velden in');
        return;
      }

      const settings = {
        workingHours: {
          start: startTime,
          end: endTime
        }
      };

      const updatedSettings = window.dataService?.updateSettings(auth.orgSlug, settings);
      
      if (updatedSettings) {
        window.ui?.success('Instellingen opgeslagen');
      } else {
        window.ui?.error('Fout bij opslaan van instellingen');
      }

    } catch (error) {
      window.logService?.error('Failed to save settings', { error: error.message });
      window.ui?.error('Fout bij opslaan van instellingen: ' + error.message);
    }
  }

  /**
   * Show add organization modal
   */
  showAddOrgModal() {
    try {
      const modal = window.ui?.showModal('Organisatie toevoegen', `
        <form id="add-org-form">
          <div class="form-group">
            <label>Naam</label>
            <input type="text" class="form-input" id="org-name" required>
          </div>
          <div class="form-group">
            <label>Slug (uniek)</label>
            <input type="text" class="form-input" id="org-slug" required>
            <small>Alleen kleine letters, cijfers en streepjes</small>
          </div>
        </form>
      `, {
        buttons: [
          {
            text: 'Annuleren',
            class: 'btn-secondary'
          },
          {
            text: 'Toevoegen',
            class: 'btn-primary',
            onClick: () => this.addOrganization()
          }
        ]
      });
    } catch (error) {
      window.logService?.error('Failed to show add org modal', { error: error.message });
      window.ui?.error('Fout bij openen van modal');
    }
  }

  /**
   * Add new organization
   */
  async addOrganization() {
    try {
      const name = document.getElementById('org-name')?.value.trim();
      const slug = document.getElementById('org-slug')?.value.trim().toLowerCase();

      if (!name || !slug) {
        window.ui?.error('Vul alle velden in');
        return;
      }

      // Validate slug format
      if (!/^[a-z0-9-]+$/.test(slug)) {
        window.ui?.error('Slug mag alleen kleine letters, cijfers en streepjes bevatten');
        return;
      }

      const success = window.dataService?.createOrganization(name, slug);
      
      if (success) {
        window.ui?.success('Organisatie toegevoegd');
        window.router?.go('superadmin');
      } else {
        window.ui?.error('Fout bij toevoegen van organisatie');
      }

    } catch (error) {
      window.logService?.error('Failed to add organization', { error: error.message });
      window.ui?.error('Fout bij toevoegen van organisatie: ' + error.message);
    }
  }

  /**
   * Switch to organization
   */
  async switchToOrg(orgSlug) {
    try {
      const result = window.authService?.switchTenant(orgSlug);
      
      if (result.success) {
        window.ui?.success('Gewisseld naar organisatie: ' + orgSlug);
        await this.initAppFor(result.auth);
      } else {
        window.ui?.error(result.error || 'Fout bij wisselen van organisatie');
      }

    } catch (error) {
      window.logService?.error('Failed to switch organization', { error: error.message });
      window.ui?.error('Fout bij wisselen van organisatie: ' + error.message);
    }
  }

  /**
   * Clear logs
   */
  clearLogs() {
    try {
      window.ui?.confirm('Weet je zeker dat je alle logs wilt wissen?', () => {
        window.logService?.clearLogs();
        window.ui?.success('Logs gewist');
        window.router?.go('logs');
      });
    } catch (error) {
      window.logService?.error('Failed to clear logs', { error: error.message });
      window.ui?.error('Fout bij wissen van logs');
    }
  }
}

// Create global instance
window.app = new PlanWiseApp();

// Global functions for onclick handlers
window.showAddEventModal = () => window.app.showAddEventModal();
window.editEvent = (eventId) => window.app.editEvent(eventId);
window.deleteEvent = (eventId) => window.app.deleteEvent(eventId);
window.saveSettings = (event) => window.app.saveSettings(event);
window.showAddOrgModal = () => window.app.showAddOrgModal();
window.switchToOrg = (orgSlug) => window.app.switchToOrg(orgSlug);
window.clearLogs = () => window.app.clearLogs();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app.bootstrap();
});
