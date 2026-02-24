/**
 * Async Job Queue Manager
 *
 * Provides BullMQ-based job queues for offloading CPU-intensive operations
 * to background workers, freeing the HTTP event loop for fast responses.
 *
 * Queue availability:
 *   - Requires REDIS_URL to be configured.
 *   - When Redis is not set all queue operations are no-ops and callers
 *     receive { queued: false, reason: 'redis_not_configured' }.
 *
 * Queues:
 *   - `portfolio-optimization` — Max Sharpe / Min Variance / Risk Parity optimisation
 *   - `report-generation`      — Excel / PDF report assembly
 *   - `ml-training`            — Factor-weight re-training, regime prediction
 *
 * @module queue/queue-manager
 */

import { Queue, Worker, QueueEvents, type Job, type ConnectionOptions } from 'bullmq';
import { config } from '../config/environment.js';
import { log } from '../utils/logger.js';
import { portfolioOptimizationProcessor } from './processors/portfolio-optimization.processor.js';
import { reportGenerationProcessor } from './processors/report-generation.processor.js';
import { mlTrainingProcessor } from './processors/ml-training.processor.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type QueueName = 'portfolio-optimization' | 'report-generation' | 'ml-training';

export interface JobResult {
  queued: true;
  jobId: string;
  queue: QueueName;
  estimatedWaitMs?: number;
}

export interface QueueUnavailable {
  queued: false;
  reason: 'redis_not_configured' | 'queue_error';
  message: string;
}

export type EnqueueResult = JobResult | QueueUnavailable;

// ── Connection helpers ────────────────────────────────────────────────────────

function makeConnection(): ConnectionOptions | null {
  if (!config.redis.url) return null;
  // BullMQ accepts a full Redis URL string as connection option
  return config.redis.url as unknown as ConnectionOptions;
}

// ── Queue & Worker instances ──────────────────────────────────────────────────

const queues = new Map<QueueName, Queue>();
const workers = new Map<QueueName, Worker>();
const queueEvents = new Map<QueueName, QueueEvents>();

let initialised = false;

/** Processor map: queue name → async handler function */
const processors: Record<QueueName, (job: Job) => Promise<unknown>> = {
  'portfolio-optimization': portfolioOptimizationProcessor,
  'report-generation': reportGenerationProcessor,
  'ml-training': mlTrainingProcessor
};

/** Default job options */
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { age: 3600, count: 100 },  // keep 1h or last 100
  removeOnFail: { age: 86400, count: 50 }         // keep 24h or last 50
};

// ── Init / teardown ───────────────────────────────────────────────────────────

/**
 * Initialises all BullMQ queues and workers.
 * Safe to call multiple times — subsequent calls are no-ops.
 * Does nothing when Redis is not configured.
 */
export function initQueues(): void {
  if (initialised) return;
  const connection = makeConnection();
  if (!connection) {
    log.info('Job queues disabled (REDIS_URL not set)');
    return;
  }

  const queueNames: QueueName[] = ['portfolio-optimization', 'report-generation', 'ml-training'];

  for (const name of queueNames) {
    const queue = new Queue(name, { connection, prefix: config.redis.keyPrefix });
    const worker = new Worker(name, processors[name], {
      connection,
      prefix: config.redis.keyPrefix,
      concurrency: name === 'ml-training' ? 1 : 2  // ML jobs are heavier
    });
    const events = new QueueEvents(name, { connection, prefix: config.redis.keyPrefix });

    worker.on('completed', (job: Job) => {
      log.info(`Job completed: ${name}#${job.id}`);
    });
    worker.on('failed', (job: Job | undefined, err: Error) => {
      log.error(`Job failed: ${name}#${job?.id ?? 'unknown'}`, { error: err.message });
    });
    worker.on('stalled', (jobId: string) => {
      log.warn(`Job stalled: ${name}#${jobId}`);
    });

    queues.set(name, queue);
    workers.set(name, worker);
    queueEvents.set(name, events);

    log.info(`Queue initialised: ${name}`);
  }

  initialised = true;
  log.info('All job queues initialised');
}

/**
 * Gracefully closes all BullMQ queues and workers.
 * Should be called during application shutdown.
 */
export async function closeQueues(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  for (const [name, worker] of workers) {
    closePromises.push(
      worker.close().then(() => { log.info(`Worker closed: ${name}`); })
    );
  }
  for (const [, events] of queueEvents) {
    closePromises.push(events.close());
  }
  for (const [, queue] of queues) {
    closePromises.push(queue.close());
  }

  await Promise.allSettled(closePromises);
  queues.clear();
  workers.clear();
  queueEvents.clear();
  initialised = false;
  log.info('All job queues closed');
}

// ── Public enqueueing API ─────────────────────────────────────────────────────

/**
 * Adds a job to the specified queue.
 *
 * @param queueName - Target queue
 * @param jobName   - Descriptive job label (appears in Bull Board / logs)
 * @param data      - Serialisable payload passed to the processor
 * @param options   - Optional BullMQ job option overrides
 */
export async function enqueue(
  queueName: QueueName,
  jobName: string,
  data: unknown,
  options?: Partial<typeof DEFAULT_JOB_OPTIONS>
): Promise<EnqueueResult> {
  if (!config.redis.url) {
    return {
      queued: false,
      reason: 'redis_not_configured',
      message: 'Set REDIS_URL to enable async job processing'
    };
  }

  const queue = queues.get(queueName);
  if (!queue) {
    return {
      queued: false,
      reason: 'queue_error',
      message: `Queue "${queueName}" not initialised — call initQueues() at startup`
    };
  }

  try {
    const job = await queue.add(jobName, data, { ...DEFAULT_JOB_OPTIONS, ...options });
    log.info(`Job enqueued: ${queueName}#${job.id}`, { jobName, queue: queueName });
    return { queued: true, jobId: job.id!, queue: queueName };
  } catch (err) {
    log.error(`Failed to enqueue job: ${queueName}`, { error: (err as Error).message });
    return {
      queued: false,
      reason: 'queue_error',
      message: (err as Error).message
    };
  }
}

// ── Job status API ────────────────────────────────────────────────────────────

export interface JobStatus {
  id: string;
  queue: QueueName;
  name: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown';
  progress: number;
  result?: unknown;
  error?: string;
  createdAt?: number;
  processedAt?: number;
  finishedAt?: number;
  attemptsMade: number;
}

/**
 * Returns the current status of a job by ID across all queues.
 * Returns `null` if the job is not found in any queue.
 */
export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  for (const [queueName, queue] of queues) {
    const job = await queue.getJob(jobId);
    if (!job) continue;

    const state = await job.getState();
    return {
      id: job.id!,
      queue: queueName,
      name: job.name,
      state: state as JobStatus['state'],
      progress: typeof job.progress === 'number' ? job.progress : 0,
      result: state === 'completed' ? job.returnvalue : undefined,
      error: state === 'failed' ? job.failedReason : undefined,
      createdAt: job.timestamp,
      processedAt: job.processedOn ?? undefined,
      finishedAt: job.finishedOn ?? undefined,
      attemptsMade: job.attemptsMade
    };
  }
  return null;
}

// ── Queue stats ───────────────────────────────────────────────────────────────

export interface QueueStats {
  name: QueueName;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

/**
 * Returns counts for each queue across all states.
 * Used by the health endpoint and Prometheus metrics.
 */
export async function getQueueStats(): Promise<QueueStats[]> {
  const stats: QueueStats[] = [];

  for (const [name, queue] of queues) {
    const counts = await queue.getJobCounts(
      'waiting', 'active', 'completed', 'failed', 'delayed', 'paused'
    );
    stats.push({
      name,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      paused: counts.paused ?? 0
    });
  }

  return stats;
}

/**
 * Returns true if queues are enabled (Redis is configured and init ran).
 */
export function queuesEnabled(): boolean {
  return initialised && queues.size > 0;
}
