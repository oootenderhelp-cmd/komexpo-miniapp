import { describe, it, expect } from "vitest";
import { InMemoryAuditSink, withAudit } from "../src/domain/audit.js";
import { moveStage, type PipelineItem } from "../src/domain/crm.js";
import { createApprovalRequest, signStep, authorizeSubmission } from "../src/domain/approvals.js";
import { SlotRotator, type AdCampaign } from "../src/domain/ads.js";

describe("Audit — important actions are recorded", () => {
  it("withAudit records exactly one entry on success", async () => {
    const audit = new InMemoryAuditSink();
    const out = await withAudit(
      audit,
      { action: "tender.decision.made", entityType: "tender", entityId: "t1", actorId: "u1" },
      () => 42,
    );
    expect(out).toBe(42);
    expect(audit.count()).toBe(1);
    expect(audit.entries[0]!.action).toBe("tender.decision.made");
  });

  it("withAudit records nothing when the action throws", async () => {
    const audit = new InMemoryAuditSink();
    await expect(
      withAudit(audit, { action: "x", entityType: "y" }, () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(audit.count()).toBe(0);
  });

  it("a full flow leaves an audit trail across domains", async () => {
    const audit = new InMemoryAuditSink();

    // CRM move
    let item: PipelineItem = { id: "c1", stage: "lead" };
    item = await moveStage(item, "qualification", { audit });

    // Approvals + submission authorization
    let req = createApprovalRequest("r1", "t1");
    for (const role of ["estimator", "lawyer", "tender_specialist", "owner"] as const) {
      req = await signStep(req, role, "approved", { audit });
    }
    await authorizeSubmission(req, { audit });

    // Ad impression
    const campaigns: AdCampaign[] = [
      { id: "a", slotCode: "top", advertiser: "KomExpo", title: "t", weight: 1, status: "active" },
    ];
    await new SlotRotator("top", audit).serve(campaigns);

    const actions = new Set(audit.entries.map((e) => e.action));
    expect(actions).toContain("crm.stage.moved");
    expect(actions).toContain("approval.signed");
    expect(actions).toContain("submission.authorized");
    expect(actions).toContain("ad.impression.served");
    // 1 crm + 4 approvals + 1 submission + 1 ad = 7
    expect(audit.count()).toBe(7);
  });
});
