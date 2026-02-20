// =====================================================
// TOOLTIP MANAGER - Interactive Documentation System
// =====================================================

import i18n from '../i18n/i18n.js';

/**
 * TooltipManager - Sistema de tooltips interactivos con documentacion contextual
 *
 * Features:
 * - Auto-inicializacion en elementos con data-tooltip
 * - Posicionamiento inteligente (evita bordes de pantalla)
 * - Soporte para contenido enriquecido (HTML, enlaces, ejemplos)
 * - Teclado accesible (Esc para cerrar, Tab para navegacion)
 * - Animaciones suaves
 * - Temas light/dark
 */
export class TooltipManager {
  activeTooltip: any;
  tooltipElement: HTMLElement | null;
  hoverTimeout: any;
  hideTimeout: any;
  SHOW_DELAY: number;
  HIDE_DELAY: number;

  constructor() {
    this.activeTooltip = null;
    this.tooltipElement = null;
    this.hoverTimeout = null;
    this.hideTimeout = null;
    this.SHOW_DELAY = 300; // ms antes de mostrar
    this.HIDE_DELAY = 200; // ms antes de ocultar

    this.init();
  }

  init() {
    this.createTooltipElement();
    this.attachGlobalListeners();
    this.scanAndAttach();
  }

  /**
   * Crea el elemento tooltip global reutilizable
   */
  createTooltipElement() {
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'qsp-tooltip';
    this.tooltipElement.setAttribute('role', 'tooltip');
    this.tooltipElement.setAttribute('aria-live', 'polite');
    this.tooltipElement.style.display = 'none';
    document.body.appendChild(this.tooltipElement);
  }

  /**
   * Escanea el DOM y adjunta tooltips a elementos con data-tooltip
   */
  scanAndAttach() {
    const elements = document.querySelectorAll('[data-tooltip]');
    elements.forEach(el => this.attachToElement(el));
  }

  /**
   * Adjunta eventos de tooltip a un elemento especifico
   */
  attachToElement(element: any) {
    if (element.hasAttribute('data-tooltip-attached')) return;

    element.setAttribute('data-tooltip-attached', 'true');
    element.setAttribute('aria-describedby', 'qsp-tooltip');

    element.addEventListener('mouseenter', (e: any) => this.show(e.currentTarget));
    element.addEventListener('mouseleave', () => this.hide());
    element.addEventListener('focus', (e: any) => this.show(e.currentTarget));
    element.addEventListener('blur', () => this.hide());
  }

  /**
   * Muestra el tooltip con el contenido apropiado
   */
  show(element: any) {
    clearTimeout(this.hideTimeout);

    this.hoverTimeout = setTimeout(() => {
      const tooltipKey = element.getAttribute('data-tooltip');
      const tooltipType = element.getAttribute('data-tooltip-type') || 'simple';

      let content;

      if (tooltipType === 'i18n') {
        // Buscar en sistema de traducciones
        content = this.getTooltipContent(tooltipKey);
      } else if (tooltipType === 'html') {
        // Contenido HTML directo
        content = tooltipKey;
      } else {
        // Texto simple
        content = tooltipKey;
      }

      this.tooltipElement!.innerHTML = content;
      this.tooltipElement!.style.display = 'block';
      this.positionTooltip(element);

      // Animacion de entrada
      requestAnimationFrame(() => {
        this.tooltipElement!.classList.add('qsp-tooltip-visible');
      });

      this.activeTooltip = element;
    }, this.SHOW_DELAY);
  }

  /**
   * Oculta el tooltip activo
   */
  hide() {
    clearTimeout(this.hoverTimeout);

    this.hideTimeout = setTimeout(() => {
      this.tooltipElement!.classList.remove('qsp-tooltip-visible');

      // Esperar animacion antes de ocultar
      setTimeout(() => {
        this.tooltipElement!.style.display = 'none';
      }, 200);

      this.activeTooltip = null;
    }, this.HIDE_DELAY);
  }

  /**
   * Posiciona el tooltip inteligentemente respecto al elemento
   */
  positionTooltip(element: any) {
    const rect = element.getBoundingClientRect();
    const tooltipRect = this.tooltipElement!.getBoundingClientRect();
    const spacing = 8;

    let top: any, left: any;
    let position = element.getAttribute('data-tooltip-position') || 'auto';

    if (position === 'auto') {
      // Determinar mejor posicion automaticamente
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = window.innerWidth - rect.right;

      if (spaceBelow > tooltipRect.height + spacing) {
        position = 'bottom';
      } else if (spaceAbove > tooltipRect.height + spacing) {
        position = 'top';
      } else if (spaceRight > tooltipRect.width + spacing) {
        position = 'right';
      } else if (spaceLeft > tooltipRect.width + spacing) {
        position = 'left';
      } else {
        position = 'bottom'; // fallback
      }
    }

    // Calcular posicion segun direccion
    switch (position) {
      case 'top':
        top = rect.top - tooltipRect.height - spacing;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        this.tooltipElement!.setAttribute('data-position', 'top');
        break;
      case 'bottom':
        top = rect.bottom + spacing;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        this.tooltipElement!.setAttribute('data-position', 'bottom');
        break;
      case 'left':
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        left = rect.left - tooltipRect.width - spacing;
        this.tooltipElement!.setAttribute('data-position', 'left');
        break;
      case 'right':
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        left = rect.right + spacing;
        this.tooltipElement!.setAttribute('data-position', 'right');
        break;
    }

    // Ajustar si se sale de la pantalla
    if (left < spacing) left = spacing;
    if (left + tooltipRect.width > window.innerWidth - spacing) {
      left = window.innerWidth - tooltipRect.width - spacing;
    }
    if (top < spacing) top = spacing;
    if (top + tooltipRect.height > window.innerHeight - spacing) {
      top = window.innerHeight - tooltipRect.height - spacing;
    }

    this.tooltipElement!.style.top = `${top}px`;
    this.tooltipElement!.style.left = `${left}px`;
  }

  /**
   * Obtiene contenido del tooltip desde sistema de traducciones
   */
  getTooltipContent(key: any) {
    const content: any = i18n.t(`tooltips.${key}`);

    // Si tiene titulo y descripcion separados
    if (typeof content === 'object' && content.title && content.description) {
      return `
        <div class="tooltip-title">${content.title}</div>
        <div class="tooltip-description">${content.description}</div>
        ${content.example ? `<div class="tooltip-example">${content.example}</div>` : ''}
        ${content.link ? `<a href="${content.link}" class="tooltip-link" target="_blank">Learn more →</a>` : ''}
      `;
    }

    return content;
  }

  /**
   * Listeners globales para teclado y scroll
   */
  attachGlobalListeners() {
    // Cerrar con Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeTooltip) {
        this.hide();
      }
    });

    // Ocultar en scroll
    window.addEventListener('scroll', () => {
      if (this.activeTooltip) {
        this.hide();
      }
    }, { passive: true });

    // Reposicionar en resize
    window.addEventListener('resize', () => {
      if (this.activeTooltip) {
        this.positionTooltip(this.activeTooltip);
      }
    });
  }

  /**
   * API publica: Anadir tooltip programaticamente
   */
  add(element: any, content: any, options: any = {}) {
    element.setAttribute('data-tooltip', content);
    element.setAttribute('data-tooltip-type', options.type || 'simple');
    if (options.position) {
      element.setAttribute('data-tooltip-position', options.position);
    }
    this.attachToElement(element);
  }

  /**
   * API publica: Remover tooltip
   */
  remove(element: any) {
    element.removeAttribute('data-tooltip');
    element.removeAttribute('data-tooltip-type');
    element.removeAttribute('data-tooltip-position');
    element.removeAttribute('data-tooltip-attached');
  }

  /**
   * API publica: Actualizar tooltips dinamicamente
   */
  refresh() {
    this.scanAndAttach();
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.tooltipElement) {
      this.tooltipElement.remove();
    }
    clearTimeout(this.hoverTimeout);
    clearTimeout(this.hideTimeout);
  }
}

// Instancia global
export const tooltipManager = new TooltipManager();
