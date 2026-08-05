/**
 * In-process background task queue.
 *
 * A small, dependency-free job runner supporting the tender pipeline stages:
 *   ingest → parse → enrich → score → pricing → monitor → notify
 *
 * It is intentionally simple (in-memory, single process) so the foundation runs
 * anywhere. In production this port can be backed by BullMQ / pg-boss / SQS
 * while keeping the same `JobHandler` contract and stage names.
 */
import type { AuditSink, AuditInput } from "../../domain/audit.js";

export type JobKind = "ingest" | "parse" | "enrich" | "score" | "pricing" | "monitor" | "notify";
export const JOB_KINDS: JobKind[] = ["ingest", "parse", "enrich", "score", "pricing", "monitor", "notify"];

export interface Job<T = Record<string, unknown>> {
  id: string;
  kind: JobKind;
  payload: T;
  attempts: number;
}

export type JobHandler<T = Record<string, unknown>> = (
  job: Job<T>,
  ctx: JobContext,
) => Promise<void>;

export interface JobContext {
  enqueue: (kind: JobKind, payload: Record<string, unknown>) => string;
  audit?: AuditSink;
}

export class TaskQueue {
  private seq = 0;
  private readonly queue: Job[] = [];
  private readonly handlers = new Map<JobKind, JobHandler>();
  private readonly maxAttempts: number;

  constructor(opts: { maxAttempts?: number; audit?: AuditSink } = {}) {
    this.maxAttempts = opts.maxAttempts ?? 3;
    this.audit = opts.audit;
  }

  private audit?: AuditSink;

  on<T = Record<string, unknown>>(kind: JobKind, handler: JobHandler<T>): this {
    this.handlers.set(kind, handler as JobHandler);
    return this;
  }

  enqueue(kind: JobKind, payload: Record<string, unknown> = {}): string {
    const id = `job-${++this.seq}`;
    this.queue.push({ id, kind, payload, attempts: 0 });
    return id;
  }

  get size(): number {
    return this.queue.length;
  }

  /** Drain the queue until empty (jobs may enqueue follow-up jobs). */
  async drain(): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;
    const ctx: JobContext = {
      enqueue: (kind, payload) => this.enqueue(kind, payload),
      audit: this.audit,
    };
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      const handler = this.handlers.get(job.kind);
      if (!handler) continue;

      // Phase 1: run the handler. Only a handler failure triggers a retry.
      try {
        job.attempts += 1;
        await handler(job, ctx);
      } catch (err) {
        if (job.attempts < this.maxAttempts) {
          this.queue.push(job); // retry
        } else {
          failed += 1;
          await this.recordSafely({
            action: "job.failed",
            entityType: "job",
            entityId: job.id,
            metadata: { kind: job.kind, error: String(err) },
          });
        }
        continue;
      }

      // Phase 2: handler already succeeded. A failure to write the completion
      // audit must NOT re-run the handler — that would duplicate downstream work
      // (each pipeline stage enqueues its next stage before this point).
      processed += 1;
      await this.recordSafely({
        action: "job.completed",
        entityType: "job",
        entityId: job.id,
        metadata: { kind: job.kind },
      });
    }
    return { processed, failed };
  }

  /** Record an audit entry without letting a sink failure escape into job control flow. */
  private async recordSafely(entry: AuditInput): Promise<void> {
    try {
      await this.audit?.record(entry);
    } catch {
      /* audit is best-effort here; never re-run a completed handler because of it */
    }
  }
}
