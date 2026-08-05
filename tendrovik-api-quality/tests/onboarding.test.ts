import { describe, it, expect, beforeAll } from "vitest";
import { api, serverIsReachable } from "../src/client.js";

describe("Onboarding / AI survey", () => {
  let live: boolean;
  beforeAll(async () => {
    live = await serverIsReachable();
  });

  it("GET /onboarding/survey returns question list", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{ questions: unknown[] }>("/onboarding/survey");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("questions");
    expect(Array.isArray(res.body.questions)).toBe(true);
  });

  it("POST /onboarding/survey creates company profile", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{ id: string; legalName?: string }>("/onboarding/survey", {
      method: "POST",
      body: {
        organizationName: "ООО ТестКомпания",
        inn: "7707083893",
        answers: { q1: "строительство", q2: "Москва" },
      },
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
  });

  it("POST /onboarding/survey rejects empty payload", async ({ skip }) => {
    if (!live) skip();
    const res = await api("/onboarding/survey", {
      method: "POST",
      body: {},
    });
    expect([400, 422]).toContain(res.status);
  });
});
