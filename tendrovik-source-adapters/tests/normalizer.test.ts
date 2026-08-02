import { describe, it, expect } from "vitest";
import { normalize, deduplicate, dedupeKey } from "../src/normalizer/index.js";
import {
  FIXTURE_EIS,
  FIXTURE_B2B_CENTER,
  FIXTURE_SBERBANK_AST,
} from "../src/fixtures/index.js";
import type { NormalizedTender } from "../src/interfaces/index.js";

describe("Normalizer", () => {
  it("normalizes EIS fixture", () => {
    const t = normalize(FIXTURE_EIS);
    expect(t.sourceCode).toBe("eis");
    expect(t.sourceName).toContain("ЕИС");
    expect(t.sourceUrl).toBe("https://zakupki.gov.ru");
    expect(t.externalId).toBe("0373100011924000042");
    expect(t.registryNumber).toBe("0373100011924000042");
    expect(t.title).toBe("Капитальный ремонт кровли здания школы №15");
    expect(t.customerName).toBe("ГБОУ Школа №15");
    expect(t.customerInn).toBe("7707083893");
    expect(t.region).toBe("Москва");
    expect(t.law).toBe("44-ФЗ");
    expect(t.segments).toContain("federal_44fz");
    expect(t.startPrice).toBe(12_500_000);
    expect(t.currency).toBe("RUB");
    expect(t.documents).toHaveLength(2);
    expect(t.documents[0]!.title).toBe("ТЗ_кровля.pdf");
    expect(t.documents[0]!.uri).toMatch(/^https:\/\//);
    expect(t.lotCount).toBe(2);
    expect(t.rawPayload).toBe(FIXTURE_EIS);
  });

  it("normalizes B2B-Center fixture", () => {
    const t = normalize(FIXTURE_B2B_CENTER);
    expect(t.sourceCode).toBe("b2b_center");
    expect(t.sourceName).toBe("B2B-Center");
    expect(t.sourceUrl).toBe("https://www.b2b-center.ru");
    expect(t.externalId).toBe("B2B-2026-88431");
    expect(t.title).toContain("серверного оборудования");
    expect(t.customerName).toContain("ЦОД-Инвест");
    expect(t.segments).toContain("commercial");
    expect(t.startPrice).toBe(8_750_000);
    expect(t.documents).toHaveLength(2);
    expect(t.rawPayload).toBe(FIXTURE_B2B_CENTER);
  });

  it("normalizes Sberbank-AST fixture", () => {
    const t = normalize(FIXTURE_SBERBANK_AST);
    expect(t.sourceCode).toBe("sberbank_ast");
    expect(t.sourceName).toBe("Сбербанк-АСТ");
    expect(t.sourceUrl).toBe("https://www.sberbank-ast.ru");
    expect(t.externalId).toBe("SBAST-44-2026-991204");
    expect(t.title).toContain("вентиляции");
    expect(t.customerInn).toBe("6316050580");
    expect(t.region).toBe("Самара");
    expect(t.startPrice).toBe(5_200_000);
    expect(t.documents).toHaveLength(2);
    expect(t.documents[0]!.mimeType).toBe("application/pdf");
    expect(t.documents[0]!.sizeBytes).toBe(5_100_000);
    expect(t.rawPayload).toBe(FIXTURE_SBERBANK_AST);
  });

  it("all 3 formats produce valid NormalizedTender with required fields", () => {
    const tenders = [FIXTURE_EIS, FIXTURE_B2B_CENTER, FIXTURE_SBERBANK_AST].map(normalize);
    for (const t of tenders) {
      expect(t.sourceCode).toBeTruthy();
      expect(t.sourceName).toBeTruthy();
      expect(t.sourceUrl).toMatch(/^https?:\/\//);
      expect(t.externalId).toBeTruthy();
      expect(t.title).toBeTruthy();
      expect(t.customerName).toBeTruthy();
      expect(t.currency).toBeTruthy();
      expect(Array.isArray(t.documents)).toBe(true);
      expect(Array.isArray(t.segments)).toBe(true);
      expect(t.segments.length).toBeGreaterThan(0);
    }
  });

  it("preserves rawPayload as original object reference", () => {
    const t = normalize(FIXTURE_EIS);
    expect(t.rawPayload).toBe(FIXTURE_EIS);
  });

  it("documents have title and uri", () => {
    const tenders = [FIXTURE_EIS, FIXTURE_B2B_CENTER, FIXTURE_SBERBANK_AST].map(normalize);
    for (const t of tenders) {
      for (const d of t.documents) {
        expect(d.title).toBeTruthy();
        expect(d.uri).toMatch(/^https?:\/\//);
      }
    }
  });
});

describe("Deduplication", () => {
  it("dedupeKey is sourceCode:externalId", () => {
    const t = normalize(FIXTURE_EIS);
    expect(dedupeKey(t)).toBe("eis:0373100011924000042");
  });

  it("removes duplicates with same sourceCode+externalId", () => {
    const t1 = normalize(FIXTURE_EIS);
    const t2 = { ...normalize(FIXTURE_EIS), title: "Modified title" };
    const t3 = normalize(FIXTURE_B2B_CENTER);
    const result = deduplicate([t1, t2, t3]);
    expect(result).toHaveLength(2);
    expect(result[0]!.title).toBe(t1.title);
  });

  it("keeps first occurrence on duplicate", () => {
    const first: NormalizedTender = { ...normalize(FIXTURE_EIS), title: "First" };
    const second: NormalizedTender = { ...normalize(FIXTURE_EIS), title: "Second" };
    const result = deduplicate([first, second]);
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe("First");
  });

  it("different sources with same externalId are NOT duplicates", () => {
    const t1: NormalizedTender = { ...normalize(FIXTURE_EIS), sourceCode: "eis" };
    const t2: NormalizedTender = { ...normalize(FIXTURE_EIS), sourceCode: "kontur_zakupki" };
    const result = deduplicate([t1, t2]);
    expect(result).toHaveLength(2);
  });

  it("empty array returns empty", () => {
    expect(deduplicate([])).toEqual([]);
  });
});
