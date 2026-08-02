import { describe, it, expect } from "vitest";
import {
  createApprovalRequest,
  signStep,
  evaluateGate,
  authorizeSubmission,
  SubmissionBlockedError,
} from "../src/domain/approvals.js";
import { InMemoryAuditSink } from "../src/domain/audit.js";

describe("Approval gate — no submission without all approvals", () => {
  it("blocks submission when nothing is approved", async () => {
    const audit = new InMemoryAuditSink();
    const req = createApprovalRequest("r1", "t1");
    const gate = evaluateGate(req);
    expect(gate.allowed).toBe(false);
    expect(gate.missing).toEqual(["estimator", "lawyer", "tender_specialist", "owner"]);
    await expect(authorizeSubmission(req, { audit })).rejects.toBeInstanceOf(SubmissionBlockedError);
  });

  it("blocks submission when only some roles approved", async () => {
    const audit = new InMemoryAuditSink();
    let req = createApprovalRequest("r2", "t2");
    req = await signStep(req, "estimator", "approved", { audit });
    req = await signStep(req, "lawyer", "approved", { audit });
    const gate = evaluateGate(req);
    expect(gate.allowed).toBe(false);
    expect(gate.missing).toEqual(["tender_specialist", "owner"]);
    await expect(authorizeSubmission(req, { audit })).rejects.toBeInstanceOf(SubmissionBlockedError);
  });

  it("blocks submission when a role rejected, even if others approved", async () => {
    const audit = new InMemoryAuditSink();
    let req = createApprovalRequest("r3", "t3");
    for (const role of ["estimator", "tender_specialist", "owner"] as const) {
      req = await signStep(req, role, "approved", { audit });
    }
    req = await signStep(req, "lawyer", "rejected", { audit, comment: "Нарушение в ТЗ" });
    const gate = evaluateGate(req);
    expect(gate.allowed).toBe(false);
    expect(gate.rejected).toContain("lawyer");
    await expect(authorizeSubmission(req, { audit })).rejects.toBeInstanceOf(SubmissionBlockedError);
  });

  it("authorizes only when every required role approved, and audits it", async () => {
    const audit = new InMemoryAuditSink();
    let req = createApprovalRequest("r4", "t4", { workspaceId: "ws1" });
    for (const role of ["estimator", "lawyer", "tender_specialist", "owner"] as const) {
      req = await signStep(req, role, "approved", { audit, actorId: `u-${role}` });
    }
    const result = await authorizeSubmission(req, { audit, actorId: "u-owner" });
    expect(result.allowed).toBe(true);
    expect(audit.findByAction("submission.authorized")).toHaveLength(1);
    expect(audit.findByAction("approval.signed")).toHaveLength(4);
  });
});
