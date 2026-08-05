import { describe, it, expect, beforeAll } from "vitest";
import { api, serverIsReachable } from "../src/client.js";

const INTEGRATION_KINDS = ["bitrix24", "email", "procurement_platform", "openai"] as const;

describe("Integrations — stub statuses", () => {
  let live: boolean;
  beforeAll(async () => {
    live = await serverIsReachable();
  });

  it("GET /integrations returns all integration kinds", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{ kind: string; status: string }[]>("/integrations");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const kinds = res.body.map((i) => i.kind);
    for (const k of INTEGRATION_KINDS) {
      expect(kinds).toContain(k);
    }
  });

  it("each integration has valid status enum", async ({ skip }) => {
    if (!live) skip();
    const validStatuses = ["not_configured", "configured", "connected", "error", "disabled"];
    const res = await api<{ kind: string; status: string }[]>("/integrations");
    for (const i of res.body) {
      expect(validStatuses).toContain(i.status);
    }
  });

  for (const kind of INTEGRATION_KINDS) {
    it(`GET /integrations/${kind}/status returns integration detail`, async ({ skip }) => {
      if (!live) skip();
      const res = await api<{ kind: string; title: string; status: string }>(
        `/integrations/${kind}/status`,
      );
      expect(res.status).toBe(200);
      expect(res.body.kind).toBe(kind);
      expect(res.body).toHaveProperty("title");
      expect(res.body).toHaveProperty("status");
    });
  }
});
