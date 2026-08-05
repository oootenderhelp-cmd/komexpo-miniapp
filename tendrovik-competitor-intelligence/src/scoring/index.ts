import type { CompanyProfile } from "../interfaces/company.js";
import type { TenderContext } from "../interfaces/tender.js";
import type { ScoreResult, HumanCheckItem, FactorScore } from "../interfaces/scoring.js";
import {
  scoreSubjectMatch,
  scoreRelevantExperience,
  scoreFinancialCapacity,
  scoreProductionCapacity,
  scorePricePosition,
  scoreRiskProfile,
} from "./factors.js";

function computeConfidence(company: CompanyProfile, tender: TenderContext): number {
  let available = 0;
  let total = 0;

  const checks: Array<[boolean, number]> = [
    [!!company.okvedMain, 15],
    [!!company.financials, 20],
    [(company.pastContracts ?? []).length > 0, 20],
    [(company.risks ?? []).length > 0 || company.risks !== undefined, 10],
    [!!company.registrationDate, 5],
    [!!tender.okpdCodes && tender.okpdCodes.length > 0, 15],
    [!!tender.startPrice, 10],
    [company.hasAccreditation !== null && company.hasAccreditation !== undefined, 5],
  ];

  for (const [present, weight] of checks) {
    total += weight;
    if (present) available += weight;
  }

  return total > 0 ? Math.round((available / total) * 100) : 0;
}

function computeDataFreshnessDays(company: CompanyProfile): number {
  const freshnessItems: Array<string | undefined> = [
    company.freshness?.fetchedAt,
    company.financials?.freshness?.fetchedAt,
  ];

  for (const c of company.pastContracts ?? []) {
    freshnessItems.push(c.freshness?.fetchedAt);
  }
  for (const r of company.risks ?? []) {
    freshnessItems.push(r.freshness?.fetchedAt);
  }

  const dates = freshnessItems
    .filter((d): d is string => !!d)
    .map((d) => new Date(d).getTime())
    .filter((t) => !isNaN(t));

  if (dates.length === 0) return 999;

  const oldest = Math.min(...dates);
  return Math.round((Date.now() - oldest) / (24 * 60 * 60 * 1000));
}

function collectHumanChecks(
  company: CompanyProfile,
  tender: TenderContext,
): HumanCheckItem[] {
  const checks: HumanCheckItem[] = [];

  if (company.hasAccreditation === null || company.hasAccreditation === undefined) {
    if (tender.requiresAccreditation) {
      checks.push({
        area: "Аккредитация",
        reason: "Требуется аккредитация, статус компании не подтверждён",
        severity: "blocking",
      });
    }
  }

  if (company.hasKep === null || company.hasKep === undefined) {
    if (tender.requiresKep) {
      checks.push({
        area: "КЭП",
        reason: "Требуется КЭП, наличие у компании не подтверждено",
        severity: "blocking",
      });
    }
  }

  if (tender.requiredLicenses && tender.requiredLicenses.length > 0) {
    const companyLicenses = company.requiredLicenses ?? [];
    for (const required of tender.requiredLicenses) {
      const found = companyLicenses.find((l) => l.licenseName === required);
      if (!found) {
        checks.push({
          area: "Лицензия",
          reason: `Лицензия "${required}" — данные отсутствуют`,
          severity: "blocking",
        });
      } else if (found.confirmed === null) {
        checks.push({
          area: "Лицензия",
          reason: `Лицензия "${required}" — статус не подтверждён`,
          severity: "warning",
        });
      } else if (!found.confirmed) {
        checks.push({
          area: "Лицензия",
          reason: `Лицензия "${required}" — отсутствует или просрочена`,
          severity: "blocking",
        });
      }
    }
  }

  if (!company.isActive) {
    checks.push({
      area: "Статус компании",
      reason: "Компания не является действующей",
      severity: "blocking",
    });
  }

  const hasRnp = (company.risks ?? []).some((r) => r.kind === "rnp_inclusion");
  if (hasRnp) {
    checks.push({
      area: "РНП",
      reason: "Компания включена в реестр недобросовестных поставщиков",
      severity: "blocking",
    });
  }

  return checks;
}

function deriveRecommendation(
  totalScore: number,
  confidence: number,
  humanChecks: HumanCheckItem[],
): ScoreResult["recommendation"] {
  const hasBlockers = humanChecks.some((c) => c.severity === "blocking");
  if (hasBlockers) return "insufficient_data";
  if (confidence < 30) return "insufficient_data";
  if (totalScore >= 70) return "strong";
  if (totalScore >= 45) return "moderate";
  return "weak";
}

export function computeScore(
  company: CompanyProfile,
  tender: TenderContext,
): ScoreResult {
  const factors: FactorScore[] = [
    scoreSubjectMatch(company, tender),
    scoreRelevantExperience(company, tender),
    scoreFinancialCapacity(company, tender),
    scoreProductionCapacity(company, tender),
    scorePricePosition(company, tender),
    scoreRiskProfile(company),
  ];

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const weightedSum = factors.reduce((s, f) => s + (f.score / f.maxScore) * f.weight, 0);
  const totalScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;

  const confidence = computeConfidence(company, tender);
  const dataFreshnessDays = computeDataFreshnessDays(company);
  const humanChecks = collectHumanChecks(company, tender);

  const limitations: string[] = [];
  limitations.push("Это рекомендация для человека, не юридическое заключение");
  limitations.push("Скоринг не заменяет проверку документов и аккредитации");
  if (confidence < 50) {
    limitations.push("Низкая достоверность из-за неполных данных");
  }
  if (dataFreshnessDays > 90) {
    limitations.push(`Данные могут быть устаревшими (${dataFreshnessDays} дней)`);
  }

  const recommendation = deriveRecommendation(totalScore, confidence, humanChecks);

  return {
    totalScore,
    confidence,
    dataFreshnessDays,
    factors,
    humanChecks,
    limitations,
    recommendation,
  };
}
