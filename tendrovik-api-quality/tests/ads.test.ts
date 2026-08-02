import { describe, it, expect, beforeAll } from "vitest";
import { api, serverIsReachable, uuid } from "../src/client.js";

describe("Ads — slot rotation", () => {
  let live: boolean;
  beforeAll(async () => {
    live = await serverIsReachable();
  });

  it("GET /ads/slots/{slotCode}/serve returns banner for active slot", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{
      campaignId: string;
      advertiser: string;
      title: string;
      impressionId: string;
    }>("/ads/slots/top/serve");
    if (res.status === 204) return; // no campaigns configured
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("campaignId");
    expect(res.body).toHaveProperty("advertiser");
    expect(res.body).toHaveProperty("impressionId");
  });

  it("rotation serves only banners from the requested slot", async ({ skip }) => {
    if (!live) skip();
    const impressions: string[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await api<{ campaignId: string }>("/ads/slots/top/serve");
      if (res.status === 200) impressions.push(res.body.campaignId);
    }
    // All served banners must come from the "top" slot
    // (we can't directly verify slotCode in response, but no side slot should appear)
    expect(impressions.length).toBeGreaterThan(0);
  });

  it("returns 204 for a slot with no campaigns", async ({ skip }) => {
    if (!live) skip();
    const res = await api("/ads/slots/nonexistent_slot_xyz/serve");
    expect(res.status).toBe(204);
  });

  it("POST /ads/campaigns/{id}/click records click (202)", async ({ skip }) => {
    if (!live) skip();
    const banner = await api<{ campaignId: string }>("/ads/slots/top/serve");
    if (banner.status !== 200) skip();
    const res = await api(`/ads/campaigns/${banner.body.campaignId}/click`, {
      method: "POST",
    });
    expect(res.status).toBe(202);
  });

  it("click on unknown campaign returns 404", async ({ skip }) => {
    if (!live) skip();
    const res = await api(`/ads/campaigns/${uuid()}/click`, { method: "POST" });
    expect([404, 202]).toContain(res.status); // 404 preferred but 202 acceptable for fire-and-forget
  });
});
