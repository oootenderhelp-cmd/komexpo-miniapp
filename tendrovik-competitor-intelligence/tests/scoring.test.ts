import { describe, it, expect } from "vitest";
import { computeScore } from "../src/scoring/index.js";
import {
  scoreSubjectMatch,
  scoreRelevantExperience,
  scoreFinancialCapacity,
  scoreProductionCapacity,
  scorePricePosition,
  scoreRiskProfile,
} from "../src/scoring/factors.js";
import {
  FIXTURE_CLIENT,
  FIXTURE_COMPETITOR_A,
  FIXTURE_COMPETITOR_B,
  FIXTURE_TENDER,
} from "../src/fixtures/index.js";
import type { CompanyProfile } from "../src/interfaces/company.js";
import type { TenderContext } from "../src/interfaces/tender.js";

describe("computeScore", () => {
  it("returns score 0–100 for fixture client", () => {
    const result = computeScore(FIXTURE_CLIENT, FIXTURE_TENDER);
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it("returns exactly 6 factors", () => {
    const result = computeScore(FIXTURE_CLIENT, FIXTURE_TENDER);
    expect(result.factors).toHaveLength(6);
    const names = result.factors.map((f) => f.factor);
    expect(names).toContain("subject_match");
    expect(names).toContain("relevant_experience");
    expect(names).toContain("financial_capacity");
    expect(names).toContain("production_capacity");
    expect(names).toContain("price_position");
    expect(names).toContain("risk_profile");
  });

  it("factor weights sum to 1.0", () => {
    const result = computeScore(FIXTURE_CLIENT, FIXTURE_TENDER);
    const totalWeight = result.factors.reduce((s, f) => s + f.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it("confidence is 0–100", () => {
    const result = computeScore(FIXTURE_CLIENT, FIXTURE_TENDER);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it("dataFreshnessDays is a non-negative integer", () => {
    const result = computeScore(FIXTURE_CLIENT, FIXTURE_TENDER);
    expect(result.dataFreshnessDays).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.dataFreshnessDays)).toBe(true);
  });

  it("always includes disclaimer in limitations", () => {
    const result = computeScore(FIXTURE_CLIENT, FIXTURE_TENDER);
    expect(result.limitations.length).toBeGreaterThan(0);
    expect(result.limitations.some((l) => l.includes("рекомендация"))).toBe(true);
  });

  it("recommendation is one of 4 values", () => {
    const result = computeScore(FIXTURE_CLIENT, FIXTURE_TENDER);
    expect(["strong", "moderate", "weak", "insufficient_data"]).toContain(
      result.recommendation,
    );
  });

  it("strong competitor scores higher than weak competitor", () => {
    const strongResult = computeScore(FIXTURE_COMPETITOR_A, FIXTURE_TENDER);
    const weakResult = computeScore(FIXTURE_COMPETITOR_B, FIXTURE_TENDER);
    expect(strongResult.totalScore).toBeGreaterThan(weakResult.totalScore);
  });

  it("competitor with RNP gets humanCheck blocking item", () => {
    const result = computeScore(FIXTURE_COMPETITOR_B, FIXTURE_TENDER);
    expect(result.humanChecks.some((c) => c.area === "РНП")).toBe(true);
    expect(result.humanChecks.find((c) => c.area === "РНП")!.severity).toBe("blocking");
  });

  it("returns insufficient_data when blocking checks exist", () => {
    const inactive: CompanyProfile = { ...FIXTURE_CLIENT, isActive: false };
    const result = computeScore(inactive, FIXTURE_TENDER);
    expect(result.recommendation).toBe("insufficient_data");
  });
});

describe("Individual factors", () => {
  it("scoreSubjectMatch rewards matching ОКВЭД", () => {
    const result = scoreSubjectMatch(FIXTURE_CLIENT, FIXTURE_TENDER);
    expect(result.score).toBeGreaterThan(0);
    expect(result.weight).toBe(0.25);
    expect(result.rationale).toContain("ОКВЭД");
  });

  it("scoreSubjectMatch gives low score when no ОКВЭД data", () => {
    const noOkved: CompanyProfile = {
      ...FIXTURE_CLIENT,
      okvedMain: undefined,
      okvedAdditional: undefined,
      pastContracts: [],
    };
    const result = scoreSubjectMatch(noOkved, FIXTURE_TENDER);
    expect(result.score).toBeLessThanOrEqual(20);
  });

  it("scoreRelevantExperience scores 0 without contracts", () => {
    const noContracts: CompanyProfile = { ...FIXTURE_CLIENT, pastContracts: [] };
    const result = scoreRelevantExperience(noContracts, FIXTURE_TENDER);
    expect(result.score).toBe(0);
  });

  it("scoreRelevantExperience rewards recent contracts", () => {
    const result = scoreRelevantExperience(FIXTURE_CLIENT, FIXTURE_TENDER);
    expect(result.score).toBeGreaterThan(0);
    expect(result.rationale).toContain("контракт");
  });

  it("scoreFinancialCapacity returns 0 without financials", () => {
    const noFin: CompanyProfile = { ...FIXTURE_CLIENT, financials: undefined };
    const result = scoreFinancialCapacity(noFin, FIXTURE_TENDER);
    expect(result.score).toBe(0);
  });

  it("scoreFinancialCapacity rewards high revenue/NMC ratio", () => {
    const result = scoreFinancialCapacity(FIXTURE_COMPETITOR_A, FIXTURE_TENDER);
    expect(result.score).toBeGreaterThan(
      scoreFinancialCapacity(FIXTURE_COMPETITOR_B, FIXTURE_TENDER).score,
    );
  });

  it("scoreProductionCapacity rewards larger staff", () => {
    const resultA = scoreProductionCapacity(FIXTURE_COMPETITOR_A, FIXTURE_TENDER);
    const resultB = scoreProductionCapacity(FIXTURE_COMPETITOR_B, FIXTURE_TENDER);
    expect(resultA.score).toBeGreaterThan(resultB.score);
  });

  it("scorePricePosition defaults to 50 without data", () => {
    const noContracts: CompanyProfile = { ...FIXTURE_CLIENT, pastContracts: undefined };
    const noPrice: TenderContext = { ...FIXTURE_TENDER, startPrice: undefined };
    const result = scorePricePosition(noContracts, noPrice);
    expect(result.score).toBe(50);
  });

  it("scoreRiskProfile gives 80 with no risk data", () => {
    const noRisks: CompanyProfile = { ...FIXTURE_CLIENT, risks: undefined };
    const result = scoreRiskProfile(noRisks);
    expect(result.score).toBe(80);
  });

  it("scoreRiskProfile penalizes critical risks heavily", () => {
    const result = scoreRiskProfile(FIXTURE_COMPETITOR_B);
    expect(result.score).toBeLessThan(80);
  });

  it("scoreRiskProfile gives clean score for no risks", () => {
    const clean: CompanyProfile = {
      ...FIXTURE_CLIENT,
      risks: [{ kind: "other", severity: "low", description: "Minor issue" }],
    };
    const withRisks = scoreRiskProfile(clean);
    expect(withRisks.score).toBeLessThan(100);

    const noRisks: CompanyProfile = { ...FIXTURE_CLIENT, risks: [] };
    const noRisksResult = scoreRiskProfile(noRisks);
    expect(noRisksResult.score).toBe(80);
  });

  it("each factor score is within [0, maxScore]", () => {
    const result = computeScore(FIXTURE_CLIENT, FIXTURE_TENDER);
    for (const f of result.factors) {
      expect(f.score).toBeGreaterThanOrEqual(0);
      expect(f.score).toBeLessThanOrEqual(f.maxScore);
    }
  });
});

describe("Human checks", () => {
  it("flags unknown accreditation when tender requires it", () => {
    const result = computeScore(FIXTURE_CLIENT, FIXTURE_TENDER);
    expect(result.humanChecks.some((c) => c.area === "Аккредитация")).toBe(true);
  });

  it("flags unknown KEP when tender requires it", () => {
    const result = computeScore(FIXTURE_CLIENT, FIXTURE_TENDER);
    expect(result.humanChecks.some((c) => c.area === "КЭП")).toBe(true);
  });

  it("flags missing license", () => {
    const result = computeScore(FIXTURE_CLIENT, FIXTURE_TENDER);
    expect(result.humanChecks.some((c) => c.area === "Лицензия")).toBe(true);
  });

  it("does not flag accreditation when company has it confirmed", () => {
    const result = computeScore(FIXTURE_COMPETITOR_A, FIXTURE_TENDER);
    expect(result.humanChecks.some((c) => c.area === "Аккредитация")).toBe(false);
  });

  it("does not flag KEP when company has it confirmed", () => {
    const result = computeScore(FIXTURE_COMPETITOR_A, FIXTURE_TENDER);
    expect(result.humanChecks.some((c) => c.area === "КЭП")).toBe(false);
  });

  it("flags inactive company as blocking", () => {
    const inactive: CompanyProfile = { ...FIXTURE_CLIENT, isActive: false };
    const result = computeScore(inactive, FIXTURE_TENDER);
    const check = result.humanChecks.find((c) => c.area === "Статус компании");
    expect(check).toBeDefined();
    expect(check!.severity).toBe("blocking");
  });

  it("no accreditation/KEP checks when tender does not require them", () => {
    const simpleTender: TenderContext = {
      ...FIXTURE_TENDER,
      requiresKep: false,
      requiresAccreditation: false,
      requiredLicenses: undefined,
    };
    const result = computeScore(FIXTURE_CLIENT, simpleTender);
    expect(result.humanChecks.some((c) => c.area === "Аккредитация")).toBe(false);
    expect(result.humanChecks.some((c) => c.area === "КЭП")).toBe(false);
    expect(result.humanChecks.some((c) => c.area === "Лицензия")).toBe(false);
  });
});

describe("Determinism", () => {
  it("same input produces same output", () => {
    const r1 = computeScore(FIXTURE_CLIENT, FIXTURE_TENDER);
    const r2 = computeScore(FIXTURE_CLIENT, FIXTURE_TENDER);
    expect(r1.totalScore).toBe(r2.totalScore);
    expect(r1.confidence).toBe(r2.confidence);
    expect(r1.factors.map((f) => f.score)).toEqual(r2.factors.map((f) => f.score));
    expect(r1.recommendation).toBe(r2.recommendation);
  });
});
