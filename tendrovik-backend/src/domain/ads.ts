/**
 * Advertising banner rotation.
 *
 * Weighted rotation within a slot. Two selectors are provided:
 *  - `rotateWeighted`: deterministic weighted round-robin driven by an
 *    impression counter (great for even distribution and for tests).
 *  - `pickWeightedRandom`: weighted random using an injectable RNG.
 * Only `active` campaigns inside their date window are eligible.
 */
import type { AuditSink } from "./audit.js";

export interface AdCampaign {
  id: string;
  slotCode: string;
  advertiser: string;
  title: string;
  weight: number;
  status: "draft" | "active" | "paused" | "archived";
  startsAt?: Date | null;
  endsAt?: Date | null;
}

export function eligibleCampaigns(campaigns: AdCampaign[], now: Date = new Date()): AdCampaign[] {
  return campaigns.filter(
    (c) =>
      c.status === "active" &&
      c.weight > 0 &&
      (!c.startsAt || c.startsAt <= now) &&
      (!c.endsAt || c.endsAt >= now),
  );
}

/**
 * Deterministic weighted rotation. Expands campaigns by weight into a virtual
 * ring and picks the slot at `counter % ringLength`. Successive counters walk
 * every impression slot, so over a full cycle each campaign is shown exactly
 * `weight` times.
 */
export function rotateWeighted(
  campaigns: AdCampaign[],
  counter: number,
  now: Date = new Date(),
): AdCampaign | null {
  const pool = eligibleCampaigns(campaigns, now);
  if (pool.length === 0) return null;
  const ring: AdCampaign[] = [];
  for (const c of pool) for (let i = 0; i < c.weight; i++) ring.push(c);
  const idx = ((counter % ring.length) + ring.length) % ring.length;
  return ring[idx] ?? null;
}

/** Weighted random pick. `rng` returns a float in [0,1); defaults to Math.random. */
export function pickWeightedRandom(
  campaigns: AdCampaign[],
  rng: () => number = Math.random,
  now: Date = new Date(),
): AdCampaign | null {
  const pool = eligibleCampaigns(campaigns, now);
  if (pool.length === 0) return null;
  const total = pool.reduce((s, c) => s + c.weight, 0);
  let r = rng() * total;
  for (const c of pool) {
    r -= c.weight;
    if (r < 0) return c;
  }
  return pool[pool.length - 1] ?? null;
}

/**
 * Stateful rotator for a single slot. Increments its counter on every serve and
 * records an impression audit entry.
 */
export class SlotRotator {
  private counter = 0;
  constructor(
    readonly slotCode: string,
    private readonly audit?: AuditSink,
  ) {}

  async serve(campaigns: AdCampaign[], now: Date = new Date()): Promise<AdCampaign | null> {
    const picked = rotateWeighted(campaigns, this.counter, now);
    this.counter += 1;
    if (picked && this.audit) {
      await this.audit.record({
        action: "ad.impression.served",
        entityType: "ad_campaign",
        entityId: picked.id,
        metadata: { slotCode: this.slotCode, advertiser: picked.advertiser },
      });
    }
    return picked;
  }
}
