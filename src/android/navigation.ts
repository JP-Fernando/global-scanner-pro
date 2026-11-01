/** Presentation-only recovery. Restoring a route never starts domain/network operations. */
export const NAVIGATION_KEY = 'gsp.android.navigation.v1';
type FocusTarget = { selection?: [number, number]; id?: string; name?: string; symbol?: string; action?: string; toggle?: string; href?: string };
type View = { scroll: number; details: Record<string, boolean>; focus?: FocusTarget };
type State = { route: string; views: Record<string, View> };
export function isAndroidRoute(path: unknown): path is string {
  if (typeof path !== 'string' || path.length > 500) return false;
  if (['scan', 'results', 'simulator', 'portfolios', 'alerts'].includes(path)) return true;
  if (!/^(asset\/[^/]+|position\/[^/]+\/[^/]+)$/.test(path)) return false;
  try { return path.split('/').every(part => Boolean(decodeURIComponent(part).trim())); } catch { return false; }
}
export class AndroidNavigation {
  private state: State = { route: 'scan', views: {} };
  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(NAVIGATION_KEY) || 'null');
      if (isAndroidRoute(saved?.route)) this.state.route = saved.route;
      for (const [path, raw] of Object.entries(saved?.views || {}).slice(-30)) {
        const view = raw as View;
        if (!isAndroidRoute(path) || !Number.isFinite(view?.scroll) || !view.details) continue;
        this.state.views[path] = { scroll: Math.max(0, Math.min(1e7, view.scroll)), details:
          Object.fromEntries(Object.entries(view.details).filter(([id, open]) => id.length < 80 && typeof open === 'boolean')) };
        const focus = view.focus;
        if (focus) {
          const { selection, ...fields } = focus;
          if (Object.values(fields).every(value => typeof value === 'string' && value.length < 500)) {
            this.state.views[path].focus = fields;
            if (Array.isArray(selection) && selection.length === 2 && selection.every(value => Number.isInteger(value) && value >= 0)) {
              this.state.views[path].focus!.selection = selection;
            }
          }
        }
      }
    } catch { /* Recovery remains usable without storage. */ }
  }
  get lastRoute(): string { return this.state.route; }
  capture(root: HTMLElement): void {
    const path = root.dataset.route;
    if (!isAndroidRoute(path)) return;
    const pending = root.dataset.pendingRestore === 'true';
    const view: View = { scroll: pending
      ? this.state.views[path]?.scroll || window.scrollY : window.scrollY, details: { ...this.state.views[path]?.details } };
    root.querySelectorAll<HTMLDetailsElement>('details[id]').forEach(node => { view.details[node.id] = node.open; });
    const active = document.activeElement as HTMLElement | null;
    if (active && root.contains(active)) {
      view.focus = { id: active.id || undefined, name: active.getAttribute('name') || undefined,
        symbol: active.dataset.symbol, action: active.dataset.action, toggle: active.dataset.toggle,
        href: active.getAttribute('href') || undefined };
      if (!Object.values(view.focus).some(Boolean)) delete view.focus;
      const input = active as HTMLInputElement;
      if (view.focus && typeof input.selectionStart === 'number' && typeof input.selectionEnd === 'number') {
        view.focus.selection = [input.selectionStart, input.selectionEnd];
      }
    // Without live focus, keep the saved target only until an async screen can restore it;
    // otherwise a later redraw would pull focus back to a control the user has left.
    } else if (pending) view.focus = this.state.views[path]?.focus;
    this.state.views[path] = view;
    const paths = Object.keys(this.state.views);
    if (paths.length > 30) delete this.state.views[paths.find(key => key !== path)!];
    this.state.route = path;
  }
  restore(root: HTMLElement, path: string, heading = false, settled = true): void {
    root.dataset.route = path;
    root.dataset.pendingRestore = String(!settled);
    const view = this.state.views[path];
    root.querySelectorAll<HTMLDetailsElement>('details[id]').forEach(node => {
      if (typeof view?.details[node.id] === 'boolean') node.open = view.details[node.id];
    });
    const target = view?.focus;
    const focus = heading ? root.querySelector<HTMLElement>('h1') : target &&
      Array.from(root.querySelectorAll<HTMLElement>('[id], [name], [data-action], [data-toggle], a[href]')).find(node =>
        (!target.id || node.id === target.id) && (!target.name || node.getAttribute('name') === target.name)
        && (!target.symbol || node.dataset.symbol === target.symbol) && (!target.action || node.dataset.action === target.action)
        && (!target.toggle || node.dataset.toggle === target.toggle) && (!target.href || node.getAttribute('href') === target.href));
    focus?.focus({ preventScroll: true });
    if (focus && target?.selection) {
      try { (focus as HTMLInputElement).setSelectionRange(...target.selection); } catch { /* Non-text controls have no selection. */ }
    }
    window.scrollTo(0, view?.scroll || 0);
    if (isAndroidRoute(path)) this.state.route = path;
  }
  save(): void {
    try { localStorage.setItem(NAVIGATION_KEY, JSON.stringify(this.state)); } catch { /* Draft storage reports failure separately. */ }
  }
}
