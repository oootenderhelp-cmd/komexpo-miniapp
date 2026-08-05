export interface DataFreshness {
  fetchedAt: string;
  sourceLabel: string;
  staleAfterDays: number;
}

export interface CompanyFinancials {
  annualRevenue?: number;
  netProfit?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  employeeCount?: number;
  reportingYear?: number;
  freshness?: DataFreshness;
}

export interface PastContract {
  registryNumber?: string;
  title: string;
  customerName: string;
  contractSum: number;
  currency: string;
  completedAt?: string;
  law?: string;
  okpdCodes?: string[];
  freshness?: DataFreshness;
}

export interface CompanyRisk {
  kind:
    | "bankruptcy"
    | "arbitration"
    | "tax_debt"
    | "disqualification"
    | "rnp_inclusion"
    | "license_expired"
    | "other";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  detectedAt?: string;
  freshness?: DataFreshness;
}

export interface CompanyProfile {
  inn: string;
  name: string;
  shortName?: string;
  ogrn?: string;
  okvedMain?: string;
  okvedAdditional?: string[];
  region?: string;
  registrationDate?: string;
  isActive: boolean;

  financials?: CompanyFinancials;
  pastContracts?: PastContract[];
  risks?: CompanyRisk[];

  hasAccreditation?: boolean | null;
  hasKep?: boolean | null;
  requiredLicenses?: LicenseStatus[];

  freshness?: DataFreshness;
}

export interface LicenseStatus {
  licenseName: string;
  confirmed: boolean | null;
  expiresAt?: string;
}
