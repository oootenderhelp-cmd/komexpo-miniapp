/**
 * Stub adapter implementations.
 *
 * These are deterministic, dependency-free, and make NO real network calls.
 * They let the whole platform run and be tested end-to-end without any external
 * account, API key, or procurement площадка. Swap for real adapters in prod.
 */
import type {
  AIProvider,
  ChatMessage,
  CompletionResult,
  CRMAdapter,
  CrmDeal,
  NotificationMessage,
  NotificationProvider,
  NotificationResult,
  PaymentIntent,
  PaymentProvider,
  RawTender,
  TenderSearchQuery,
  TenderSourceAdapter,
} from "../adapters/index.js";

/* ─────────────── Tender source stub ─────────────── */

export class StubTenderSourceAdapter implements TenderSourceAdapter {
  constructor(
    readonly code = "stub_source",
    private readonly catalog: RawTender[] = STUB_TENDER_CATALOG,
  ) {}

  async search(query: TenderSearchQuery): Promise<RawTender[]> {
    let out = this.catalog;
    if (query.keywords?.length) {
      const kw = query.keywords.map((k) => k.toLowerCase());
      out = out.filter((t) => kw.some((k) => t.title.toLowerCase().includes(k)));
    }
    if (query.regions?.length) out = out.filter((t) => t.region && query.regions!.includes(t.region));
    if (query.minPrice != null) out = out.filter((t) => (t.startPrice ?? 0) >= query.minPrice!);
    if (query.maxPrice != null) out = out.filter((t) => (t.startPrice ?? 0) <= query.maxPrice!);
    return out.slice(0, query.limit ?? 50);
  }

  async fetchOne(externalId: string): Promise<RawTender | null> {
    return this.catalog.find((t) => t.externalId === externalId) ?? null;
  }

  async listDocuments(externalId: string) {
    return [
      { title: `Извещение ${externalId}.pdf` },
      { title: `Техническое задание ${externalId}.docx` },
    ];
  }
}

export const STUB_TENDER_CATALOG: RawTender[] = [
  {
    externalId: "0173100000123000001",
    title: "Поставка канцелярских товаров для нужд учреждения",
    customerName: "ГБУ «Центр закупок»",
    region: "Москва",
    law: "44-ФЗ",
    startPrice: 850000,
    currency: "RUB",
  },
  {
    externalId: "0173100000123000002",
    title: "Транспортно-экспедиционные услуги по перевозке грузов",
    customerName: "АО «ЛогистикТранс»",
    region: "Московская область",
    law: "223-ФЗ",
    startPrice: 4200000,
    currency: "RUB",
  },
];

/* ─────────────── AI provider stub ─────────────── */

export class StubAIProvider implements AIProvider {
  readonly name = "stub-ai";

  async complete(messages: ChatMessage[]): Promise<CompletionResult> {
    const last = messages[messages.length - 1]?.content ?? "";
    return {
      text: `[stub-ai] Готов помочь. Вы написали: "${last.slice(0, 120)}". ` +
        `Реальный AIProvider не подключён — задайте OPENAI_API_KEY.`,
      model: "stub-model",
      usage: { promptTokens: last.length, completionTokens: 24 },
    };
  }

  async embed(texts: string[]): Promise<number[][]> {
    // Deterministic pseudo-embedding (hash → 8 dims). Not for real retrieval.
    return texts.map((t) => {
      const v = new Array(8).fill(0);
      for (let i = 0; i < t.length; i++) v[i % 8] += t.charCodeAt(i);
      const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
      return v.map((x) => x / norm);
    });
  }
}

/* ─────────────── Bitrix24 CRM stub ─────────────── */

export class Bitrix24CRMAdapterStub implements CRMAdapter {
  readonly name = "bitrix24-stub";
  private seq = 0;
  private readonly deals = new Map<string, CrmDeal>();

  async upsertDeal(deal: Omit<CrmDeal, "id"> & { id?: string }): Promise<CrmDeal> {
    const id = deal.id ?? `stub-deal-${++this.seq}`;
    const saved: CrmDeal = { ...deal, id };
    this.deals.set(id, saved);
    return saved;
  }

  async moveStage(dealId: string, stage: string): Promise<void> {
    const d = this.deals.get(dealId);
    if (d) d.stage = stage;
  }

  async addNote(_dealId: string, _note: string): Promise<void> {
    /* no-op stub */
  }
}

/* ─────────────── Payment stub (no real charges) ─────────────── */

export class StubPaymentProvider implements PaymentProvider {
  readonly name = "stub-payments";
  private seq = 0;
  private readonly intents = new Map<string, PaymentIntent>();

  async createIntent(input: { amount: number; currency: string; invoiceId: string }): Promise<PaymentIntent> {
    const intent: PaymentIntent = {
      id: `stub-pi-${++this.seq}`,
      amount: input.amount,
      currency: input.currency,
      status: "created",
      externalRef: `stub:${input.invoiceId}`,
    };
    this.intents.set(intent.id, intent);
    return intent;
  }

  async getIntent(id: string): Promise<PaymentIntent | null> {
    return this.intents.get(id) ?? null;
  }
}

/* ─────────────── Notification stub ─────────────── */

export class StubNotificationProvider implements NotificationProvider {
  readonly name = "stub-notifications";
  readonly outbox: NotificationMessage[] = [];

  async send(message: NotificationMessage): Promise<NotificationResult> {
    this.outbox.push(message);
    return { delivered: true, providerMessageId: `stub-msg-${this.outbox.length}` };
  }
}
