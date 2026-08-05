import type { NormalizedTender, TenderDocumentRef } from "../interfaces/index.js";
import type {
  RawTenderPayload,
  EisRawTender,
  B2bCenterRawTender,
  SberbankAstRawTender,
} from "../fixtures/index.js";

function normalizeEis(raw: EisRawTender): NormalizedTender {
  return {
    sourceCode: "eis",
    sourceName: "ЕИС (zakupki.gov.ru)",
    sourceUrl: "https://zakupki.gov.ru",
    externalId: raw.registryNumber,
    registryNumber: raw.registryNumber,
    title: raw.purchaseObjectInfo,
    customerName: raw.customerInfo.fullName,
    customerInn: raw.customerInfo.inn,
    region: raw.region,
    law: raw.federalLaw,
    segments: [raw.federalLaw === "44-ФЗ" ? "federal_44fz" : "federal_223fz"],
    startPrice: raw.maxPrice.amount,
    currency: raw.maxPrice.currency,
    publishedAt: new Date(raw.publishDate),
    deadlineAt: new Date(raw.endDate),
    status: raw.state,
    documents: raw.attachments.map(
      (a): TenderDocumentRef => ({
        title: a.fileName,
        uri: a.url,
        sizeBytes: a.size,
      }),
    ),
    lotCount: raw.lots.length,
    rawPayload: raw,
  };
}

function normalizeB2bCenter(raw: B2bCenterRawTender): NormalizedTender {
  return {
    sourceCode: "b2b_center",
    sourceName: "B2B-Center",
    sourceUrl: "https://www.b2b-center.ru",
    externalId: raw.id,
    title: raw.name,
    customerName: raw.organizer.company,
    customerInn: raw.organizer.inn,
    region: raw.area,
    segments: ["commercial"],
    startPrice: raw.budget?.value,
    currency: raw.budget?.currency ?? "RUB",
    publishedAt: raw.published ? new Date(raw.published) : undefined,
    deadlineAt: raw.deadline ? new Date(raw.deadline) : undefined,
    status: raw.status,
    documents: raw.docs.map(
      (d): TenderDocumentRef => ({
        title: d.name,
        uri: d.link,
      }),
    ),
    rawPayload: raw,
  };
}

function normalizeSberbankAst(raw: SberbankAstRawTender): NormalizedTender {
  return {
    sourceCode: "sberbank_ast",
    sourceName: "Сбербанк-АСТ",
    sourceUrl: "https://www.sberbank-ast.ru",
    externalId: raw.tradeId,
    title: raw.tradeName,
    customerName: raw.customer.name,
    customerInn: raw.customer.inn,
    region: raw.customer.region,
    law: "44-ФЗ",
    segments: ["federal_44fz"],
    startPrice: raw.nmck,
    currency: raw.currency,
    publishedAt: new Date(raw.publicationDate),
    deadlineAt: new Date(raw.submissionDeadline),
    status: raw.procedureStatus,
    documents: raw.documentation.map(
      (d): TenderDocumentRef => ({
        title: d.title,
        uri: d.downloadUrl,
        mimeType: d.contentType,
        sizeBytes: d.bytes,
      }),
    ),
    rawPayload: raw,
  };
}

export function normalize(raw: RawTenderPayload): NormalizedTender {
  switch (raw.format) {
    case "eis":
      return normalizeEis(raw);
    case "b2b_center":
      return normalizeB2bCenter(raw);
    case "sberbank_ast":
      return normalizeSberbankAst(raw);
    default: {
      const _exhaustive: never = raw;
      throw new Error(`Unknown format: ${(_exhaustive as RawTenderPayload).format}`);
    }
  }
}

export type DedupeKey = `${string}:${string}`;

export function dedupeKey(t: NormalizedTender): DedupeKey {
  return `${t.sourceCode}:${t.externalId}`;
}

export function deduplicate(tenders: NormalizedTender[]): NormalizedTender[] {
  const seen = new Set<DedupeKey>();
  const result: NormalizedTender[] = [];
  for (const t of tenders) {
    const key = dedupeKey(t);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(t);
    }
  }
  return result;
}
