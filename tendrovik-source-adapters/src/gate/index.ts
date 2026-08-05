import type { TenderSource, SourceTermsGate, NormalizedTender } from "../interfaces/index.js";
import { isGateOpen } from "../interfaces/index.js";

export class ImportBlockedError extends Error {
  constructor(
    readonly sourceCode: string,
    readonly reasons: string[],
  ) {
    super(`Import from "${sourceCode}" blocked: ${reasons.join("; ")}`);
    this.name = "ImportBlockedError";
  }
}

export function checkGate(gate: SourceTermsGate): string[] {
  const reasons: string[] = [];
  if (!gate.publicUrlVerified) reasons.push("public URL not verified");
  if (!gate.robotsOrApiAllowed) reasons.push("robots.txt / API terms not confirmed");
  if (!gate.rateLimitConfigured) reasons.push("rate limit not configured");
  if (!gate.testFixturePresent) reasons.push("test fixture missing");
  return reasons;
}

export function assertImportAllowed(source: TenderSource): void {
  const reasons = checkGate(source.gate);
  if (reasons.length > 0) {
    throw new ImportBlockedError(source.code, reasons);
  }
}

export function guardedImport(
  source: TenderSource,
  tenders: NormalizedTender[],
): NormalizedTender[] {
  assertImportAllowed(source);
  return tenders.map((t) => ({
    ...t,
    sourceCode: source.code,
    sourceName: source.name,
    sourceUrl: source.url,
  }));
}

export function openGate(
  source: TenderSource,
  overrides: Partial<SourceTermsGate> = {},
): TenderSource {
  return {
    ...source,
    gate: {
      publicUrlVerified: true,
      robotsOrApiAllowed: true,
      rateLimitConfigured: true,
      testFixturePresent: true,
      ...overrides,
    },
  };
}

export { isGateOpen };
