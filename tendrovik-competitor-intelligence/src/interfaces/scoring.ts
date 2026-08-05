export interface FactorScore {
  factor: ScoreFactor;
  label: string;
  score: number;
  maxScore: number;
  weight: number;
  rationale: string;
}

export type ScoreFactor =
  | "subject_match"
  | "relevant_experience"
  | "financial_capacity"
  | "production_capacity"
  | "price_position"
  | "risk_profile";

export interface HumanCheckItem {
  area: string;
  reason: string;
  severity: "info" | "warning" | "blocking";
}

export interface ScoreResult {
  totalScore: number;
  confidence: number;
  dataFreshnessDays: number;
  factors: FactorScore[];
  humanChecks: HumanCheckItem[];
  limitations: string[];
  recommendation: "strong" | "moderate" | "weak" | "insufficient_data";
}

export interface CompetitorComparison {
  companyInn: string;
  companyName: string;
  score: ScoreResult;
}

export interface CompetitiveAnalysis {
  tender: { registryNumber: string; title: string };
  client: CompetitorComparison;
  competitors: CompetitorComparison[];
  clientRank: number;
  totalParticipants: number;
  verdict: string;
  humanChecks: HumanCheckItem[];
  disclaimer: string;
}
