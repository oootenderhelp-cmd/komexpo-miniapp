export type {
  DataFreshness,
  CompanyFinancials,
  PastContract,
  CompanyRisk,
  CompanyProfile,
  LicenseStatus,
  TenderContext,
  FactorScore,
  ScoreFactor,
  HumanCheckItem,
  ScoreResult,
  CompetitorComparison,
  CompetitiveAnalysis,
} from "./interfaces/index.js";

export { computeScore } from "./scoring/index.js";

export {
  scoreSubjectMatch,
  scoreRelevantExperience,
  scoreFinancialCapacity,
  scoreProductionCapacity,
  scorePricePosition,
  scoreRiskProfile,
} from "./scoring/factors.js";

export { compareWithCompetitors } from "./comparison/index.js";

export type { CompanyDataProvider, ImportableRecord } from "./providers/interface.js";
export { RusprofileImportAdapter } from "./providers/rusprofile-import.js";

export {
  FIXTURE_CLIENT,
  FIXTURE_COMPETITOR_A,
  FIXTURE_COMPETITOR_B,
  FIXTURE_TENDER,
} from "./fixtures/index.js";
