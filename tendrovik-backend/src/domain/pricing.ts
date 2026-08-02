/**
 * Cost & price calculation.
 *
 * Builds a total cost from itemized lines + overhead + tax, then produces three
 * price scenarios (aggressive / balanced / premium). The core invariant enforced
 * here: NO scenario may price below the configured minimum margin. If a requested
 * markup would breach it, the price is floored to the min-margin price.
 */

export type PriceStrategy = "aggressive" | "balanced" | "premium";
export const STRATEGIES: PriceStrategy[] = ["aggressive", "balanced", "premium"];

export interface CostLine {
  name: string;
  qty: number;
  unitCost: number;
}

export interface PricingRule {
  minMarginPct: number; // floor margin over total cost
  overheadPct: number; // added on top of direct cost
  taxPct: number; // informational; included in cost total
  strategyMarkupPct: Record<PriceStrategy, number>;
}

export const DEFAULT_PRICING_RULE: PricingRule = {
  minMarginPct: 12,
  overheadPct: 10,
  taxPct: 20,
  strategyMarkupPct: { aggressive: 5, balanced: 15, premium: 30 },
};

export interface CostBreakdown {
  directCost: number;
  overhead: number;
  tax: number;
  totalCost: number;
}

export interface PriceScenario {
  strategy: PriceStrategy;
  price: number;
  marginPct: number;
  flooredToMinMargin: boolean;
  winProbabilityPct: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** direct = Σ qty·unitCost; overhead = direct·overheadPct; tax = (direct+overhead)·taxPct. */
export function calcCost(lines: CostLine[], rule: PricingRule): CostBreakdown {
  const directCost = round2(lines.reduce((s, l) => s + l.qty * l.unitCost, 0));
  const overhead = round2(directCost * (rule.overheadPct / 100));
  const taxable = directCost + overhead;
  const tax = round2(taxable * (rule.taxPct / 100));
  const totalCost = round2(taxable + tax);
  return { directCost, overhead, tax, totalCost };
}

/** Price implied by a given margin over total cost. */
export function priceForMargin(totalCost: number, marginPct: number): number {
  return round2(totalCost * (1 + marginPct / 100));
}

/** Effective margin percentage of a price over a cost. */
export function marginOf(price: number, totalCost: number): number {
  if (totalCost <= 0) return 0;
  return round2(((price - totalCost) / totalCost) * 100);
}

export class MinMarginViolationError extends Error {
  constructor(
    readonly price: number,
    readonly totalCost: number,
    readonly minMarginPct: number,
  ) {
    super(
      `Цена ${price} нарушает минимальную маржу ${minMarginPct}% (себестоимость ${totalCost}).`,
    );
    this.name = "MinMarginViolationError";
  }
}

/** Assert a price respects the min margin; throws otherwise. */
export function assertMinMargin(price: number, totalCost: number, minMarginPct: number): void {
  const floor = priceForMargin(totalCost, minMarginPct);
  // small epsilon tolerance for rounding
  if (price + 0.005 < floor) {
    throw new MinMarginViolationError(price, totalCost, minMarginPct);
  }
}

/**
 * Build the three price scenarios. Each strategy applies its markup, but the
 * price can never drop below the min-margin floor. Win probability is a simple
 * heuristic: lower price → higher chance to win.
 */
export function buildScenarios(cost: CostBreakdown, rule: PricingRule): PriceScenario[] {
  const floorPrice = priceForMargin(cost.totalCost, rule.minMarginPct);
  return STRATEGIES.map((strategy) => {
    const markup = rule.strategyMarkupPct[strategy];
    const rawPrice = priceForMargin(cost.totalCost, markup);
    const floored = rawPrice < floorPrice;
    const price = floored ? floorPrice : rawPrice;
    const marginPct = marginOf(price, cost.totalCost);
    // Heuristic: aggressive ≈ high win chance, premium ≈ lower.
    const base = { aggressive: 70, balanced: 50, premium: 32 }[strategy];
    const winProbabilityPct = Math.max(5, Math.min(95, base));
    return { strategy, price, marginPct, flooredToMinMargin: floored, winProbabilityPct };
  });
}

/** One-shot helper: lines + rule → cost + three guaranteed-safe scenarios. */
export function priceTender(
  lines: CostLine[],
  rule: PricingRule = DEFAULT_PRICING_RULE,
): { cost: CostBreakdown; scenarios: PriceScenario[] } {
  const cost = calcCost(lines, rule);
  const scenarios = buildScenarios(cost, rule);
  // Defensive: guarantee the invariant even if rule config is odd.
  for (const s of scenarios) assertMinMargin(s.price, cost.totalCost, rule.minMarginPct);
  return { cost, scenarios };
}
