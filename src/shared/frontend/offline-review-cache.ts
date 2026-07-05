import { dbStore } from '../../storage/indexed-db-store.js';

type OfflineReviewStore = {
  saveLastScan(payload: any): Promise<void>;
  saveLastSimulation(payload: any): Promise<void>;
};

export function persistLastScanReview(payload: any, store: OfflineReviewStore = dbStore): void {
  store
    .saveLastScan(payload)
    .catch((error: any) => console.warn('Failed to persist last scan for offline review:', error?.message));
}

export function persistLastSimulationReview(payload: any, store: OfflineReviewStore = dbStore): void {
  store
    .saveLastSimulation(payload)
    .catch((error: any) => console.warn('Failed to persist last simulation for offline review:', error?.message));
}
