import { describe, it, expect } from "vitest";
import {
  SOURCE_REGISTRY,
  getSource,
  listSources,
  sourcesBySegment,
  sourcesRequiringKep,
  sourcesWithPublicSearch,
} from "../src/registry/sources.js";

describe("Source registry", () => {
  it("contains all 15 sources", () => {
    expect(SOURCE_REGISTRY).toHaveLength(15);
  });

  const EXPECTED_CODES = [
    "eis", "eruz", "sberbank_ast", "rts_tender", "roseltorg",
    "etp_gpb", "tektorg", "rad_lot_online", "zakazrf", "nep",
    "b2b_center", "tenderpro", "fabrikant", "otc", "kontur_zakupki",
  ];

  it("has all expected source codes", () => {
    const codes = SOURCE_REGISTRY.map((s) => s.code);
    for (const c of EXPECTED_CODES) {
      expect(codes).toContain(c);
    }
  });

  it("every source has non-empty code, name, url", () => {
    for (const s of SOURCE_REGISTRY) {
      expect(s.code.length).toBeGreaterThan(0);
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.url).toMatch(/^https?:\/\//);
    }
  });

  it("every source has at least one segment", () => {
    for (const s of SOURCE_REGISTRY) {
      expect(s.segments.length).toBeGreaterThan(0);
    }
  });

  it("every source has at least one access method", () => {
    for (const s of SOURCE_REGISTRY) {
      expect(s.accessMethods.length).toBeGreaterThan(0);
    }
  });

  it("no source has submission capability (safety)", () => {
    for (const s of SOURCE_REGISTRY) {
      expect(s.capabilities.submission).toBe(false);
    }
  });

  it("getSource returns correct source by code", () => {
    const eis = getSource("eis");
    expect(eis).toBeDefined();
    expect(eis!.name).toContain("ЕИС");
  });

  it("getSource returns undefined for unknown code", () => {
    expect(getSource("nonexistent")).toBeUndefined();
  });

  it("listSources returns a copy", () => {
    const a = listSources();
    const b = listSources();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it("sourcesBySegment filters correctly", () => {
    const fz44 = sourcesBySegment("federal_44fz");
    expect(fz44.length).toBeGreaterThan(0);
    for (const s of fz44) {
      expect(s.segments).toContain("federal_44fz");
    }
    const commercial = sourcesBySegment("commercial");
    expect(commercial.length).toBeGreaterThan(0);
    for (const s of commercial) {
      expect(s.segments).toContain("commercial");
    }
  });

  it("sourcesRequiringKep returns subset with requiresKep=true", () => {
    const kep = sourcesRequiringKep();
    expect(kep.length).toBeGreaterThan(0);
    for (const s of kep) {
      expect(s.requiresKep).toBe(true);
    }
  });

  it("sourcesWithPublicSearch returns at least 10", () => {
    const pub = sourcesWithPublicSearch();
    expect(pub.length).toBeGreaterThanOrEqual(10);
  });

  it("all gates are closed by default", () => {
    for (const s of SOURCE_REGISTRY) {
      expect(s.gate.publicUrlVerified).toBe(false);
      expect(s.gate.robotsOrApiAllowed).toBe(false);
      expect(s.gate.rateLimitConfigured).toBe(false);
      expect(s.gate.testFixturePresent).toBe(false);
    }
  });
});
