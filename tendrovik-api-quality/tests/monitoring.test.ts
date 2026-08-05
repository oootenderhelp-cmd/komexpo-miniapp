import { describe, it, expect, beforeAll } from "vitest";
import { api, serverIsReachable } from "../src/client.js";

describe("Monitoring rules & notifications", () => {
  let live: boolean;
  beforeAll(async () => {
    live = await serverIsReachable();
  });

  it("GET /monitoring/rules returns array", async ({ skip }) => {
    if (!live) skip();
    const res = await api<unknown[]>("/monitoring/rules");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("POST /monitoring/rules creates rule", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{
      id: string;
      name: string;
      isActive: boolean;
      deadlineWarningDays: number;
    }>("/monitoring/rules", {
      method: "POST",
      body: {
        name: "Срок подачи < 3 дней",
        filter: { region: "Москва" },
        deadlineWarningDays: 3,
      },
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.name).toBe("Срок подачи < 3 дней");
    expect(res.body.isActive).toBe(true);
  });

  it("POST /monitoring/rules rejects missing name", async ({ skip }) => {
    if (!live) skip();
    const res = await api("/monitoring/rules", {
      method: "POST",
      body: { filter: {} },
    });
    expect([400, 422]).toContain(res.status);
  });

  it("GET /notifications returns array with status field", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{ id: string; channel: string; status: string }[]>("/notifications");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const validChannels = ["email", "in_app", "telegram", "webhook"];
    const validStatuses = ["queued", "sent", "failed", "read"];
    for (const n of res.body) {
      expect(validChannels).toContain(n.channel);
      expect(validStatuses).toContain(n.status);
    }
  });
});
