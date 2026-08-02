import { describe, it, expect } from "vitest";
import { compareWithCompetitors } from "../src/comparison/index.js";
import {
  FIXTURE_CLIENT,
  FIXTURE_COMPETITOR_A,
  FIXTURE_COMPETITOR_B,
  FIXTURE_TENDER,
} from "../src/fixtures/index.js";

describe("compareWithCompetitors", () => {
  it("returns analysis with correct structure", () => {
    const analysis = compareWithCompetitors(
      FIXTURE_CLIENT,
      [FIXTURE_COMPETITOR_A, FIXTURE_COMPETITOR_B],
      FIXTURE_TENDER,
    );
    expect(analysis.tender.registryNumber).toBe(FIXTURE_TENDER.registryNumber);
    expect(analysis.client.companyInn).toBe(FIXTURE_CLIENT.inn);
    expect(analysis.competitors).toHaveLength(2);
    expect(analysis.totalParticipants).toBe(3);
    expect(analysis.clientRank).toBeGreaterThanOrEqual(1);
    expect(analysis.clientRank).toBeLessThanOrEqual(3);
  });

  it("ranks participants by totalScore descending", () => {
    const analysis = compareWithCompetitors(
      FIXTURE_CLIENT,
      [FIXTURE_COMPETITOR_A, FIXTURE_COMPETITOR_B],
      FIXTURE_TENDER,
    );
    const allScores = [
      analysis.client.score.totalScore,
      ...analysis.competitors.map((c) => c.score.totalScore),
    ];
    const sorted = [...allScores].sort((a, b) => b - a);
    expect(analysis.clientRank).toBe(sorted.indexOf(analysis.client.score.totalScore) + 1);
  });

  it("RNP competitor scores lowest", () => {
    const analysis = compareWithCompetitors(
      FIXTURE_CLIENT,
      [FIXTURE_COMPETITOR_A, FIXTURE_COMPETITOR_B],
      FIXTURE_TENDER,
    );
    const rnpScore = analysis.competitors.find(
      (c) => c.companyInn === FIXTURE_COMPETITOR_B.inn,
    )!.score.totalScore;

    expect(rnpScore).toBeLessThan(analysis.client.score.totalScore);
    expect(rnpScore).toBeLessThan(
      analysis.competitors.find((c) => c.companyInn === FIXTURE_COMPETITOR_A.inn)!.score.totalScore,
    );
  });

  it("always includes disclaimer", () => {
    const analysis = compareWithCompetitors(
      FIXTURE_CLIENT,
      [FIXTURE_COMPETITOR_A],
      FIXTURE_TENDER,
    );
    expect(analysis.disclaimer).toContain("рекомендацией");
    expect(analysis.disclaimer).toContain("не является юридическим заключением");
  });

  it("verdict is a non-empty string", () => {
    const analysis = compareWithCompetitors(
      FIXTURE_CLIENT,
      [FIXTURE_COMPETITOR_A, FIXTURE_COMPETITOR_B],
      FIXTURE_TENDER,
    );
    expect(analysis.verdict.length).toBeGreaterThan(0);
  });

  it("single competitor comparison works", () => {
    const analysis = compareWithCompetitors(
      FIXTURE_CLIENT,
      [FIXTURE_COMPETITOR_A],
      FIXTURE_TENDER,
    );
    expect(analysis.totalParticipants).toBe(2);
  });

  it("no competitors — client is rank 1", () => {
    const analysis = compareWithCompetitors(FIXTURE_CLIENT, [], FIXTURE_TENDER);
    expect(analysis.totalParticipants).toBe(1);
    expect(analysis.clientRank).toBe(1);
    expect(analysis.competitors).toHaveLength(0);
  });

  it("collects humanChecks from all participants", () => {
    const analysis = compareWithCompetitors(
      FIXTURE_CLIENT,
      [FIXTURE_COMPETITOR_B],
      FIXTURE_TENDER,
    );
    expect(analysis.humanChecks.some((c) => c.area === "РНП")).toBe(true);
  });

  it("deduplicates human checks", () => {
    const analysis = compareWithCompetitors(
      FIXTURE_CLIENT,
      [{ ...FIXTURE_CLIENT, inn: "1111111111", name: "Clone" }],
      FIXTURE_TENDER,
    );
    const accredChecks = analysis.humanChecks.filter((c) => c.area === "Аккредитация");
    expect(accredChecks).toHaveLength(1);
  });
});
