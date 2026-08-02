import { describe, it, expect, beforeAll } from "vitest";
import { api, serverIsReachable, uuid } from "../src/client.js";

const ROLES = ["estimator", "lawyer", "tender_specialist", "owner"] as const;

describe("Approvals — full chain + submission gate", () => {
  let live: boolean;
  let tenderId: string;

  beforeAll(async () => {
    live = await serverIsReachable();
    if (!live) return;
    const list = await api<{ items: { id: string }[] }>("/tenders?pageSize=1");
    tenderId = list.body.items?.[0]?.id ?? uuid();
  });

  it("POST creates approval request with 4 steps", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{
      id: string;
      steps: { role: string; status: string }[];
    }>(`/tenders/${tenderId}/approval-requests`, { method: "POST" });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.steps).toHaveLength(4);
    const roles = res.body.steps.map((s) => s.role);
    for (const r of ROLES) expect(roles).toContain(r);
  });

  it("authorize-submission returns 409 with no approvals", async ({ skip }) => {
    if (!live) skip();
    const create = await api<{ id: string }>(`/tenders/${tenderId}/approval-requests`, {
      method: "POST",
    });
    const reqId = create.body.id;
    const res = await api<{ allowed: boolean; missing: string[] }>(
      `/approval-requests/${reqId}/authorize-submission`,
      { method: "POST" },
    );
    expect(res.status).toBe(409);
    expect(res.body.allowed).toBe(false);
    expect(res.body.missing.length).toBeGreaterThan(0);
  });

  it("partial approvals still block submission", async ({ skip }) => {
    if (!live) skip();
    const create = await api<{ id: string }>(`/tenders/${tenderId}/approval-requests`, {
      method: "POST",
    });
    const reqId = create.body.id;
    await api(`/approval-requests/${reqId}/steps/estimator`, {
      method: "POST",
      body: { status: "approved" },
    });
    await api(`/approval-requests/${reqId}/steps/lawyer`, {
      method: "POST",
      body: { status: "approved" },
    });
    const res = await api<{ allowed: boolean; missing: string[] }>(
      `/approval-requests/${reqId}/authorize-submission`,
      { method: "POST" },
    );
    expect(res.status).toBe(409);
    expect(res.body.allowed).toBe(false);
    expect(res.body.missing).toContain("tender_specialist");
    expect(res.body.missing).toContain("owner");
  });

  it("rejection blocks submission even if others approved", async ({ skip }) => {
    if (!live) skip();
    const create = await api<{ id: string }>(`/tenders/${tenderId}/approval-requests`, {
      method: "POST",
    });
    const reqId = create.body.id;
    for (const role of ["estimator", "tender_specialist", "owner"]) {
      await api(`/approval-requests/${reqId}/steps/${role}`, {
        method: "POST",
        body: { status: "approved" },
      });
    }
    await api(`/approval-requests/${reqId}/steps/lawyer`, {
      method: "POST",
      body: { status: "rejected", comment: "Нет" },
    });
    const res = await api<{ allowed: boolean; rejected: string[] }>(
      `/approval-requests/${reqId}/authorize-submission`,
      { method: "POST" },
    );
    expect(res.status).toBe(409);
    expect(res.body.allowed).toBe(false);
    expect(res.body.rejected).toContain("lawyer");
  });

  it("all 4 approvals unlock submission (200)", async ({ skip }) => {
    if (!live) skip();
    const create = await api<{ id: string }>(`/tenders/${tenderId}/approval-requests`, {
      method: "POST",
    });
    const reqId = create.body.id;
    for (const role of ROLES) {
      const step = await api(`/approval-requests/${reqId}/steps/${role}`, {
        method: "POST",
        body: { status: "approved" },
      });
      expect(step.status).toBe(200);
    }
    const res = await api<{ allowed: boolean; note: string }>(
      `/approval-requests/${reqId}/authorize-submission`,
      { method: "POST" },
    );
    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(true);
    expect(res.body.note).toBeTruthy();
  });

  it("submission gate note mentions human confirmation", async ({ skip }) => {
    if (!live) skip();
    const create = await api<{ id: string }>(`/tenders/${tenderId}/approval-requests`, {
      method: "POST",
    });
    const reqId = create.body.id;
    for (const role of ROLES) {
      await api(`/approval-requests/${reqId}/steps/${role}`, {
        method: "POST",
        body: { status: "approved" },
      });
    }
    const res = await api<{ note: string }>(
      `/approval-requests/${reqId}/authorize-submission`,
      { method: "POST" },
    );
    expect(res.body.note?.toLowerCase()).toMatch(/подтвержд|человек|confirm|manual|human/i);
  });

  it("GET /approval-requests/{id} returns request status", async ({ skip }) => {
    if (!live) skip();
    const create = await api<{ id: string }>(`/tenders/${tenderId}/approval-requests`, {
      method: "POST",
    });
    const res = await api<{ id: string; steps: unknown[] }>(
      `/approval-requests/${create.body.id}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(create.body.id);
    expect(Array.isArray(res.body.steps)).toBe(true);
  });
});
