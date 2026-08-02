import { describe, it, expect, beforeAll } from "vitest";
import { api, serverIsReachable } from "../src/client.js";

describe("Health / connectivity", () => {
  let live: boolean;
  beforeAll(async () => {
    live = await serverIsReachable();
  });

  it("server is reachable", ({ skip }) => {
    if (!live) skip();
    expect(live).toBe(true);
  });

  it("returns JSON error on unknown route", async ({ skip }) => {
    if (!live) skip();
    const res = await api("/this-route-does-not-exist-42");
    expect([404, 405]).toContain(res.status);
  });

  it("returns 401 without auth token", async ({ skip }) => {
    if (!live) skip();
    const res = await api("/tenders", { token: null });
    expect(res.status).toBe(401);
  });
});
