import { describe, it, expect } from "vitest";
import {
  FIXTURE_CLIENT,
  FIXTURE_COMPETITOR_A,
  FIXTURE_COMPETITOR_B,
  FIXTURE_TENDER,
} from "../src/fixtures/index.js";

describe("Fixtures integrity", () => {
  it("FIXTURE_CLIENT has valid INN and name", () => {
    expect(FIXTURE_CLIENT.inn).toBeTruthy();
    expect(FIXTURE_CLIENT.name).toBeTruthy();
    expect(FIXTURE_CLIENT.isActive).toBe(true);
  });

  it("FIXTURE_CLIENT has financial data", () => {
    expect(FIXTURE_CLIENT.financials).toBeDefined();
    expect(FIXTURE_CLIENT.financials!.annualRevenue).toBeGreaterThan(0);
    expect(FIXTURE_CLIENT.financials!.employeeCount).toBeGreaterThan(0);
  });

  it("FIXTURE_CLIENT has past contracts", () => {
    expect(FIXTURE_CLIENT.pastContracts).toBeDefined();
    expect(FIXTURE_CLIENT.pastContracts!.length).toBeGreaterThan(0);
    for (const c of FIXTURE_CLIENT.pastContracts!) {
      expect(c.title).toBeTruthy();
      expect(c.contractSum).toBeGreaterThan(0);
      expect(c.currency).toBe("RUB");
    }
  });

  it("FIXTURE_COMPETITOR_A is stronger than FIXTURE_COMPETITOR_B", () => {
    expect(FIXTURE_COMPETITOR_A.financials!.annualRevenue!).toBeGreaterThan(
      FIXTURE_COMPETITOR_B.financials!.annualRevenue!,
    );
    expect(FIXTURE_COMPETITOR_A.financials!.employeeCount!).toBeGreaterThan(
      FIXTURE_COMPETITOR_B.financials!.employeeCount!,
    );
  });

  it("FIXTURE_COMPETITOR_B has critical risk (RNP)", () => {
    expect(FIXTURE_COMPETITOR_B.risks).toBeDefined();
    expect(FIXTURE_COMPETITOR_B.risks!.some((r) => r.kind === "rnp_inclusion")).toBe(true);
    expect(FIXTURE_COMPETITOR_B.risks!.some((r) => r.severity === "critical")).toBe(true);
  });

  it("FIXTURE_TENDER has required fields", () => {
    expect(FIXTURE_TENDER.registryNumber).toBeTruthy();
    expect(FIXTURE_TENDER.title).toBeTruthy();
    expect(FIXTURE_TENDER.startPrice).toBeGreaterThan(0);
    expect(FIXTURE_TENDER.law).toBe("44-ФЗ");
    expect(FIXTURE_TENDER.okpdCodes).toBeDefined();
    expect(FIXTURE_TENDER.okpdCodes!.length).toBeGreaterThan(0);
  });

  it("FIXTURE_TENDER requires licenses, KEP, accreditation", () => {
    expect(FIXTURE_TENDER.requiredLicenses).toBeDefined();
    expect(FIXTURE_TENDER.requiredLicenses!.length).toBeGreaterThan(0);
    expect(FIXTURE_TENDER.requiresKep).toBe(true);
    expect(FIXTURE_TENDER.requiresAccreditation).toBe(true);
  });

  it("all fixtures have freshness metadata", () => {
    expect(FIXTURE_CLIENT.freshness).toBeDefined();
    expect(FIXTURE_COMPETITOR_A.freshness).toBeDefined();
    expect(FIXTURE_COMPETITOR_B.freshness).toBeDefined();
    expect(FIXTURE_TENDER.freshness).toBeDefined();
  });
});
