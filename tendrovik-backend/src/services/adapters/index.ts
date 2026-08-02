/**
 * Portable service interfaces (ports).
 *
 * These describe the contracts the platform depends on. Concrete adapters live
 * in ../stubs (safe, no real network calls) and can later be swapped for real
 * implementations without touching domain code.
 */

/* ─────────────── Tender sources ─────────────── */

export interface RawTender {
  externalId: string;
  title: string;
  customerName?: string;
  customerInn?: string;
  region?: string;
  law?: string;
  startPrice?: number;
  currency?: string;
  publishedAt?: string; // ISO
  deadlineAt?: string; // ISO
  raw?: Record<string, unknown>;
}

export interface TenderSearchQuery {
  keywords?: string[];
  regions?: string[];
  okpd2?: string[];
  minPrice?: number;
  maxPrice?: number;
  publishedSince?: string;
  limit?: number;
}

/** A pluggable connector to a procurement platform (zakupki, sberast, ...). */
export interface TenderSourceAdapter {
  readonly code: string;
  search(query: TenderSearchQuery): Promise<RawTender[]>;
  fetchOne(externalId: string): Promise<RawTender | null>;
  /** Optional: pull document metadata for a tender. */
  listDocuments?(externalId: string): Promise<Array<{ title: string; uri?: string }>>;
}

/* ─────────────── AI provider ─────────────── */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionResult {
  text: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}

/** Abstraction over an LLM (OpenAI-compatible or any other). */
export interface AIProvider {
  readonly name: string;
  complete(messages: ChatMessage[], opts?: { temperature?: number }): Promise<CompletionResult>;
  embed(texts: string[]): Promise<number[][]>;
}

/* ─────────────── CRM adapter (Bitrix24) ─────────────── */

export interface CrmDeal {
  id: string;
  title: string;
  stage: string;
  amount?: number;
  contactId?: string;
}

/** CRM sync port; the reference target is Bitrix24. */
export interface CRMAdapter {
  readonly name: string;
  upsertDeal(deal: Omit<CrmDeal, "id"> & { id?: string }): Promise<CrmDeal>;
  moveStage(dealId: string, stage: string): Promise<void>;
  addNote(dealId: string, note: string): Promise<void>;
}

/* ─────────────── Payments (stub) ─────────────── */

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: "created" | "paid" | "failed";
  externalRef?: string;
}

/**
 * Payment port. Implementations in the foundation module NEVER charge real
 * money — they only simulate intents so billing flows can be wired end-to-end.
 */
export interface PaymentProvider {
  readonly name: string;
  createIntent(input: { amount: number; currency: string; invoiceId: string }): Promise<PaymentIntent>;
  getIntent(id: string): Promise<PaymentIntent | null>;
}

/* ─────────────── Notifications ─────────────── */

export interface NotificationMessage {
  channel: "email" | "in_app" | "telegram" | "webhook";
  to: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
}

export interface NotificationResult {
  delivered: boolean;
  providerMessageId?: string;
}

export interface NotificationProvider {
  readonly name: string;
  send(message: NotificationMessage): Promise<NotificationResult>;
}
