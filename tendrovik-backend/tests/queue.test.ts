import { describe, it, expect } from "vitest";
import { TaskQueue } from "../src/services/queue/index.js";
import type { AuditSink, AuditInput } from "../src/domain/audit.js";

describe("TaskQueue", () => {
  it("drains a job and follow-up jobs it enqueues", async () => {
    const q = new TaskQueue();
    let notified = 0;
    q.on("ingest", async (_job, ctx) => {
      ctx.enqueue("notify", {});
    }).on("notify", async () => {
      notified += 1;
    });
    q.enqueue("ingest");
    const res = await q.drain();
    expect(res.processed).toBe(2);
    expect(res.failed).toBe(0);
    expect(notified).toBe(1);
  });

  it("does NOT re-run a completed handler when the completion audit throws", async () => {
    // Audit sink that fails only on the success ("job.completed") write.
    const failingAudit: AuditSink = {
      record(entry: AuditInput) {
        if (entry.action === "job.completed") throw new Error("audit store down");
      },
    };
    let runs = 0;
    const q = new TaskQueue({ audit: failingAudit });
    q.on("ingest", async () => {
      runs += 1;
    });
    q.enqueue("ingest");
    const res = await q.drain();
    // Handler must run exactly once despite the audit failure — no retry storm.
    expect(runs).toBe(1);
    expect(res.processed).toBe(1);
  });

  it("retries a genuinely failing handler up to maxAttempts", async () => {
    const q = new TaskQueue({ maxAttempts: 3 });
    let attempts = 0;
    q.on("parse", async () => {
      attempts += 1;
      throw new Error("boom");
    });
    q.enqueue("parse");
    const res = await q.drain();
    expect(attempts).toBe(3);
    expect(res.failed).toBe(1);
  });
});
