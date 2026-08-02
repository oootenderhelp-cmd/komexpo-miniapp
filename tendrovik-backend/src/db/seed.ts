/**
 * Seed runner — inserts the demo dataset into PostgreSQL.
 *
 * Requires DATABASE_URL and an applied schema (`npm run db:push`). Run with
 * `npm run seed`. Safe to read as a reference for how the tables relate.
 */
import { getDb, closeDb } from "./index.js";
import * as t from "./schema.js";
import * as S from "./seed-data.js";

async function seed() {
  const db = getDb();
  console.log("Seeding Тендровик AI demo data…");

  // Organization + workspace
  const [org] = await db.insert(t.organizations).values(S.seedOrganization).returning();
  const [ws] = await db
    .insert(t.workspaces)
    .values({ organizationId: org!.id, name: "Демо-пространство", slug: "demo" })
    .returning();

  // Roles + permissions
  const roleRows = await db
    .insert(t.roles)
    .values(S.seedRoles.map((name) => ({ name })))
    .returning();
  const roleByName = new Map(roleRows.map((r) => [r.name, r.id]));
  await db.insert(t.permissions).values(S.seedPermissions).returning();

  // Users + role assignments
  const userRows = await db
    .insert(t.users)
    .values(
      S.seedUsers.map((u) => ({ organizationId: org!.id, email: u.email, fullName: u.fullName })),
    )
    .returning();
  const userByKey = new Map(S.seedUsers.map((u, i) => [u.key, userRows[i]!.id]));
  await db.insert(t.userRoles).values(
    S.seedUsers.map((u) => ({
      userId: userByKey.get(u.key)!,
      roleId: roleByName.get(u.role)!,
      workspaceId: ws!.id,
    })),
  );

  // Company profile + requisites
  const [profile] = await db
    .insert(t.companyProfiles)
    .values({
      organizationId: org!.id,
      legalName: S.seedOrganization.name,
      shortName: "Тендровик Демо",
      okvedCodes: ["49.41", "52.29"],
      regions: ["Москва", "Московская область"],
      capabilities: ["Экспедирование", "Поставка канцтоваров", "Клининг"],
      profileSurvey: { onboarded: true, focus: "логистика и поставки" },
    })
    .returning();
  await db.insert(t.requisites).values({
    companyProfileId: profile!.id,
    inn: S.seedOrganization.inn,
    kpp: S.seedOrganization.kpp,
    ogrn: S.seedOrganization.ogrn,
    bankName: "ПАО Демо-Банк",
  });

  // Pricing rule
  await db.insert(t.pricingRules).values({ workspaceId: ws!.id, ...S.seedPricingRule });

  // Tender source + tenders
  const [source] = await db.insert(t.tenderSources).values(S.seedTenderSource).returning();
  const tenderRows = await db
    .insert(t.tenders)
    .values(S.seedTenders.map((td) => ({ ...td, workspaceId: ws!.id, sourceId: source!.id })))
    .returning();
  const tenderByExt = new Map(tenderRows.map((r) => [r.externalId, r]));

  // A couple of lots + documents for tender #1
  const t1 = tenderByExt.get("0173100000123000001")!;
  await db.insert(t.tenderLots).values({ tenderId: t1.id, lotNumber: 1, title: "Канцелярия", startPrice: "850000.00" });
  await db.insert(t.tenderDocuments).values({ tenderId: t1.id, title: "Извещение.pdf" });

  // Registry, competitors, winner history (repeating winners)
  await db.insert(t.organizationsRegistry).values(S.seedOrganizationsRegistry);
  const compRows = await db
    .insert(t.competitors)
    .values(S.seedCompetitors.map((c) => ({ ...c, workspaceId: ws!.id })))
    .returning();
  const compByInn = new Map(compRows.map((c) => [c.inn, c.id]));
  await db.insert(t.winnerHistory).values(
    S.seedWinnerHistory.map((w) => ({
      tenderExternalId: w.tenderExternalId,
      sourceId: source!.id,
      competitorId: compByInn.get(w.winnerInn) ?? null,
      winnerInn: w.winnerInn,
      winnerName: w.winnerName,
      startPrice: w.startPrice,
      finalPrice: w.finalPrice,
      discountPct: w.discountPct,
    })),
  );

  // Cost calculation + price scenarios for tender #1
  const [calc] = await db
    .insert(t.costCalculations)
    .values({
      tenderId: t1.id,
      lineItems: S.seedCostCalculation.lineItems,
      directCost: S.seedCostCalculation.directCost,
      overhead: S.seedCostCalculation.overhead,
      tax: S.seedCostCalculation.tax,
      totalCost: S.seedCostCalculation.totalCost,
      createdBy: userByKey.get("estimator")!,
    })
    .returning();
  const scenarioRows = await db
    .insert(t.priceScenarios)
    .values(S.seedPriceScenarios.map((s) => ({ ...s, tenderId: t1.id, costCalculationId: calc!.id })))
    .returning();

  // Decision for tender #5 (participate)
  const t5 = tenderByExt.get("0173100000123000005")!;
  await db.insert(t.tenderDecisions).values({
    tenderId: t5.id,
    decision: "participate",
    decidedBy: userByKey.get("owner")!,
    rationale: "Высокий скоринг и профильная услуга.",
    decidedAt: new Date(),
  });

  // Approval request with estimator + lawyer approved
  const [appReq] = await db
    .insert(t.approvalRequests)
    .values({ tenderId: t1.id, status: S.seedApproval.requestStatus, createdBy: userByKey.get("specialist")! })
    .returning();
  const stepRows = await db
    .insert(t.approvalSteps)
    .values(
      S.seedApproval.steps.map((s) => ({
        requestId: appReq!.id,
        stepOrder: s.order,
        role: s.role,
        status: s.status,
      })),
    )
    .returning();
  for (const s of S.seedApproval.steps) {
    if (s.status === "approved") {
      const step = stepRows.find((r) => r.role === s.role)!;
      const actor = s.role === "estimator" ? "estimator" : "lawyer";
      await db.insert(t.approvals).values({
        stepId: step.id,
        actorId: userByKey.get(actor)!,
        status: "approved",
        comment: s.comment ?? undefined,
      });
    }
  }

  // Loss reasons + CRM items + funnel outcome samples
  await db.insert(t.lossReasons).values(S.seedLossReasons);
  const crmRows = await db
    .insert(t.crmPipelineItems)
    .values(
      S.seedCrmItems.map((c) => ({
        workspaceId: ws!.id,
        tenderId: tenderByExt.get(c.tenderExternalId)?.id ?? null,
        title: c.title,
        stage: c.stage,
        amount: c.amount,
        ownerId: userByKey.get("sales")!,
      })),
    )
    .returning();
  await db.insert(t.crmOutcomes).values({
    pipelineItemId: crmRows[0]!.id,
    outcome: "won",
    finalAmount: "362208.00",
    comment: "Победа по агрессивной стратегии.",
  });

  // Ads
  const slotRows = await db.insert(t.adSlots).values(S.seedAdSlots).returning();
  const slotByCode = new Map(slotRows.map((s) => [s.code, s.id]));
  await db.insert(t.adCampaigns).values(
    S.seedAdCampaigns.map((c) => ({
      slotId: slotByCode.get(c.slotCode) ?? null,
      advertiser: c.advertiser,
      title: c.title,
      targetUrl: c.targetUrl,
      weight: c.weight,
      status: c.status,
    })),
  );

  // Billing stubs
  const planRows = await db.insert(t.plans).values(S.seedPlans).returning();
  const [sub] = await db
    .insert(t.subscriptions)
    .values({ organizationId: org!.id, planId: planRows[1]!.id, status: "trialing" })
    .returning();
  const [inv] = await db
    .insert(t.invoices)
    .values({ subscriptionId: sub!.id, organizationId: org!.id, amount: "9900.00", status: "open" })
    .returning();
  await db.insert(t.paymentEvents).values({ invoiceId: inv!.id, kind: "stub.created", payload: { note: "no real charge" } });

  // Integrations (status + placeholders only)
  await db.insert(t.integrations).values(
    S.seedIntegrations.map((i) => ({ workspaceId: ws!.id, ...i })),
  );

  // Monitoring + notification samples
  const [rule] = await db
    .insert(t.monitoringRules)
    .values({ workspaceId: ws!.id, name: "Логистика в Москве", filter: { regions: ["Москва"], keywords: ["перевозк", "экспедир"] }, deadlineWarningDays: 3 })
    .returning();
  await db.insert(t.monitoringEvents).values({ ruleId: rule!.id, tenderId: t5.id, kind: "match", payload: { matched: ["экспедир"] } });
  await db.insert(t.notifications).values({ userId: userByKey.get("specialist")!, channel: "in_app", title: "Новый подходящий тендер", body: "Экспедирование — ТоргСеть", status: "queued" });

  // Support conversation + ticket
  const [conv] = await db
    .insert(t.supportConversations)
    .values({ userId: userByKey.get("sales")!, channel: "ai_chat", subject: "Как рассчитать цену?" })
    .returning();
  await db.insert(t.supportMessages).values([
    { conversationId: conv!.id, role: "user", content: "Как выбрать стратегию цены?" },
    { conversationId: conv!.id, role: "assistant", content: "Есть три стратегии: агрессивная, сбалансированная, премиальная." },
  ]);

  // Audit sample
  await db.insert(t.auditLog).values({
    workspaceId: ws!.id,
    actorId: userByKey.get("owner")!,
    action: "seed.completed",
    entityType: "workspace",
    entityId: ws!.id,
    metadata: { tenders: tenderRows.length, scenarios: scenarioRows.length },
  });

  console.log(`Seed complete: org=${org!.name}, tenders=${tenderRows.length}, users=${userRows.length}`);
}

seed()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await closeDb();
    process.exit(1);
  });
