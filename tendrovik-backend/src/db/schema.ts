/**
 * Тендровик AI — PostgreSQL schema (Drizzle ORM).
 *
 * Single source of truth for the whole data model of the backend foundation.
 * Grouped by domain area. All money is stored as NUMERIC (string in JS) to
 * avoid floating-point drift; percentages are NUMERIC too.
 *
 * Nothing here performs legally significant actions — final submission, КЭП,
 * payments and такие действия require a human confirmation handled by the
 * approval / integration layer.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

/* ───────────────────────── Enums ───────────────────────── */

export const roleEnum = pgEnum("role_name", [
  "owner",
  "admin",
  "tender_specialist",
  "lawyer",
  "estimator",
  "sales",
]);

export const integrationKindEnum = pgEnum("integration_kind", [
  "bitrix24",
  "email",
  "procurement_platform",
  "openai",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "not_configured",
  "configured",
  "connected",
  "error",
  "disabled",
]);

export const tenderStatusEnum = pgEnum("tender_status", [
  "new",
  "ingested",
  "parsed",
  "enriched",
  "scored",
  "in_review",
  "decided",
  "archived",
]);

export const decisionEnum = pgEnum("decision_kind", [
  "participate",
  "decline",
  "undecided",
]);

export const priceStrategyEnum = pgEnum("price_strategy", [
  "aggressive",
  "balanced",
  "premium",
]);

export const approvalStepRoleEnum = pgEnum("approval_step_role", [
  "estimator",
  "lawyer",
  "tender_specialist",
  "owner",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "changes_requested",
]);

export const approvalRequestStatusEnum = pgEnum("approval_request_status", [
  "draft",
  "in_progress",
  "approved",
  "rejected",
  "cancelled",
]);

export const crmStageEnum = pgEnum("crm_stage", [
  "lead",
  "qualification",
  "analysis",
  "pricing",
  "approval",
  "submitted",
  "won",
  "lost",
]);

export const crmOutcomeEnum = pgEnum("crm_outcome_kind", ["won", "lost", "no_bid"]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "in_app",
  "telegram",
  "webhook",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "queued",
  "sent",
  "failed",
  "read",
]);

export const supportChannelEnum = pgEnum("support_channel", ["ai_chat", "email", "in_app"]);
export const supportRoleEnum = pgEnum("support_message_role", ["user", "assistant", "agent", "system"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "pending", "resolved", "closed"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "open", "paid", "void", "uncollectible"]);

export const adStatusEnum = pgEnum("ad_status", ["draft", "active", "paused", "archived"]);

export const jobKindEnum = pgEnum("job_kind", [
  "ingest",
  "parse",
  "enrich",
  "score",
  "pricing",
  "monitor",
  "notify",
]);
export const jobStatusEnum = pgEnum("job_status", ["queued", "running", "done", "failed"]);

/* ─────────────────────── Common columns ─────────────────────── */
const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/* ═══════════════════════ Identity & tenancy ═══════════════════════ */

export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  inn: varchar("inn", { length: 12 }),
  kpp: varchar("kpp", { length: 9 }),
  ogrn: varchar("ogrn", { length: 15 }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const users = pgTable(
  "users",
  {
    id: id(),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    passwordHash: text("password_hash"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({ emailIdx: uniqueIndex("users_email_uq").on(t.email) }),
);

export const workspaces = pgTable("workspaces", {
  id: id(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ─────────────── RBAC: roles & permissions ─────────────── */

export const roles = pgTable("roles", {
  id: id(),
  name: roleEnum("name").notNull(),
  description: text("description"),
});

export const permissions = pgTable("permissions", {
  id: id(),
  code: text("code").notNull().unique(), // e.g. "tender.decide", "approval.sign"
  description: text("description"),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .references(() => roles.id, { onDelete: "cascade" })
      .notNull(),
    permissionId: uuid("permission_id")
      .references(() => permissions.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.roleId, t.permissionId] }) }),
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    roleId: uuid("role_id")
      .references(() => roles.id, { onDelete: "cascade" })
      .notNull(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.roleId] }) }),
);

/* ─────────────── Company profile & requisites ─────────────── */

export const companyProfiles = pgTable("company_profiles", {
  id: id(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  legalName: text("legal_name").notNull(),
  shortName: text("short_name"),
  okvedCodes: jsonb("okved_codes").$type<string[]>().default([]).notNull(),
  regions: jsonb("regions").$type<string[]>().default([]).notNull(),
  capabilities: jsonb("capabilities").$type<string[]>().default([]).notNull(),
  // Filled by the AI onboarding опросник:
  profileSurvey: jsonb("profile_survey").$type<Record<string, unknown>>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const requisites = pgTable("requisites", {
  id: id(),
  companyProfileId: uuid("company_profile_id")
    .references(() => companyProfiles.id, { onDelete: "cascade" })
    .notNull(),
  inn: varchar("inn", { length: 12 }),
  kpp: varchar("kpp", { length: 9 }),
  ogrn: varchar("ogrn", { length: 15 }),
  bankName: text("bank_name"),
  bik: varchar("bik", { length: 9 }),
  account: varchar("account", { length: 20 }),
  corrAccount: varchar("corr_account", { length: 20 }),
  legalAddress: text("legal_address"),
  createdAt: createdAt(),
});

/* ─────────────── Knowledge base & pricing rules ─────────────── */

export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: id(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  kind: text("kind").notNull().default("generic"), // template, regulation, past_bid, price_list...
  storageUri: text("storage_uri"), // placeholder — no real object storage wired
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: createdAt(),
});

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: id(),
    documentId: uuid("document_id")
      .references(() => knowledgeDocuments.id, { onDelete: "cascade" })
      .notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    // Embedding stored as jsonb placeholder (pgvector not required in foundation).
    embedding: jsonb("embedding").$type<number[]>(),
    createdAt: createdAt(),
  },
  (t) => ({ docIdx: index("document_chunks_doc_idx").on(t.documentId) }),
);

export const pricingRules = pgTable("pricing_rules", {
  id: id(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  minMarginPct: numeric("min_margin_pct", { precision: 6, scale: 2 }).notNull().default("12"),
  overheadPct: numeric("overhead_pct", { precision: 6, scale: 2 }).notNull().default("0"),
  taxPct: numeric("tax_pct", { precision: 6, scale: 2 }).notNull().default("20"),
  // per-strategy markup over cost, e.g. {"aggressive":5,"balanced":15,"premium":30}
  strategyMarkupPct: jsonb("strategy_markup_pct")
    .$type<Record<string, number>>()
    .default({ aggressive: 5, balanced: 15, premium: 30 })
    .notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: createdAt(),
});

/* ═══════════════════════ Tenders ═══════════════════════ */

export const tenderSources = pgTable("tender_sources", {
  id: id(),
  code: text("code").notNull().unique(), // "zakupki_44fz", "sberast" ...
  title: text("title").notNull(),
  adapter: text("adapter").notNull().default("stub"),
  config: jsonb("config").$type<Record<string, unknown>>().default({}).notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdAt: createdAt(),
});

export const tenders = pgTable(
  "tenders",
  {
    id: id(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").references(() => tenderSources.id, { onDelete: "set null" }),
    externalId: text("external_id").notNull(), // registry number on the source
    title: text("title").notNull(),
    customerName: text("customer_name"),
    customerInn: varchar("customer_inn", { length: 12 }),
    region: text("region"),
    law: text("law"), // 44-ФЗ / 223-ФЗ / commercial
    startPrice: numeric("start_price", { precision: 18, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("RUB").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }),
    status: tenderStatusEnum("status").default("new").notNull(),
    score: numeric("score", { precision: 6, scale: 2 }),
    raw: jsonb("raw").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    extIdx: uniqueIndex("tenders_source_ext_uq").on(t.sourceId, t.externalId),
    statusIdx: index("tenders_status_idx").on(t.status),
  }),
);

export const tenderLots = pgTable("tender_lots", {
  id: id(),
  tenderId: uuid("tender_id")
    .references(() => tenders.id, { onDelete: "cascade" })
    .notNull(),
  lotNumber: integer("lot_number").notNull().default(1),
  title: text("title").notNull(),
  startPrice: numeric("start_price", { precision: 18, scale: 2 }),
  quantity: numeric("quantity", { precision: 18, scale: 3 }),
  unit: text("unit"),
  okpd2: text("okpd2"),
  createdAt: createdAt(),
});

export const tenderDocuments = pgTable("tender_documents", {
  id: id(),
  tenderId: uuid("tender_id")
    .references(() => tenders.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  storageUri: text("storage_uri"),
  mimeType: text("mime_type"),
  parsedText: text("parsed_text"),
  createdAt: createdAt(),
});

/* ─────────────── Competitors & registries ─────────────── */

export const organizationsRegistry = pgTable(
  "organizations_registry",
  {
    id: id(),
    inn: varchar("inn", { length: 12 }).notNull(),
    kpp: varchar("kpp", { length: 9 }),
    name: text("name").notNull(),
    region: text("region"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: createdAt(),
  },
  (t) => ({ innIdx: uniqueIndex("org_registry_inn_uq").on(t.inn) }),
);

export const competitors = pgTable("competitors", {
  id: id(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  registryId: uuid("registry_id").references(() => organizationsRegistry.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  inn: varchar("inn", { length: 12 }),
  winsCount: integer("wins_count").default(0).notNull(),
  avgDiscountPct: numeric("avg_discount_pct", { precision: 6, scale: 2 }),
  notes: text("notes"),
  createdAt: createdAt(),
});

export const winnerHistory = pgTable(
  "winner_history",
  {
    id: id(),
    tenderExternalId: text("tender_external_id").notNull(),
    sourceId: uuid("source_id").references(() => tenderSources.id, { onDelete: "set null" }),
    competitorId: uuid("competitor_id").references(() => competitors.id, { onDelete: "set null" }),
    winnerInn: varchar("winner_inn", { length: 12 }),
    winnerName: text("winner_name").notNull(),
    finalPrice: numeric("final_price", { precision: 18, scale: 2 }),
    startPrice: numeric("start_price", { precision: 18, scale: 2 }),
    discountPct: numeric("discount_pct", { precision: 6, scale: 2 }),
    awardedAt: timestamp("awarded_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => ({ winnerIdx: index("winner_history_inn_idx").on(t.winnerInn) }),
);

/* ─────────────── Decisions, price scenarios, costs ─────────────── */

export const costCalculations = pgTable("cost_calculations", {
  id: id(),
  tenderId: uuid("tender_id")
    .references(() => tenders.id, { onDelete: "cascade" })
    .notNull(),
  lotId: uuid("lot_id").references(() => tenderLots.id, { onDelete: "set null" }),
  // itemized cost lines: [{name, qty, unitCost}]
  lineItems: jsonb("line_items").$type<Array<Record<string, unknown>>>().default([]).notNull(),
  directCost: numeric("direct_cost", { precision: 18, scale: 2 }).notNull().default("0"),
  overhead: numeric("overhead", { precision: 18, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 18, scale: 2 }).notNull().default("0"),
  totalCost: numeric("total_cost", { precision: 18, scale: 2 }).notNull().default("0"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const priceScenarios = pgTable("price_scenarios", {
  id: id(),
  tenderId: uuid("tender_id")
    .references(() => tenders.id, { onDelete: "cascade" })
    .notNull(),
  costCalculationId: uuid("cost_calculation_id").references(() => costCalculations.id, {
    onDelete: "set null",
  }),
  strategy: priceStrategyEnum("strategy").notNull(),
  price: numeric("price", { precision: 18, scale: 2 }).notNull(),
  marginPct: numeric("margin_pct", { precision: 6, scale: 2 }).notNull(),
  winProbabilityPct: numeric("win_probability_pct", { precision: 6, scale: 2 }),
  rationale: text("rationale"),
  createdAt: createdAt(),
});

export const tenderDecisions = pgTable("tender_decisions", {
  id: id(),
  tenderId: uuid("tender_id")
    .references(() => tenders.id, { onDelete: "cascade" })
    .notNull(),
  decision: decisionEnum("decision").default("undecided").notNull(),
  chosenScenarioId: uuid("chosen_scenario_id").references(() => priceScenarios.id, {
    onDelete: "set null",
  }),
  decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
  rationale: text("rationale"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/* ─────────────── Approvals (multi-step sign-off) ─────────────── */

export const approvalRequests = pgTable("approval_requests", {
  id: id(),
  tenderId: uuid("tender_id")
    .references(() => tenders.id, { onDelete: "cascade" })
    .notNull(),
  decisionId: uuid("decision_id").references(() => tenderDecisions.id, { onDelete: "set null" }),
  status: approvalRequestStatusEnum("status").default("draft").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const approvalSteps = pgTable(
  "approval_steps",
  {
    id: id(),
    requestId: uuid("request_id")
      .references(() => approvalRequests.id, { onDelete: "cascade" })
      .notNull(),
    stepOrder: integer("step_order").notNull(),
    role: approvalStepRoleEnum("role").notNull(),
    required: boolean("required").default(true).notNull(),
    status: approvalStatusEnum("status").default("pending").notNull(),
    createdAt: createdAt(),
  },
  (t) => ({ reqIdx: index("approval_steps_req_idx").on(t.requestId) }),
);

export const approvals = pgTable("approvals", {
  id: id(),
  stepId: uuid("step_id")
    .references(() => approvalSteps.id, { onDelete: "cascade" })
    .notNull(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  status: approvalStatusEnum("status").notNull(),
  comment: text("comment"),
  createdAt: createdAt(),
});

export const generatedDocumentPackages = pgTable("generated_document_packages", {
  id: id(),
  tenderId: uuid("tender_id")
    .references(() => tenders.id, { onDelete: "cascade" })
    .notNull(),
  approvalRequestId: uuid("approval_request_id").references(() => approvalRequests.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  // list of generated files (placeholders, not real objects)
  files: jsonb("files").$type<Array<Record<string, unknown>>>().default([]).notNull(),
  isReadyForSubmission: boolean("is_ready_for_submission").default(false).notNull(),
  createdAt: createdAt(),
});

/* ─────────────── Monitoring & notifications ─────────────── */

export const monitoringRules = pgTable("monitoring_rules", {
  id: id(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  // JSON filter: regions, okpd2, keywords, price range, deadline window (days)
  filter: jsonb("filter").$type<Record<string, unknown>>().default({}).notNull(),
  deadlineWarningDays: integer("deadline_warning_days").default(3).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: createdAt(),
});

export const monitoringEvents = pgTable("monitoring_events", {
  id: id(),
  ruleId: uuid("rule_id").references(() => monitoringRules.id, { onDelete: "cascade" }),
  tenderId: uuid("tender_id").references(() => tenders.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // "match", "deadline_soon", "status_changed"
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: createdAt(),
});

export const notifications = pgTable("notifications", {
  id: id(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  channel: notificationChannelEnum("channel").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  status: notificationStatusEnum("status").default("queued").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: createdAt(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

/* ─────────────── CRM pipeline ─────────────── */

export const lossReasons = pgTable("loss_reasons", {
  id: id(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
});

export const crmPipelineItems = pgTable(
  "crm_pipeline_items",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    tenderId: uuid("tender_id").references(() => tenders.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    stage: crmStageEnum("stage").default("lead").notNull(),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    amount: numeric("amount", { precision: 18, scale: 2 }),
    enteredStageAt: timestamp("entered_stage_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({ stageIdx: index("crm_items_stage_idx").on(t.stage) }),
);

export const crmOutcomes = pgTable("crm_outcomes", {
  id: id(),
  pipelineItemId: uuid("pipeline_item_id")
    .references(() => crmPipelineItems.id, { onDelete: "cascade" })
    .notNull(),
  outcome: crmOutcomeEnum("outcome").notNull(),
  lossReasonId: uuid("loss_reason_id").references(() => lossReasons.id, { onDelete: "set null" }),
  finalAmount: numeric("final_amount", { precision: 18, scale: 2 }),
  comment: text("comment"),
  createdAt: createdAt(),
});

/* ─────────────── Support (AI chat + tickets) ─────────────── */

export const supportConversations = pgTable("support_conversations", {
  id: id(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  channel: supportChannelEnum("channel").default("ai_chat").notNull(),
  subject: text("subject"),
  isEscalated: boolean("is_escalated").default(false).notNull(),
  createdAt: createdAt(),
});

export const supportMessages = pgTable("support_messages", {
  id: id(),
  conversationId: uuid("conversation_id")
    .references(() => supportConversations.id, { onDelete: "cascade" })
    .notNull(),
  role: supportRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: createdAt(),
});

export const supportTickets = pgTable("support_tickets", {
  id: id(),
  conversationId: uuid("conversation_id").references(() => supportConversations.id, {
    onDelete: "set null",
  }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  subject: text("subject").notNull(),
  status: ticketStatusEnum("status").default("open").notNull(),
  priority: text("priority").default("normal").notNull(),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ─────────────── Billing (STUBS only) ─────────────── */

export const plans = pgTable("plans", {
  id: id(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  priceMonthly: numeric("price_monthly", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: varchar("currency", { length: 3 }).default("RUB").notNull(),
  features: jsonb("features").$type<Record<string, unknown>>().default({}).notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: id(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  planId: uuid("plan_id").references(() => plans.id, { onDelete: "set null" }),
  status: subscriptionStatusEnum("status").default("trialing").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: createdAt(),
});

export const invoices = pgTable("invoices", {
  id: id(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: varchar("currency", { length: 3 }).default("RUB").notNull(),
  status: invoiceStatusEnum("status").default("draft").notNull(),
  // Stub only: no real payment gateway; provider reference is a placeholder.
  externalRef: text("external_ref"),
  createdAt: createdAt(),
});

export const paymentEvents = pgTable("payment_events", {
  id: id(),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // "stub.created", "stub.paid" ...
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: createdAt(),
});

/* ─────────────── Integrations (status + config placeholders) ─────────────── */

export const integrations = pgTable(
  "integrations",
  {
    id: id(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    kind: integrationKindEnum("kind").notNull(),
    title: text("title").notNull(),
    status: integrationStatusEnum("status").default("not_configured").notNull(),
    // Non-secret placeholders only; real secrets live in env, never in DB.
    configPlaceholders: jsonb("config_placeholders")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({ kindIdx: uniqueIndex("integrations_ws_kind_uq").on(t.workspaceId, t.kind) }),
);

/* ─────────────── Advertising ─────────────── */

export const adSlots = pgTable("ad_slots", {
  id: id(),
  code: text("code").notNull().unique(), // "dashboard_top", "tender_card_side"
  title: text("title").notNull(),
  width: integer("width"),
  height: integer("height"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: createdAt(),
});

export const adCampaigns = pgTable("ad_campaigns", {
  id: id(),
  slotId: uuid("slot_id").references(() => adSlots.id, { onDelete: "cascade" }),
  advertiser: text("advertiser").notNull(), // "KomExpo", "Курсы", "Франшиза", "Образовательный центр"
  title: text("title").notNull(),
  imageUri: text("image_uri"),
  targetUrl: text("target_url"),
  weight: integer("weight").default(1).notNull(), // rotation weight
  status: adStatusEnum("status").default("active").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const adImpressions = pgTable("ad_impressions", {
  id: id(),
  campaignId: uuid("campaign_id")
    .references(() => adCampaigns.id, { onDelete: "cascade" })
    .notNull(),
  slotId: uuid("slot_id").references(() => adSlots.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  shownAt: timestamp("shown_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adClicks = pgTable("ad_clicks", {
  id: id(),
  campaignId: uuid("campaign_id")
    .references(() => adCampaigns.id, { onDelete: "cascade" })
    .notNull(),
  impressionId: uuid("impression_id").references(() => adImpressions.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  clickedAt: timestamp("clicked_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ─────────────── Background jobs & audit ─────────────── */

export const jobs = pgTable(
  "jobs",
  {
    id: id(),
    kind: jobKindEnum("kind").notNull(),
    status: jobStatusEnum("status").default("queued").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lastError: text("last_error"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: createdAt(),
  },
  (t) => ({ statusIdx: index("jobs_status_idx").on(t.status) }),
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(), // "tender.decision.made", "approval.signed" ...
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: createdAt(),
  },
  (t) => ({
    actionIdx: index("audit_action_idx").on(t.action),
    entityIdx: index("audit_entity_idx").on(t.entityType, t.entityId),
  }),
);

/* ─────────────── Aggregate export for migrations / typing ─────────────── */
export const schema = {
  organizations,
  users,
  workspaces,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  companyProfiles,
  requisites,
  knowledgeDocuments,
  documentChunks,
  pricingRules,
  tenderSources,
  tenders,
  tenderLots,
  tenderDocuments,
  organizationsRegistry,
  competitors,
  winnerHistory,
  costCalculations,
  priceScenarios,
  tenderDecisions,
  approvalRequests,
  approvalSteps,
  approvals,
  generatedDocumentPackages,
  monitoringRules,
  monitoringEvents,
  notifications,
  lossReasons,
  crmPipelineItems,
  crmOutcomes,
  supportConversations,
  supportMessages,
  supportTickets,
  plans,
  subscriptions,
  invoices,
  paymentEvents,
  integrations,
  adSlots,
  adCampaigns,
  adImpressions,
  adClicks,
  jobs,
  auditLog,
};
