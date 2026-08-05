import type { CompanyProfile, DataFreshness } from "../interfaces/company.js";
import type { CompanyDataProvider, ImportableRecord } from "./interface.js";

export class RusprofileImportAdapter implements CompanyDataProvider {
  readonly name = "rusprofile-manual-import";

  private readonly profiles: Map<string, CompanyProfile> = new Map();

  loadFromRecords(records: ImportableRecord[], importedAt: string): void {
    for (const r of records) {
      const freshness: DataFreshness = {
        fetchedAt: importedAt,
        sourceLabel: "Ручной импорт (Rusprofile snapshot)",
        staleAfterDays: 90,
      };

      const profile: CompanyProfile = {
        inn: r.inn,
        name: r.name,
        ogrn: r.ogrn,
        okvedMain: r.okvedMain,
        okvedAdditional: r.okvedAdditional,
        region: r.region,
        registrationDate: r.registrationDate,
        isActive: r.isActive ?? true,
        financials:
          r.annualRevenue !== undefined || r.employeeCount !== undefined
            ? {
                annualRevenue: r.annualRevenue,
                netProfit: r.netProfit,
                totalAssets: r.totalAssets,
                totalLiabilities: r.totalLiabilities,
                employeeCount: r.employeeCount,
                reportingYear: r.reportingYear,
                freshness,
              }
            : undefined,
        hasAccreditation: null,
        hasKep: null,
        freshness,
      };

      this.profiles.set(r.inn, profile);
    }
  }

  loadCompanyProfile(inn: string): CompanyProfile | null {
    return this.profiles.get(inn) ?? null;
  }

  listLoadedInns(): string[] {
    return [...this.profiles.keys()];
  }

  clear(): void {
    this.profiles.clear();
  }
}
