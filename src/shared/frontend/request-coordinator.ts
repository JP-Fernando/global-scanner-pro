/** Shared ownership of asynchronous results. Invalidated work must not update state or storage. */
export class RequestCoordinator {
  private version = 0;

  start(): number {
    return ++this.version;
  }

  invalidate(): void {
    this.version++;
  }

  isCurrent(version: number): boolean {
    return version === this.version;
  }
}
