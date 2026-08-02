import { describe, it, expect } from "vitest";
import {
  assertImportAllowed,
  guardedImport,
  openGate,
  checkGate,
  ImportBlockedError,
  isGateOpen,
} from "../src/gate/index.js";
import { CLOSED_GATE } from "../src/interfaces/index.js";
import { getSource, SOURCE_REGISTRY } from "../src/registry/sources.js";
import { normalize } from "../src/normalizer/index.js";
import { FIXTURE_EIS } from "../src/fixtures/index.js";

describe("SourceTermsGate", () => {
  it("closed gate blocks import", () => {
    const eis = getSource("eis")!;
    expect(() => assertImportAllowed(eis)).toThrow(ImportBlockedError);
  });

  it("checkGate returns all 4 reasons for closed gate", () => {
    const reasons = checkGate(CLOSED_GATE);
    expect(reasons).toHaveLength(4);
    expect(reasons).toContain("public URL not verified");
    expect(reasons).toContain("robots.txt / API terms not confirmed");
    expect(reasons).toContain("rate limit not configured");
    expect(reasons).toContain("test fixture missing");
  });

  it("partially open gate still blocks", () => {
    const eis = getSource("eis")!;
    const partial: typeof eis = {
      ...eis,
      gate: { ...CLOSED_GATE, publicUrlVerified: true, testFixturePresent: true },
    };
    expect(() => assertImportAllowed(partial)).toThrow(ImportBlockedError);
    try {
      assertImportAllowed(partial);
    } catch (e) {
      expect((e as ImportBlockedError).reasons).toHaveLength(2);
    }
  });

  it("fully open gate allows import", () => {
    const eis = openGate(getSource("eis")!);
    expect(() => assertImportAllowed(eis)).not.toThrow();
  });

  it("isGateOpen returns false for closed, true for open", () => {
    expect(isGateOpen(CLOSED_GATE)).toBe(false);
    expect(
      isGateOpen({
        publicUrlVerified: true,
        robotsOrApiAllowed: true,
        rateLimitConfigured: true,
        testFixturePresent: true,
      }),
    ).toBe(true);
  });

  it("guardedImport stamps source metadata on tenders", () => {
    const eis = openGate(getSource("eis")!);
    const raw = normalize(FIXTURE_EIS);
    const result = guardedImport(eis, [raw]);
    expect(result).toHaveLength(1);
    expect(result[0]!.sourceCode).toBe("eis");
    expect(result[0]!.sourceName).toContain("ЕИС");
    expect(result[0]!.sourceUrl).toBe("https://zakupki.gov.ru");
  });

  it("guardedImport throws for blocked source", () => {
    const eis = getSource("eis")!;
    const raw = normalize(FIXTURE_EIS);
    expect(() => guardedImport(eis, [raw])).toThrow(ImportBlockedError);
  });

  it("every registry source is blocked by default", () => {
    for (const s of SOURCE_REGISTRY) {
      expect(() => assertImportAllowed(s)).toThrow(ImportBlockedError);
    }
  });
});
