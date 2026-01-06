// =====================================================
// ACCESSIBILITY MANAGER
// =====================================================

import { i18n } from '../i18n/i18n.js';

/**
 * AccessibilityManager - Sistema completo de accesibilidad
 *
 * Features:
 * - ARIA labels automáticos
 * - Navegación por teclado completa
 * - Gestión de foco
 * - Skip links
 * - Announcements en screen readers
 * - Keyboard shortcuts
 * - High contrast mode support
 */
export class AccessibilityManager {
  constructor() {
    this.focusStack = [];
    this.shortcuts = new Map();
    this.liveRegion = null;
    this.skipLink = null;

    this.init();
  }

  init() {
    this.setupARIA();
    this.setupKeyboardNavigation();
    this.setupLiveRegion();
    this.setupSkipLink();
    this.setupFocusManagement();
    this.registerDefaultShortcuts();
    this.enhanceFormControls();
  }

  // =====================================================
  // ARIA LABELS & SEMANTICS
  // =====================================================

  setupARIA() {
    // Main landmarks
    this.addLandmarks();

    // Dynamic content
    this.enhanceDynamicContent();

    // Interactive elements
    this.enhanceInteractiveElements();

    // Tables
    this.enhanceTables();
  }

  addLandmarks() {
    // Banner (header)
    const header = document.querySelector('.header');
    if (header && !header.hasAttribute('role')) {
      header.setAttribute('role', 'banner');
      header.setAttribute('aria-label', i18n.t('a11y.main_header') || 'Main header');
    }

    // Main content
    const container = document.querySelector('.container');
    if (container) {
      let main = container.querySelector('main');
      if (!main) {
        main = document.createElement('main');
        main.setAttribute('id', 'main-content');
        main.setAttribute('role', 'main');
        main.setAttribute('aria-label', i18n.t('a11y.main_content') || 'Main content');

        // Wrap existing content
        const controls = container.querySelector('.controls');
        if (controls) {
          const parent = controls.parentNode;
          main.appendChild(controls);
          while (controls.nextSibling) {
            main.appendChild(controls.nextSibling);
          }
          parent.appendChild(main);
        }
      }
    }

    // Navigation
    const nav = document.querySelector('.language-selector');
    if (nav) {
      const navWrapper = document.createElement('nav');
      navWrapper.setAttribute('role', 'navigation');
      navWrapper.setAttribute('aria-label', i18n.t('a11y.language_navigation') || 'Language selection');
      nav.parentNode.insertBefore(navWrapper, nav);
      navWrapper.appendChild(nav);
    }

    // Complementary (sidebar if exists)
    const sidebar = document.querySelector('.qsp-help-panel');
    if (sidebar) {
      sidebar.setAttribute('role', 'complementary');
      sidebar.setAttribute('aria-label', i18n.t('a11y.help_panel') || 'Help panel');
    }
  }

  enhanceDynamicContent() {
    // Status messages
    const status = document.querySelector('.status');
    if (status) {
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');
    }

    // Results table
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
      tableContainer.setAttribute('role', 'region');
      tableContainer.setAttribute('aria-label', i18n.t('a11y.results_table') || 'Scan results table');
    }
  }

  enhanceInteractiveElements() {
    // Buttons
    document.querySelectorAll('button:not([aria-label])').forEach(btn => {
      const text = btn.textContent.trim() || btn.innerText.trim();
      if (text) {
        btn.setAttribute('aria-label', text);
      }
    });

    // Selects
    document.querySelectorAll('select').forEach(select => {
      const label = select.previousElementSibling;
      if (label && label.tagName === 'LABEL') {
        const id = select.id || `select-${Math.random().toString(36).substr(2, 9)}`;
        select.id = id;
        label.setAttribute('for', id);
      }

      // Add aria-label if no label
      if (!select.hasAttribute('aria-label') && !select.hasAttribute('aria-labelledby')) {
        const labelText = label?.textContent || select.name || 'Selection';
        select.setAttribute('aria-label', labelText);
      }
    });

    // Links
    document.querySelectorAll('a[href]').forEach(link => {
      if (!link.hasAttribute('aria-label')) {
        const text = link.textContent.trim();
        if (text) {
          link.setAttribute('aria-label', text);
        }
      }

      // External links
      if (link.hostname !== window.location.hostname) {
        link.setAttribute('aria-label', `${link.textContent.trim()} (${i18n.t('a11y.external_link') || 'opens in new tab'})`);
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  enhanceTables() {
    document.querySelectorAll('table').forEach(table => {
      // Caption
      if (!table.querySelector('caption')) {
        const caption = document.createElement('caption');
        caption.textContent = table.getAttribute('data-caption') || i18n.t('a11y.data_table') || 'Data table';
        caption.className = 'sr-only'; // Visually hidden
        table.insertBefore(caption, table.firstChild);
      }

      // Headers scope
      table.querySelectorAll('th').forEach(th => {
        if (!th.hasAttribute('scope')) {
          const isHeaderRow = th.parentElement.parentElement.tagName === 'THEAD';
          th.setAttribute('scope', isHeaderRow ? 'col' : 'row');
        }
      });

      // Row headers
      table.querySelectorAll('tbody tr').forEach((row, idx) => {
        row.setAttribute('role', 'row');
        const firstCell = row.querySelector('td:first-child');
        if (firstCell && !firstCell.hasAttribute('scope')) {
          firstCell.setAttribute('scope', 'row');
        }
      });
    });
  }

  // =====================================================
  // KEYBOARD NAVIGATION
  // =====================================================

  setupKeyboardNavigation() {
    // Tab trap for modals
    document.addEventListener('keydown', (e) => {
      const modal = document.querySelector('.modal[style*="display: block"], .modal.active');
      if (modal) {
        this.handleModalTabTrap(e, modal);
      }
    });

    // Arrow key navigation for custom selects/lists
    document.querySelectorAll('[role="listbox"], [role="menu"]').forEach(list => {
      this.enableArrowKeyNavigation(list);
    });

    // Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleEscape();
      }
    });
  }

  handleModalTabTrap(e, modal) {
    if (e.key !== 'Tab') return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  enableArrowKeyNavigation(list) {
    const items = list.querySelectorAll('[role="option"], [role="menuitem"]');
    let currentIndex = 0;

    list.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentIndex = (currentIndex + 1) % items.length;
        items[currentIndex].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentIndex = (currentIndex - 1 + items.length) % items.length;
        items[currentIndex].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        currentIndex = 0;
        items[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        currentIndex = items.length - 1;
        items[items.length - 1].focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        items[currentIndex].click();
      }
    });
  }

  handleEscape() {
    // Close modals
    const modal = document.querySelector('.modal[style*="display: block"], .modal.active');
    if (modal) {
      const closeBtn = modal.querySelector('.close, [data-dismiss="modal"]');
      if (closeBtn) {
        closeBtn.click();
      }
    }

    // Close help panel
    const helpPanel = document.querySelector('.qsp-help-panel.help-panel-open');
    if (helpPanel) {
      const toggleBtn = helpPanel.querySelector('.help-panel-toggle');
      if (toggleBtn) {
        toggleBtn.click();
      }
    }
  }

  // =====================================================
  // FOCUS MANAGEMENT
  // =====================================================

  setupFocusManagement() {
    // Visible focus indicators
    this.enhanceFocusIndicators();

    // Focus restoration
    this.setupFocusRestoration();

    // Auto-focus on errors
    this.setupErrorFocus();
  }

  enhanceFocusIndicators() {
    // Add focus-visible polyfill behavior
    document.addEventListener('mousedown', () => {
      document.body.classList.add('using-mouse');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        document.body.classList.remove('using-mouse');
      }
    });
  }

  setupFocusRestoration() {
    // Save focus before modal opens
    document.addEventListener('modalopen', (e) => {
      this.focusStack.push(document.activeElement);
    });

    // Restore focus when modal closes
    document.addEventListener('modalclose', (e) => {
      const previousFocus = this.focusStack.pop();
      if (previousFocus) {
        previousFocus.focus();
      }
    });
  }

  setupErrorFocus() {
    // Focus first error field
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.classList?.contains('error')) {
            const errorField = node.querySelector('input, select, textarea');
            if (errorField) {
              errorField.focus();
              errorField.setAttribute('aria-invalid', 'true');
            }
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // =====================================================
  // LIVE REGION (Screen Reader Announcements)
  // =====================================================

  setupLiveRegion() {
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only';
    document.body.appendChild(this.liveRegion);
  }

  announce(message, priority = 'polite') {
    if (!this.liveRegion) this.setupLiveRegion();

    this.liveRegion.setAttribute('aria-live', priority); // 'polite' or 'assertive'
    this.liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      this.liveRegion.textContent = '';
    }, 1000);
  }

  // =====================================================
  // SKIP LINK
  // =====================================================

  setupSkipLink() {
    this.skipLink = document.createElement('a');
    this.skipLink.href = '#main-content';
    this.skipLink.className = 'skip-to-content';
    this.skipLink.textContent = i18n.t('a11y.skip_to_content') || 'Skip to main content';

    this.skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const main = document.getElementById('main-content');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus();
      }
    });

    document.body.insertBefore(this.skipLink, document.body.firstChild);
  }

  // =====================================================
  // KEYBOARD SHORTCUTS
  // =====================================================

  registerShortcut(key, callback, description) {
    this.shortcuts.set(key, { callback, description });
  }

  registerDefaultShortcuts() {
    // F1 - Help
    this.registerShortcut('F1', () => {
      const helpBtn = document.querySelector('.help-panel-toggle');
      if (helpBtn) helpBtn.click();
    }, 'Toggle help panel');

    // Ctrl+K - Search
    this.registerShortcut('ctrl+k', () => {
      const searchInput = document.querySelector('.help-search-input');
      if (searchInput) searchInput.focus();
    }, 'Focus search');

    // ? - Show shortcuts
    this.registerShortcut('?', () => {
      this.showShortcutsHelp();
    }, 'Show keyboard shortcuts');

    // Attach listener
    document.addEventListener('keydown', (e) => {
      const key = this.getKeyCombo(e);
      const shortcut = this.shortcuts.get(key);

      if (shortcut) {
        e.preventDefault();
        shortcut.callback();
      }
    });
  }

  getKeyCombo(e) {
    const parts = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    parts.push(e.key.toLowerCase());
    return parts.join('+');
  }

  showShortcutsHelp() {
    const shortcuts = Array.from(this.shortcuts.entries())
      .map(([key, data]) => `${key}: ${data.description}`)
      .join('\n');

    this.announce(`Keyboard shortcuts: ${shortcuts}`, 'polite');
  }

  // =====================================================
  // FORM CONTROLS ENHANCEMENT
  // =====================================================

  enhanceFormControls() {
    // Add required indicators
    document.querySelectorAll('[required]').forEach(field => {
      field.setAttribute('aria-required', 'true');

      const label = document.querySelector(`label[for="${field.id}"]`);
      if (label && !label.querySelector('.required-indicator')) {
        const indicator = document.createElement('span');
        indicator.className = 'required-indicator';
        indicator.setAttribute('aria-label', 'required');
        indicator.textContent = '*';
        label.appendChild(indicator);
      }
    });

    // Add error messages
    document.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('invalid', (e) => {
        e.preventDefault();
        this.showFieldError(field, field.validationMessage);
      });
    });
  }

  showFieldError(field, message) {
    let errorDiv = field.parentElement.querySelector('.field-error');

    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'field-error';
      errorDiv.setAttribute('role', 'alert');
      field.parentElement.appendChild(errorDiv);
    }

    errorDiv.textContent = message;
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', errorDiv.id || 'error-' + field.id);

    this.announce(message, 'assertive');
  }

  clearFieldError(field) {
    const errorDiv = field.parentElement.querySelector('.field-error');
    if (errorDiv) {
      errorDiv.remove();
    }
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
  }

  // =====================================================
  // UTILITY: Screen Reader Only Class
  // =====================================================

  addSROnlyStyles() {
    if (!document.getElementById('a11y-sr-only-styles')) {
      const style = document.createElement('style');
      style.id = 'a11y-sr-only-styles';
      style.textContent = `
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        .sr-only-focusable:focus {
          position: static;
          width: auto;
          height: auto;
          overflow: visible;
          clip: auto;
          white-space: normal;
        }
      `;
      document.head.appendChild(style);
    }
  }

  // =====================================================
  // PUBLIC API
  // =====================================================

  refresh() {
    this.setupARIA();
    this.enhanceFormControls();
  }

  destroy() {
    if (this.liveRegion) {
      this.liveRegion.remove();
    }
    if (this.skipLink) {
      this.skipLink.remove();
    }
  }
}

// Instancia global
export const accessibilityManager = new AccessibilityManager();
