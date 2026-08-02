import { describe, it, expect } from "vitest";
import {
  canTransition,
  moveStage,
  allowedTransitions,
  funnelStats,
  InvalidTransitionError,
  type PipelineItem,
} from "../src/domain/crm.js";
import { InMemoryAuditSink } from "../src/domain/audit.js";

describe("CRM pipeline transitions", () => {
  it("allows valid forward transitions", () => {
    expect(canTransition("lead", "qualification")).toBe(true);
    expect(canTransition("analysis", "pricing")).toBe(true);
    expect(canTransition("approval", "submitted")).toBe(true);
    expect(canTransition("submitted", "won")).toBe(true);
  });

  it("allows the one-step rework/loss transitions", () => {
    expect(canTransition("pricing", "analysis")).toBe(true); // rework
    expect(canTransition("qualification", "lost")).toBe(true); // drop out
  });

  it("rejects illegal skips and backward jumps", () => {
    expect(canTransition("lead", "submitted")).toBe(false);
    expect(canTransition("lead", "won")).toBe(false);
    expect(canTransition("won", "lead")).toBe(false); // terminal
    expect(canTransition("lost", "qualification")).toBe(false); // terminal
  });

  it("moveStage throws InvalidTransitionError on illegal move", async () => {
    const audit = new InMemoryAuditSink();
    const item: PipelineItem = { id: "c1", stage: "lead" };
    await expect(moveStage(item, "won", { audit })).rejects.toBeInstanceOf(InvalidTransitionError);
    expect(audit.count()).toBe(0); // no audit written for a failed move
  });

  it("moveStage advances and writes an audit record", async () => {
    const audit = new InMemoryAuditSink();
    let item: PipelineItem = { id: "c1", stage: "lead", workspaceId: "ws1" };
    item = await moveStage(item, "qualification", { audit, actorId: "u1" });
    expect(item.stage).toBe("qualification");
    const rec = audit.findByAction("crm.stage.moved");
    expect(rec).toHaveLength(1);
    expect(rec[0]!.metadata).toMatchObject({ from: "lead", to: "qualification" });
  });

  it("terminal stages have no outgoing transitions", () => {
    expect(allowedTransitions("won")).toHaveLength(0);
    expect(allowedTransitions("lost")).toHaveLength(0);
  });

  it("funnelStats counts items per stage", () => {
    const stats = funnelStats([
      { id: "1", stage: "lead" },
      { id: "2", stage: "lead" },
      { id: "3", stage: "won" },
    ]);
    expect(stats.lead).toBe(2);
    expect(stats.won).toBe(1);
    expect(stats.lost).toBe(0);
  });
});
