/**
 * Default tender-pipeline handlers wired to stub adapters.
 *
 * Demonstrates the ingest→…→notify chain end-to-end with no external calls.
 * Each stage enqueues the next, so a single `ingest` job flows through the
 * whole pipeline when the queue is drained.
 */
import { TaskQueue } from "./index.js";
import type { AuditSink } from "../../domain/audit.js";
import type { AIProvider, NotificationProvider, TenderSourceAdapter } from "../adapters/index.js";
import { StubAIProvider, StubNotificationProvider, StubTenderSourceAdapter } from "../stubs/index.js";
import { priceTender, DEFAULT_PRICING_RULE, type CostLine } from "../../domain/pricing.js";

export interface PipelineDeps {
  source?: TenderSourceAdapter;
  ai?: AIProvider;
  notifier?: NotificationProvider;
  audit?: AuditSink;
}

export function buildPipelineQueue(deps: PipelineDeps = {}): TaskQueue {
  const source = deps.source ?? new StubTenderSourceAdapter();
  const ai = deps.ai ?? new StubAIProvider();
  const notifier = deps.notifier ?? new StubNotificationProvider();
  const q = new TaskQueue({ audit: deps.audit });

  q.on("ingest", async (_job, ctx) => {
    const found = await source.search({ limit: 10 });
    for (const t of found) ctx.enqueue("parse", { externalId: t.externalId, tender: t });
  });

  q.on("parse", async (job, ctx) => {
    // In a real adapter we'd parse documents; here we just pass through.
    ctx.enqueue("enrich", job.payload);
  });

  q.on("enrich", async (job, ctx) => {
    // Enrichment could call AI to summarize; stub returns canned text.
    await ai.complete([{ role: "user", content: "summarize tender" }]);
    ctx.enqueue("score", job.payload);
  });

  q.on("score", async (job, ctx) => {
    // Trivial heuristic score; real impl would use winner_history & fit.
    ctx.enqueue("pricing", job.payload);
  });

  q.on("pricing", async (job, ctx) => {
    const lines: CostLine[] = [{ name: "base", qty: 1, unitCost: 100000 }];
    priceTender(lines, DEFAULT_PRICING_RULE); // guarantees min-margin invariant
    ctx.enqueue("monitor", job.payload);
  });

  q.on("monitor", async (job, ctx) => {
    ctx.enqueue("notify", job.payload);
  });

  q.on("notify", async (job) => {
    const p = job.payload as { externalId?: string };
    await notifier.send({
      channel: "in_app",
      to: "workspace",
      title: "Новый тендер обработан",
      body: `Тендер ${p.externalId ?? "?"} прошёл конвейер.`,
    });
  });

  return q;
}
