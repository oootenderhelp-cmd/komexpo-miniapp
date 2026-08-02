/**
 * Тендровик AI — backend foundation entry point.
 *
 * This is NOT a production HTTP server; it's a smoke-run that exercises the
 * portable pieces (queue, stub adapters, pricing, approvals, CRM, ads) without
 * needing PostgreSQL or any external key. Run with `npm run dev`.
 *
 * The OpenAPI contract in ./openapi describes the HTTP surface these services
 * are meant to back.
 */
import { InMemoryAuditSink } from "./domain/audit.js";
import { buildPipelineQueue } from "./services/queue/pipeline.js";
import { priceTender } from "./domain/pricing.js";
import { createApprovalRequest, signStep, authorizeSubmission } from "./domain/approvals.js";
import { SlotRotator, type AdCampaign } from "./domain/ads.js";
import { moveStage, type PipelineItem } from "./domain/crm.js";

async function main() {
  const audit = new InMemoryAuditSink();

  // 1) Background pipeline
  const q = buildPipelineQueue({ audit });
  q.enqueue("ingest");
  const res = await q.drain();
  console.log(`[queue] processed=${res.processed} failed=${res.failed}`);

  // 2) Pricing (three strategies, min-margin enforced)
  const pricing = priceTender([
    { name: "Материалы", qty: 100, unitCost: 500 },
    { name: "Работа", qty: 40, unitCost: 1200 },
  ]);
  console.log(`[pricing] totalCost=${pricing.cost.totalCost}`);
  for (const s of pricing.scenarios) {
    console.log(`  - ${s.strategy}: price=${s.price} margin=${s.marginPct}% floored=${s.flooredToMinMargin}`);
  }

  // 3) Approvals → submission gate
  let req = createApprovalRequest("req-1", "tender-1");
  for (const role of ["estimator", "lawyer", "tender_specialist", "owner"] as const) {
    req = await signStep(req, role, "approved", { audit, actorId: `user-${role}` });
  }
  await authorizeSubmission(req, { audit, actorId: "user-owner" });
  console.log("[approvals] submission authorized (human confirmation still required)");

  // 4) CRM move
  let item: PipelineItem = { id: "crm-1", stage: "lead" };
  item = await moveStage(item, "qualification", { audit });
  console.log(`[crm] stage=${item.stage}`);

  // 5) Ad rotation
  const campaigns: AdCampaign[] = [
    { id: "ad-komexpo", slotCode: "dashboard_top", advertiser: "KomExpo", title: "KomExpo", weight: 3, status: "active" },
    { id: "ad-courses", slotCode: "dashboard_top", advertiser: "Курсы", title: "Курсы тендеров", weight: 1, status: "active" },
  ];
  const rotator = new SlotRotator("dashboard_top", audit);
  const shown: string[] = [];
  for (let i = 0; i < 4; i++) {
    const c = await rotator.serve(campaigns);
    if (c) shown.push(c.advertiser);
  }
  console.log(`[ads] rotation: ${shown.join(", ")}`);

  console.log(`[audit] total records=${audit.count()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
