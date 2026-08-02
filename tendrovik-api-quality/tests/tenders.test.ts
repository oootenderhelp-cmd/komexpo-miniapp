import { describe, it, expect, beforeAll } from "vitest";
import { api, serverIsReachable, uuid } from "../src/client.js";

describe("Tenders", () => {
  let live: boolean;
  beforeAll(async () => {
    live = await serverIsReachable();
  });

  it("GET /tenders returns paginated list", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{ items: unknown[]; page: number; total: number }>("/tenders");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("total");
  });

  it("GET /tenders supports query filters", async ({ skip }) => {
    if (!live) skip();
    const res = await api("/tenders?q=строительство&law=44-ФЗ&page=1&pageSize=5");
    expect(res.status).toBe(200);
  });

  it("POST /tenders/search enqueues ingest job", async ({ skip }) => {
    if (!live) skip();
    const res = await api<{ jobId: string; kind: string }>("/tenders/search", {
      method: "POST",
      body: { keywords: ["строительство"], regions: ["Москва"], limit: 10 },
    });
    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty("jobId");
    expect(res.body.kind).toBe("ingest");
  });

  it("GET /tenders/{tenderId} returns 404 for missing", async ({ skip }) => {
    if (!live) skip();
    const res = await api(`/tenders/${uuid()}`);
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /tenders/{tenderId} returns tender card with lots and documents", async ({ skip }) => {
    if (!live) skip();
    const list = await api<{ items: { id: string }[] }>("/tenders?pageSize=1");
    if (!list.body.items?.length) skip();
    const id = list.body.items[0]!.id;
    const res = await api<{
      id: string;
      title: string;
      lots?: unknown[];
      documents?: unknown[];
      winnerHistory?: unknown[];
    }>(`/tenders/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
    expect(res.body).toHaveProperty("title");
  });
});
