import type { CompanyProfile } from "../interfaces/company.js";

export interface CompanyDataProvider {
  readonly name: string;

  loadCompanyProfile(inn: string): CompanyProfile | null;
}

export interface ImportableRecord {
  inn: string;
  name: string;
  ogrn?: string;
  okvedMain?: string;
  okvedAdditional?: string[];
  region?: string;
  registrationDate?: string;
  isActive?: boolean;
  annualRevenue?: number;
  netProfit?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  employeeCount?: number;
  reportingYear?: number;
  [key: string]: unknown;
}
