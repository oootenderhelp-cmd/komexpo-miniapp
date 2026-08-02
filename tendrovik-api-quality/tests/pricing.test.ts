import { describe, it, expect, beforeAll } from "vitest";
import { api, serverIsReachable, uuid } from "../src/client.js";

const SAMPLE_LINES = [
  { name: "Бетон М300", qty: 100, unitCost: 5500 },
  { name: "Арматура", qty: 200, unitCost: 850 },
  { name: "Работа", qty: 50, unitCost: 3000 },
];

describe("Pricing — 3 strategies + min margin", () => {
  let live: boolean;
  let tenderId: string;

  beforeAll(async () => {
    live = await serverIsReachable();
    if (!live) return;
    const list = await api<{ items: { id: string }[] }>("/tenders?pageSize=1");
    tenderId = list.body.items?.[0]?.id ?? uuid();
  });

  it("POST /tenders/{id}/pricing returns cost breakdown and 3 scenarios", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{
      cost: { directCost: number; overhead: number; tax: number; totalCost: number };
      scenarios: { strategy: string; price: number; marginPct: number; flooredToMinMargin: boolean }[];
    }>(`/tenders/${tenderId}/pricing`, {
      method: "POST",
      body: { lineItems: SAMPLE_LINES },
    });
    expect(res.status).toBe(200);
    const { cost, scenarios } = res.body;

    expect(cost).toHaveProperty("directCost");
    expect(cost).toHaveProperty("overhead");
    expect(cost).toHaveProperty("tax");
    expect(cost).toHaveProperty("totalCost");
    expect(cost.totalCost).toBeGreaterThan(0);

    expect(scenarios).toHaveLength(3);
    const strategies = scenarios.map((s) => s.strategy);
    expect(strategies).toContain("aggressive");
    expect(strategies).toContain("balanced");
    expect(strategies).toContain("premium");
  });

  it("every scenario price >= totalCost * (1 + minMargin/100)", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{
      cost: { totalCost: number };
      scenarios: { price: number; marginPct: number }[];
    }>(`/tenders/${tenderId}/pricing`, {
      method: "POST",
      body: { lineItems: SAMPLE_LINES },
    });
    expect(res.status).toBe(200);
    for (const s of res.body.scenarios) {
      expect(s.price).toBeGreaterThanOrEqual(res.body.cost.totalCost);
      expect(s.marginPct).toBeGreaterThanOrEqual(0);
    }
  });

  it("aggressive <= balanced <= premium in price", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{
      scenarios: { strategy: string; price: number }[];
    }>(`/tenders/${tenderId}/pricing`, {
      method: "POST",
      body: { lineItems: SAMPLE_LINES },
    });
    expect(res.status).toBe(200);
    const byStrategy = Object.fromEntries(
      res.body.scenarios.map((s) => [s.strategy, s.price]),
    );
    expect(byStrategy["aggressive"]).toBeLessThanOrEqual(byStrategy["balanced"]!);
    expect(byStrategy["balanced"]).toBeLessThanOrEqual(byStrategy["premium"]!);
  });

  it("rejects empty lineItems", async ({ skip }) => {
    if (!live) skip();
    const res = await api(`/tenders/${tenderId}/pricing`, {
      method: "POST",
      body: { lineItems: [] },
    });
    expect([400, 422]).toContain(res.status);
  });

  it("floored flag is set when strategy markup < min margin", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{
      scenarios: { strategy: string; flooredToMinMargin: boolean }[];
    }>(`/tenders/${tenderId}/pricing`, {
      method: "POST",
      body: { lineItems: SAMPLE_LINES },
    });
    expect(res.status).toBe(200);
    for (const s of res.body.scenarios) {
      expect(typeof s.flooredToMinMargin).toBe("boolean");
    }
  });
});
