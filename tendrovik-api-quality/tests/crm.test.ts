import { describe, it, expect, beforeAll } from "vitest";
import { api, serverIsReachable, uuid } from "../src/client.js";

describe("CRM pipeline", () => {
  let live: boolean;
  beforeAll(async () => {
    live = await serverIsReachable();
  });

  it("GET /crm/pipeline returns items array", async ({ skip }) => {
    if (!live) skip();
    const res = await api<unknown[]>("/crm/pipeline");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /crm/pipeline?stage=lead filters by stage", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{ stage: string }[]>("/crm/pipeline?stage=lead");
    expect(res.status).toBe(200);
    if (Array.isArray(res.body) && res.body.length > 0) {
      for (const item of res.body) expect(item.stage).toBe("lead");
    }
  });

  it("PUT /crm/pipeline/{id}/stage moves forward", async ({ skip }) => {
    if (!live) skip();
    const list = await api<{ id: string; stage: string }[]>("/crm/pipeline");
    const item = list.body?.find((i) => i.stage === "lead");
    if (!item) skip();
    const res = await api<{ stage: string }>(`/crm/pipeline/${item!.id}/stage`, {
      method: "PUT",
      body: { stage: "qualification" },
    });
    expect(res.status).toBe(200);
    expect(res.body.stage).toBe("qualification");
  });

  it("PUT /crm/pipeline/{id}/stage rejects invalid transition (409)", async ({ skip }) => {
    if (!live) skip();
    const list = await api<{ id: string; stage: string }[]>("/crm/pipeline");
    const item = list.body?.find((i) => i.stage === "lead");
    if (!item) skip();
    const res = await api(`/crm/pipeline/${item!.id}/stage`, {
      method: "PUT",
      body: { stage: "won" },
    });
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error");
  });

  it("terminal stages (won/lost) reject further moves", async ({ skip }) => {
    if (!live) skip();
    const list = await api<{ id: string; stage: string }[]>("/crm/pipeline");
    const won = list.body?.find((i) => i.stage === "won" || i.stage === "lost");
    if (!won) skip();
    const res = await api(`/crm/pipeline/${won!.id}/stage`, {
      method: "PUT",
      body: { stage: "lead" },
    });
    expect(res.status).toBe(409);
  });

  it("GET /crm/stats returns stage counts and conversion", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{
      byStage: Record<string, number>;
      winRatePct: number;
    }>("/crm/stats");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("byStage");
    expect(typeof res.body.winRatePct).toBe("number");
  });
});
