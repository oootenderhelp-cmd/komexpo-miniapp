import type { CompanyProfile } from "../interfaces/company.js";
import type { TenderContext } from "../interfaces/tender.js";
import type { FactorScore } from "../interfaces/scoring.js";

export function scoreSubjectMatch(
  company: CompanyProfile,
  tender: TenderContext,
): FactorScore {
  let score = 0;
  const maxScore = 100;
  let rationale = "";

  const companyOkveds = new Set<string>();
  if (company.okvedMain) companyOkveds.add(company.okvedMain.split(".")[0]!);
  if (company.okvedAdditional) {
    for (const o of company.okvedAdditional) {
      companyOkveds.add(o.split(".")[0]!);
    }
  }

  if (tender.okpdCodes && tender.okpdCodes.length > 0 && companyOkveds.size > 0) {
    const tenderPrefixes = tender.okpdCodes.map((c) => c.split(".")[0]!);
    const matched = tenderPrefixes.filter((p) => companyOkveds.has(p));
    const matchRatio = matched.length / tenderPrefixes.length;
    score = Math.round(matchRatio * 70);
    rationale = `ОКВЭД совпадение: ${matched.length}/${tenderPrefixes.length} кодов`;
  } else if (companyOkveds.size > 0) {
    score = 20;
    rationale = "ОКВЭД/ОКПД компании есть, но коды тендера не указаны";
  } else {
    score = 10;
    rationale = "Нет данных об ОКВЭД компании";
  }

  if (company.pastContracts && company.pastContracts.length > 0 && tender.okpdCodes) {
    const tenderPrefixes = new Set(tender.okpdCodes.map((c) => c.split(".")[0]!));
    const relevantContracts = company.pastContracts.filter(
      (c) => c.okpdCodes?.some((code) => tenderPrefixes.has(code.split(".")[0]!)),
    );
    if (relevantContracts.length > 0) {
      score = Math.min(maxScore, score + 30);
      rationale += `; ${relevantContracts.length} релевантных контрактов в истории`;
    }
  }

  return {
    factor: "subject_match",
    label: "Соответствие предмету закупки",
    score: Math.min(score, maxScore),
    maxScore,
    weight: 0.25,
    rationale,
  };
}

export function scoreRelevantExperience(
  company: CompanyProfile,
  tender: TenderContext,
): FactorScore {
  let score = 0;
  const maxScore = 100;
  let rationale = "";

  const contracts = company.pastContracts ?? [];
  if (contracts.length === 0) {
    rationale = "Нет данных о прошлых контрактах";
    return { factor: "relevant_experience", label: "Релевантный опыт", score, maxScore, weight: 0.2, rationale };
  }

  const contractCount = contracts.length;
  const countScore = Math.min(40, contractCount * 8);

  let volumeScore = 0;
  if (tender.startPrice && tender.startPrice > 0) {
    const totalContractSum = contracts.reduce((sum, c) => sum + c.contractSum, 0);
    const volumeRatio = totalContractSum / tender.startPrice;
    volumeScore = Math.min(30, Math.round(volumeRatio * 10));
  }

  let recencyScore = 0;
  const now = Date.now();
  const recentContracts = contracts.filter((c) => {
    if (!c.completedAt) return false;
    const diff = now - new Date(c.completedAt).getTime();
    return diff < 3 * 365.25 * 24 * 60 * 60 * 1000;
  });
  recencyScore = Math.min(30, recentContracts.length * 10);

  score = countScore + volumeScore + recencyScore;
  rationale = `${contractCount} контрактов всего, ${recentContracts.length} за 3 года`;
  if (tender.startPrice && tender.startPrice > 0) {
    const totalSum = contracts.reduce((s, c) => s + c.contractSum, 0);
    rationale += `, суммарный объём ${(totalSum / 1_000_000).toFixed(1)}М`;
  }

  return {
    factor: "relevant_experience",
    label: "Релевантный опыт",
    score: Math.min(score, maxScore),
    maxScore,
    weight: 0.2,
    rationale,
  };
}

export function scoreFinancialCapacity(
  company: CompanyProfile,
  tender: TenderContext,
): FactorScore {
  let score = 0;
  const maxScore = 100;
  let rationale = "";

  const fin = company.financials;
  if (!fin) {
    rationale = "Нет финансовых данных";
    return { factor: "financial_capacity", label: "Финансовая ёмкость", score, maxScore, weight: 0.2, rationale };
  }

  if (fin.annualRevenue !== undefined && fin.annualRevenue > 0) {
    if (tender.startPrice && tender.startPrice > 0) {
      const ratio = fin.annualRevenue / tender.startPrice;
      if (ratio >= 3) score += 40;
      else if (ratio >= 1.5) score += 30;
      else if (ratio >= 0.5) score += 15;
      else score += 5;
      rationale = `Выручка/НМЦ = ${ratio.toFixed(1)}`;
    } else {
      score += 20;
      rationale = `Выручка ${(fin.annualRevenue / 1_000_000).toFixed(1)}М`;
    }
  }

  if (fin.netProfit !== undefined) {
    if (fin.netProfit > 0) {
      score += 20;
      rationale += "; прибыль положительная";
    } else {
      score += 5;
      rationale += "; убыток";
    }
  }

  if (fin.totalAssets !== undefined && fin.totalLiabilities !== undefined) {
    if (fin.totalAssets > 0) {
      const debtRatio = fin.totalLiabilities / fin.totalAssets;
      if (debtRatio < 0.5) { score += 20; rationale += "; долг/активы < 50%"; }
      else if (debtRatio < 0.8) { score += 10; rationale += "; долг/активы < 80%"; }
      else { score += 3; rationale += "; высокая долговая нагрузка"; }
    }
  }

  if (fin.employeeCount !== undefined && fin.employeeCount > 0) {
    if (fin.employeeCount >= 50) score += 20;
    else if (fin.employeeCount >= 10) score += 12;
    else score += 5;
    rationale += `; штат ${fin.employeeCount} чел.`;
  }

  return {
    factor: "financial_capacity",
    label: "Финансовая ёмкость",
    score: Math.min(score, maxScore),
    maxScore,
    weight: 0.2,
    rationale,
  };
}

export function scoreProductionCapacity(
  company: CompanyProfile,
  _tender: TenderContext,
): FactorScore {
  let score = 0;
  const maxScore = 100;
  let rationale = "";

  const fin = company.financials;
  if (fin?.employeeCount !== undefined && fin.employeeCount > 0) {
    if (fin.employeeCount >= 100) score += 50;
    else if (fin.employeeCount >= 30) score += 35;
    else if (fin.employeeCount >= 10) score += 20;
    else score += 10;
    rationale = `Штат ${fin.employeeCount} чел.`;
  } else {
    rationale = "Нет данных о штате";
  }

  if (company.isActive) {
    score += 20;
    rationale += "; компания действующая";
  }

  if (company.registrationDate) {
    const age = (Date.now() - new Date(company.registrationDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (age >= 5) { score += 30; rationale += `; возраст ${Math.floor(age)} лет`; }
    else if (age >= 2) { score += 20; rationale += `; возраст ${Math.floor(age)} лет`; }
    else { score += 5; rationale += `; молодая компания (${Math.floor(age)} лет)`; }
  }

  return {
    factor: "production_capacity",
    label: "Производственная ёмкость",
    score: Math.min(score, maxScore),
    maxScore,
    weight: 0.1,
    rationale,
  };
}

export function scorePricePosition(
  company: CompanyProfile,
  tender: TenderContext,
): FactorScore {
  let score = 50;
  const maxScore = 100;
  let rationale = "Ценовая позиция не определена (нет данных для сравнения)";

  if (
    tender.startPrice &&
    tender.startPrice > 0 &&
    company.pastContracts &&
    company.pastContracts.length > 0
  ) {
    const avgContractSum =
      company.pastContracts.reduce((s, c) => s + c.contractSum, 0) /
      company.pastContracts.length;

    const ratio = avgContractSum / tender.startPrice;
    if (ratio >= 0.3 && ratio <= 1.5) {
      score = 70;
      rationale = `Средний контракт ${(avgContractSum / 1_000_000).toFixed(1)}М при НМЦ ${(tender.startPrice / 1_000_000).toFixed(1)}М — масштаб адекватен`;
    } else if (ratio > 1.5) {
      score = 60;
      rationale = `Средний контракт выше НМЦ — компания работает в более крупном сегменте`;
    } else {
      score = 40;
      rationale = `Средний контракт значительно ниже НМЦ — возможна нехватка масштаба`;
    }
  }

  return {
    factor: "price_position",
    label: "Ценовая позиция",
    score,
    maxScore,
    weight: 0.1,
    rationale,
  };
}

export function scoreRiskProfile(company: CompanyProfile): FactorScore {
  let score = 100;
  const maxScore = 100;
  const parts: string[] = [];

  const risks = company.risks ?? [];
  if (risks.length === 0) {
    return {
      factor: "risk_profile",
      label: "Профиль рисков",
      score: 80,
      maxScore,
      weight: 0.15,
      rationale: "Нет данных о рисках (осторожная оценка)",
    };
  }

  for (const r of risks) {
    switch (r.severity) {
      case "critical":
        score -= 40;
        parts.push(`КРИТ: ${r.description}`);
        break;
      case "high":
        score -= 25;
        parts.push(`ВЫС: ${r.description}`);
        break;
      case "medium":
        score -= 12;
        parts.push(`СРЕД: ${r.description}`);
        break;
      case "low":
        score -= 5;
        parts.push(`НИЗ: ${r.description}`);
        break;
    }
  }

  return {
    factor: "risk_profile",
    label: "Профиль рисков",
    score: Math.max(0, score),
    maxScore,
    weight: 0.15,
    rationale: parts.join("; ") || "Чистый профиль",
  };
}
