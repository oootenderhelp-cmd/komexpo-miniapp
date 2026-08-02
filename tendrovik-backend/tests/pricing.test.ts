import { describe, it, expect } from "vitest";
import {
  calcCost,
  buildScenarios,
  priceTender,
  assertMinMargin,
  marginOf,
  MinMarginViolationError,
  DEFAULT_PRICING_RULE,
  type PricingRule,
} from "../src/domain/pricing.js";

describe("Pricing — never below minimum margin", () => {
  const rule: PricingRule = { ...DEFAULT_PRICING_RULE, minMarginPct: 12 };

  it("computes cost breakdown deterministically", () => {
    const cost = calcCost([{ name: "x", qty: 10, unitCost: 100 }], rule);
    // direct=1000, overhead=100, tax=(1100*0.2)=220, total=1320
    expect(cost.directCost).toBe(1000);
    expect(cost.overhead).toBe(100);
    expect(cost.tax).toBe(220);
    expect(cost.totalCost).toBe(1320);
  });

  it("every scenario respects the minimum margin", () => {
    const { cost, scenarios } = priceTender([{ name: "x", qty: 1, unitCost: 100000 }], rule);
    for (const s of scenarios) {
      expect(marginOf(s.price, cost.totalCost)).toBeGreaterThanOrEqual(rule.minMarginPct - 0.01);
    }
  });

  it("floors an aggressive strategy up to the min-margin price", () => {
    // aggressive markup below min margin must be floored
    const lowRule: PricingRule = {
      ...rule,
      minMarginPct: 20,
      strategyMarkupPct: { aggressive: 5, balanced: 25, premium: 40 },
    };
    const cost = calcCost([{ name: "x", qty: 1, unitCost: 1000 }], lowRule);
    const scenarios = buildScenarios(cost, lowRule);
    const aggressive = scenarios.find((s) => s.strategy === "aggressive")!;
    expect(aggressive.flooredToMinMargin).toBe(true);
    expect(aggressive.marginPct).toBeGreaterThanOrEqual(20 - 0.01);
  });

  it("produces exactly three strategies", () => {
    const { scenarios } = priceTender([{ name: "x", qty: 1, unitCost: 500 }], rule);
    expect(scenarios.map((s) => s.strategy).sort()).toEqual(["aggressive", "balanced", "premium"]);
  });

  it("assertMinMargin throws for an underpriced bid", () => {
    const totalCost = 1000;
    // price implying only 5% margin, below 12% floor
    expect(() => assertMinMargin(1050, totalCost, 12)).toThrow(MinMarginViolationError);
  });

  it("assertMinMargin passes exactly at the floor", () => {
    // 12% over 1000 = 1120
    expect(() => assertMinMargin(1120, 1000, 12)).not.toThrow();
  });
});
