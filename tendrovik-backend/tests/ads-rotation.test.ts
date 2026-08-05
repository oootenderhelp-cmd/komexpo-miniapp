import { describe, it, expect } from "vitest";
import {
  rotateWeighted,
  pickWeightedRandom,
  eligibleCampaigns,
  SlotRotator,
  type AdCampaign,
} from "../src/domain/ads.js";
import { InMemoryAuditSink } from "../src/domain/audit.js";

const campaigns: AdCampaign[] = [
  { id: "komexpo", slotCode: "top", advertiser: "KomExpo", title: "KomExpo", weight: 3, status: "active" },
  { id: "courses", slotCode: "top", advertiser: "Курсы", title: "Курсы", weight: 1, status: "active" },
  { id: "paused", slotCode: "top", advertiser: "X", title: "X", weight: 5, status: "paused" },
];

describe("Ad banner rotation", () => {
  it("excludes non-active and out-of-window campaigns", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const withWindow: AdCampaign[] = [
      ...campaigns,
      { id: "future", slotCode: "top", advertiser: "F", title: "F", weight: 1, status: "active", startsAt: new Date("2027-01-01") },
      { id: "past", slotCode: "top", advertiser: "P", title: "P", weight: 1, status: "active", endsAt: new Date("2025-01-01") },
    ];
    const ids = eligibleCampaigns(withWindow, now).map((c) => c.id);
    expect(ids).toContain("komexpo");
    expect(ids).toContain("courses");
    expect(ids).not.toContain("paused");
    expect(ids).not.toContain("future");
    expect(ids).not.toContain("past");
  });

  it("rotates deterministically and honors weights over a full cycle", () => {
    // ring length = 3 (KomExpo) + 1 (Курсы) = 4
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) seen.push(rotateWeighted(campaigns, i)!.advertiser);
    const komexpoCount = seen.filter((a) => a === "KomExpo").length;
    const coursesCount = seen.filter((a) => a === "Курсы").length;
    expect(komexpoCount).toBe(3);
    expect(coursesCount).toBe(1);
  });

  it("cycles back to the start after a full ring", () => {
    expect(rotateWeighted(campaigns, 0)!.id).toBe(rotateWeighted(campaigns, 4)!.id);
  });

  it("returns null when no campaign is eligible", () => {
    const none: AdCampaign[] = [{ id: "z", slotCode: "top", advertiser: "Z", title: "Z", weight: 0, status: "active" }];
    expect(rotateWeighted(none, 0)).toBeNull();
  });

  it("weighted random respects weights with a seeded RNG", () => {
    // rng near 0 picks the first (KomExpo, weight 3); rng near 1 picks last eligible
    expect(pickWeightedRandom(campaigns, () => 0.01)!.advertiser).toBe("KomExpo");
    expect(pickWeightedRandom(campaigns, () => 0.99)!.advertiser).toBe("Курсы");
  });

  it("SlotRotator serves only campaigns from its own slot", async () => {
    const mixed: AdCampaign[] = [
      { id: "top-a", slotCode: "top", advertiser: "KomExpo", title: "t", weight: 1, status: "active" },
      { id: "side-a", slotCode: "side", advertiser: "Other", title: "s", weight: 5, status: "active" },
    ];
    const rotator = new SlotRotator("top");
    for (let i = 0; i < 3; i++) {
      const c = await rotator.serve(mixed);
      expect(c?.slotCode).toBe("top");
      expect(c?.advertiser).toBe("KomExpo");
    }
  });

  it("SlotRotator advances counter and audits each impression", async () => {
    const audit = new InMemoryAuditSink();
    const rotator = new SlotRotator("top", audit);
    const shown: string[] = [];
    for (let i = 0; i < 4; i++) shown.push((await rotator.serve(campaigns))!.advertiser);
    expect(shown.filter((a) => a === "KomExpo")).toHaveLength(3);
    expect(audit.findByAction("ad.impression.served")).toHaveLength(4);
  });
});
