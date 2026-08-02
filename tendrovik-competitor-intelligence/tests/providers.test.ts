import { describe, it, expect } from "vitest";
import { RusprofileImportAdapter } from "../src/providers/rusprofile-import.js";
import type { ImportableRecord } from "../src/providers/interface.js";

describe("RusprofileImportAdapter", () => {
  const SAMPLE_RECORDS: ImportableRecord[] = [
    {
      inn: "7707083893",
      name: 'ООО "СтройМонтаж-М"',
      ogrn: "1027700132195",
      okvedMain: "41.20",
      okvedAdditional: ["43.21", "43.29"],
      region: "Москва",
      registrationDate: "2015-03-12",
      isActive: true,
      annualRevenue: 85_000_000,
      netProfit: 6_200_000,
      employeeCount: 65,
      reportingYear: 2025,
    },
    {
      inn: "7701234567",
      name: 'ООО "ТехноСтрой"',
      okvedMain: "41.20",
      annualRevenue: 150_000_000,
      employeeCount: 120,
    },
  ];

  it("adapter name is rusprofile-manual-import", () => {
    const adapter = new RusprofileImportAdapter();
    expect(adapter.name).toBe("rusprofile-manual-import");
  });

  it("loads records and retrieves by INN", () => {
    const adapter = new RusprofileImportAdapter();
    adapter.loadFromRecords(SAMPLE_RECORDS, "2026-07-15T10:00:00Z");

    const profile = adapter.loadCompanyProfile("7707083893");
    expect(profile).not.toBeNull();
    expect(profile!.name).toContain("СтройМонтаж");
    expect(profile!.inn).toBe("7707083893");
  });

  it("returns null for unknown INN", () => {
    const adapter = new RusprofileImportAdapter();
    adapter.loadFromRecords(SAMPLE_RECORDS, "2026-07-15T10:00:00Z");
    expect(adapter.loadCompanyProfile("9999999999")).toBeNull();
  });

  it("sets freshness from importedAt", () => {
    const adapter = new RusprofileImportAdapter();
    adapter.loadFromRecords(SAMPLE_RECORDS, "2026-07-15T10:00:00Z");

    const profile = adapter.loadCompanyProfile("7707083893")!;
    expect(profile.freshness).toBeDefined();
    expect(profile.freshness!.fetchedAt).toBe("2026-07-15T10:00:00Z");
    expect(profile.freshness!.sourceLabel).toContain("Rusprofile");
  });

  it("maps financial data correctly", () => {
    const adapter = new RusprofileImportAdapter();
    adapter.loadFromRecords(SAMPLE_RECORDS, "2026-07-15T10:00:00Z");

    const profile = adapter.loadCompanyProfile("7707083893")!;
    expect(profile.financials).toBeDefined();
    expect(profile.financials!.annualRevenue).toBe(85_000_000);
    expect(profile.financials!.employeeCount).toBe(65);
    expect(profile.financials!.reportingYear).toBe(2025);
  });

  it("sets hasAccreditation and hasKep to null by default", () => {
    const adapter = new RusprofileImportAdapter();
    adapter.loadFromRecords(SAMPLE_RECORDS, "2026-07-15T10:00:00Z");

    const profile = adapter.loadCompanyProfile("7707083893")!;
    expect(profile.hasAccreditation).toBeNull();
    expect(profile.hasKep).toBeNull();
  });

  it("listLoadedInns returns all loaded INNs", () => {
    const adapter = new RusprofileImportAdapter();
    adapter.loadFromRecords(SAMPLE_RECORDS, "2026-07-15T10:00:00Z");

    const inns = adapter.listLoadedInns();
    expect(inns).toHaveLength(2);
    expect(inns).toContain("7707083893");
    expect(inns).toContain("7701234567");
  });

  it("clear removes all profiles", () => {
    const adapter = new RusprofileImportAdapter();
    adapter.loadFromRecords(SAMPLE_RECORDS, "2026-07-15T10:00:00Z");
    adapter.clear();
    expect(adapter.listLoadedInns()).toHaveLength(0);
    expect(adapter.loadCompanyProfile("7707083893")).toBeNull();
  });

  it("defaults isActive to true when not specified", () => {
    const adapter = new RusprofileImportAdapter();
    adapter.loadFromRecords([{ inn: "1111111111", name: "Test" }], "2026-01-01T00:00:00Z");
    const profile = adapter.loadCompanyProfile("1111111111")!;
    expect(profile.isActive).toBe(true);
  });

  it("no financial data when neither revenue nor employee count present", () => {
    const adapter = new RusprofileImportAdapter();
    adapter.loadFromRecords(
      [{ inn: "2222222222", name: "Empty Corp" }],
      "2026-01-01T00:00:00Z",
    );
    const profile = adapter.loadCompanyProfile("2222222222")!;
    expect(profile.financials).toBeUndefined();
  });
});
