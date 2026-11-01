/** Browser install lifecycle, independent of either frontend's DOM/bootstrap. */
export interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export class InstallController {
  private deferred: InstallPrompt | null = null;
  busy = false;
  installed = false;
  constructor(private changed: () => void) {}
  get available(): boolean { return Boolean(this.deferred) && !this.installed && !this.busy; }
  capture(event: InstallPrompt, standalone: boolean): void {
    event.preventDefault();
    if (standalone || this.installed) return;
    this.deferred = event; this.changed();
  }
  markInstalled(): void { this.installed = true; this.deferred = null; this.changed(); }
  async prompt(): Promise<void> {
    if (!this.available) return;
    const event = this.deferred!;
    this.deferred = null; this.busy = true; this.changed();
    try { await event.prompt(); await event.userChoice; }
    finally { this.busy = false; this.changed(); }
  }
}
