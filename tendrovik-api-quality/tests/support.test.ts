import { describe, it, expect, beforeAll } from "vitest";
import { api, serverIsReachable } from "../src/client.js";

describe("AI support chat & tickets", () => {
  let live: boolean;
  beforeAll(async () => {
    live = await serverIsReachable();
  });

  it("POST /support/chat returns assistant reply", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{
      conversationId: string;
      reply: string;
      canEscalate: boolean;
    }>("/support/chat", {
      method: "POST",
      body: { message: "Как подать заявку на тендер?" },
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("conversationId");
    expect(typeof res.body.reply).toBe("string");
    expect(res.body.reply.length).toBeGreaterThan(0);
    expect(typeof res.body.canEscalate).toBe("boolean");
  });

  it("POST /support/chat with conversationId continues thread", async ({ skip }) => {
    if (!live) skip();
    const first = await api<{ conversationId: string }>("/support/chat", {
      method: "POST",
      body: { message: "Привет" },
    });
    const second = await api<{ conversationId: string }>("/support/chat", {
      method: "POST",
      body: {
        conversationId: first.body.conversationId,
        message: "Расскажи подробнее",
      },
    });
    expect(second.status).toBe(200);
    expect(second.body.conversationId).toBe(first.body.conversationId);
  });

  it("POST /support/tickets creates ticket", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{
      id: string;
      subject: string;
      status: string;
      priority: string;
    }>("/support/tickets", {
      method: "POST",
      body: { subject: "Не загружается документация", priority: "high" },
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.status).toBe("open");
    expect(res.body.priority).toBe("high");
  });

  it("POST /support/tickets rejects missing subject", async ({ skip }) => {
    if (!live) skip();
    const res = await api("/support/tickets", {
      method: "POST",
      body: { priority: "low" },
    });
    expect([400, 422]).toContain(res.status);
  });
});
