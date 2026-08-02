export type SourceSegment =
  | "federal_44fz"
  | "federal_223fz"
  | "commercial"
  | "corporate"
  | "municipal";

export type SourceAccessMethod =
  | "public_search"
  | "official_cabinet"
  | "api"
  | "api_stub";

export interface SourceCapability {
  search: boolean;
  fetchCard: boolean;
  fetchDocuments: boolean;
  monitoring: boolean;
  submission: boolean;
}

export interface SourceTermsGate {
  publicUrlVerified: boolean;
  robotsOrApiAllowed: boolean;
  rateLimitConfigured: boolean;
  testFixturePresent: boolean;
}

export function isGateOpen(gate: SourceTermsGate): boolean {
  return (
    gate.publicUrlVerified &&
    gate.robotsOrApiAllowed &&
    gate.rateLimitConfigured &&
    gate.testFixturePresent
  );
}

export const CLOSED_GATE: SourceTermsGate = {
  publicUrlVerified: false,
  robotsOrApiAllowed: false,
  rateLimitConfigured: false,
  testFixturePresent: false,
};

export interface SourceHealth {
  sourceCode: string;
  status: "ok" | "degraded" | "down" | "not_configured";
  lastCheckedAt: Date | null;
  message?: string;
}

export interface TenderDocumentRef {
  title: string;
  uri: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface NormalizedTender {
  sourceCode: string;
  sourceName: string;
  sourceUrl: string;
  externalId: string;
  registryNumber?: string;
  title: string;
  customerName: string;
  customerInn?: string;
  region?: string;
  law?: string;
  segments: SourceSegment[];
  startPrice?: number;
  currency: string;
  publishedAt?: Date;
  deadlineAt?: Date;
  status: string;
  documents: TenderDocumentRef[];
  lotCount?: number;
  rawPayload?: unknown;
}

export interface TenderSource {
  code: string;
  name: string;
  url: string;
  segments: SourceSegment[];
  accessMethods: SourceAccessMethod[];
  capabilities: SourceCapability;
  gate: SourceTermsGate;
  requiresAccreditation: boolean;
  requiresKep: boolean;
  notes?: string;
}
