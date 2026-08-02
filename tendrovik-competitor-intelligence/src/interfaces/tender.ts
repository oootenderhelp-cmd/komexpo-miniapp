import type { DataFreshness } from "./company.js";

export interface TenderContext {
  registryNumber: string;
  title: string;
  description?: string;
  okpdCodes?: string[];
  law?: "44-ФЗ" | "223-ФЗ" | "commercial";
  startPrice?: number;
  currency?: string;
  region?: string;
  customerName?: string;
  customerInn?: string;
  deadlineAt?: string;
  requiredLicenses?: string[];
  requiresKep?: boolean;
  requiresAccreditation?: boolean;
  freshness?: DataFreshness;
}
