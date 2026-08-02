/**
 * Audit trail.
 *
 * Every important action in the platform (a decision, an approval signature, a
 * price scenario selection, a submission attempt, a CRM stage move, an ad
 * rotation config change...) must produce an audit record. Domain services take
 * an `AuditSink` so the same logic works against Postgres in production and an
 * in-memory sink in tests.
 */

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string | undefined;
  actorId?: string | undefined;
  workspaceId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  at: Date;
}

export type AuditInput = Omit<AuditEntry, "at"> & { at?: Date };

export interface AuditSink {
  record(entry: AuditInput): Promise<void> | void;
}

/** Deterministic, dependency-free sink used by tests and local runs. */
export class InMemoryAuditSink implements AuditSink {
  readonly entries: AuditEntry[] = [];

  record(entry: AuditInput): void {
    this.entries.push({ ...entry, at: entry.at ?? new Date() });
  }

  /** Convenience helper for assertions. */
  findByAction(action: string): AuditEntry[] {
    return this.entries.filter((e) => e.action === action);
  }

  count(): number {
    return this.entries.length;
  }
}

/**
 * Wrap any async action so that a successful run always emits exactly one audit
 * record. If the wrapped action throws, no audit record is written (the action
 * did not happen).
 */
export async function withAudit<T>(
  sink: AuditSink,
  meta: Omit<AuditInput, "metadata" | "at"> & { metadata?: Record<string, unknown> },
  action: () => Promise<T> | T,
): Promise<T> {
  const result = await action();
  await sink.record({ ...meta, at: new Date() });
  return result;
}
