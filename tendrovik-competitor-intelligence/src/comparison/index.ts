import type { CompanyProfile } from "../interfaces/company.js";
import type { TenderContext } from "../interfaces/tender.js";
import type {
  CompetitiveAnalysis,
  CompetitorComparison,
  HumanCheckItem,
} from "../interfaces/scoring.js";
import { computeScore } from "../scoring/index.js";

const DISCLAIMER =
  "Данный анализ является информационной рекомендацией для человека. " +
  "Он не является юридическим заключением, не гарантирует победу в тендере " +
  "и не заменяет проверку документов, аккредитации и лицензий. " +
  "Автоматическая подача заявок и юридически значимые действия запрещены без ручного подтверждения.";

export function compareWithCompetitors(
  client: CompanyProfile,
  competitors: CompanyProfile[],
  tender: TenderContext,
): CompetitiveAnalysis {
  const clientScore = computeScore(client, tender);
  const clientComparison: CompetitorComparison = {
    companyInn: client.inn,
    companyName: client.name,
    score: clientScore,
  };

  const competitorComparisons: CompetitorComparison[] = competitors.map((c) => ({
    companyInn: c.inn,
    companyName: c.name,
    score: computeScore(c, tender),
  }));

  const allParticipants = [clientComparison, ...competitorComparisons];
  allParticipants.sort((a, b) => b.score.totalScore - a.score.totalScore);

  const clientRank = allParticipants.findIndex((p) => p.companyInn === client.inn) + 1;

  const allHumanChecks: HumanCheckItem[] = [
    ...clientScore.humanChecks,
  ];
  for (const cc of competitorComparisons) {
    for (const hc of cc.score.humanChecks) {
      const key = `${hc.area}:${hc.reason}`;
      if (!allHumanChecks.some((e) => `${e.area}:${e.reason}` === key)) {
        allHumanChecks.push(hc);
      }
    }
  }

  let verdict: string;
  if (clientScore.recommendation === "insufficient_data") {
    verdict = "Недостаточно данных для объективной оценки — требуется проверка человеком";
  } else if (clientRank === 1) {
    verdict = `Клиент занимает 1-е место из ${allParticipants.length} (${clientScore.totalScore} баллов) — сильная позиция`;
  } else if (clientRank <= Math.ceil(allParticipants.length / 3)) {
    verdict = `Клиент в верхней трети (${clientRank}/${allParticipants.length}, ${clientScore.totalScore} баллов) — хорошие шансы`;
  } else {
    const leader = allParticipants[0]!;
    verdict = `Клиент на ${clientRank}-м месте из ${allParticipants.length} (${clientScore.totalScore} vs ${leader.score.totalScore} у лидера) — конкурентная позиция слабая`;
  }

  return {
    tender: { registryNumber: tender.registryNumber, title: tender.title },
    client: clientComparison,
    competitors: competitorComparisons,
    clientRank,
    totalParticipants: allParticipants.length,
    verdict,
    humanChecks: allHumanChecks,
    disclaimer: DISCLAIMER,
  };
}
