import { eq, desc, asc, and, like, sql, or, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  userProfiles,
  categories,
  kvorki,
  projects,
  projectResponses,
  orders,
  orderMilestones,
  transactions,
  reviews,
  chatMessages,
  favorites,
  notifications,
  disputes,
  adBanners,
  dentalLeads,
  dentalLeadEvents,
  dentalPartners,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { URGENCY_SLA_MINUTES as DENTAL_SLA_MINUTES } from "@shared/dental";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "owner";
      updateSet.role = "owner";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0)
      updateSet.lastSignedIn = new Date();
    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPasswordHash(
  openId: string,
  passwordHash: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn(
      "[Database] Cannot update password hash: database not available"
    );
    return;
  }
  await db.update(users).set({ passwordHash }).where(eq(users.openId, openId));
}

export async function getUserPasswordHash(
  openId: string
): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result[0]?.passwordHash ?? null;
}

// ============ PROFILES ============
export async function getProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return result[0] || undefined;
}

export async function upsertProfile(
  userId: number,
  data: Partial<typeof userProfiles.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  const existing = await getProfile(userId);
  if (existing) {
    await db
      .update(userProfiles)
      .set(data)
      .where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({ userId, ...data });
  }
  return getProfile(userId);
}

// ============ CATEGORIES ============
export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder));
}

// ============ KVORKI ============
export async function getKvorki(filters?: {
  categoryId?: number;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions = [eq(kvorki.status, "active")];
  if (filters?.categoryId)
    conditions.push(eq(kvorki.categoryId, filters.categoryId));
  if (filters?.search)
    conditions.push(like(kvorki.title, `%${filters.search}%`));
  if (filters?.minPrice)
    conditions.push(sql`${kvorki.price} >= ${filters.minPrice}`);
  if (filters?.maxPrice)
    conditions.push(sql`${kvorki.price} <= ${filters.maxPrice}`);
  const where = and(...conditions);
  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(kvorki)
      .where(where)
      .orderBy(desc(kvorki.createdAt))
      .limit(filters?.limit || 20)
      .offset(filters?.offset || 0),
    db
      .select({ count: sql<number>`count(*)` })
      .from(kvorki)
      .where(where),
  ]);
  return { items, total: Number(countResult[0]?.count || 0) };
}

export async function getKvorkaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(kvorki)
    .where(eq(kvorki.id, id))
    .limit(1);
  return result[0] || undefined;
}

export async function getUserKvorki(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(kvorki)
    .where(eq(kvorki.userId, userId))
    .orderBy(desc(kvorki.createdAt));
}

export async function createKvorka(data: typeof kvorki.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(kvorki).values(data);
  return result[0].insertId;
}

export async function updateKvorka(
  id: number,
  userId: number,
  data: Partial<typeof kvorki.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(kvorki)
    .set(data)
    .where(and(eq(kvorki.id, id), eq(kvorki.userId, userId)));
}

// ============ PROJECTS ============
export async function getProjects(filters?: {
  categoryId?: number;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions: any[] = [];
  if (filters?.status)
    conditions.push(eq(projects.status, filters.status as any));
  else conditions.push(eq(projects.status, "open"));
  if (filters?.categoryId)
    conditions.push(eq(projects.categoryId, filters.categoryId));
  const where = and(...conditions);
  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(where)
      .orderBy(desc(projects.createdAt))
      .limit(filters?.limit || 20)
      .offset(filters?.offset || 0),
    db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(where),
  ]);
  return { items, total: Number(countResult[0]?.count || 0) };
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return result[0] || undefined;
}

export async function createProject(data: typeof projects.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(projects).values(data);
  return result[0].insertId;
}

export async function getProjectResponses(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(projectResponses)
    .where(eq(projectResponses.projectId, projectId))
    .orderBy(desc(projectResponses.createdAt));
}

export async function createProjectResponse(
  data: typeof projectResponses.$inferInsert
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(projectResponses).values(data);
  await db
    .update(projects)
    .set({ responseCount: sql`responseCount + 1` })
    .where(eq(projects.id, data.projectId));
  return result[0].insertId;
}

// ============ ORDERS ============
export async function createOrder(data: typeof orders.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(orders).values(data);
  return result[0].insertId;
}

export async function getOrdersByUser(
  userId: number,
  role: "customer" | "contractor"
) {
  const db = await getDb();
  if (!db) return [];
  const condition =
    role === "customer"
      ? eq(orders.customerId, userId)
      : eq(orders.contractorId, userId);
  return db
    .select()
    .from(orders)
    .where(condition)
    .orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  return result[0] || undefined;
}

export async function updateOrderStatus(
  id: number,
  status: string,
  extra?: Record<string, any>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(orders)
    .set({ status: status as any, ...extra })
    .where(eq(orders.id, id));
}

// ============ TRANSACTIONS ============
export async function getUserTransactions(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}

export async function createTransaction(
  data: typeof transactions.$inferInsert
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(transactions).values(data);
  return result[0].insertId;
}

// ============ REVIEWS ============
export async function getReviewsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(reviews)
    .where(eq(reviews.toUserId, userId))
    .orderBy(desc(reviews.createdAt));
}

export async function createReview(data: typeof reviews.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(reviews).values(data);
  return result[0].insertId;
}

// ============ CHAT ============
export async function getChatMessages(
  userId: number,
  otherUserId: number,
  orderId?: number
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    or(
      and(
        eq(chatMessages.senderId, userId),
        eq(chatMessages.receiverId, otherUserId)
      ),
      and(
        eq(chatMessages.senderId, otherUserId),
        eq(chatMessages.receiverId, userId)
      )
    ),
  ];
  if (orderId) conditions.push(eq(chatMessages.orderId, orderId));
  return db
    .select()
    .from(chatMessages)
    .where(and(...conditions))
    .orderBy(asc(chatMessages.createdAt))
    .limit(200);
}

export async function getChatList(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const sent = await db
    .select({ partnerId: chatMessages.receiverId })
    .from(chatMessages)
    .where(eq(chatMessages.senderId, userId))
    .groupBy(chatMessages.receiverId);
  const received = await db
    .select({ partnerId: chatMessages.senderId })
    .from(chatMessages)
    .where(eq(chatMessages.receiverId, userId))
    .groupBy(chatMessages.senderId);
  const allIds = [
    ...sent.map(s => s.partnerId),
    ...received.map(r => r.partnerId),
  ];
  const partnerIds = allIds.filter((id, index) => allIds.indexOf(id) === index);
  return partnerIds;
}

export async function sendMessage(data: typeof chatMessages.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(chatMessages).values(data);
  return result[0].insertId;
}

// ============ FAVORITES ============
export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(favorites).where(eq(favorites.userId, userId));
}

export async function toggleFavorite(
  userId: number,
  kvorkiId?: number,
  contractorId?: number
) {
  const db = await getDb();
  if (!db) return;
  const conditions = [eq(favorites.userId, userId)];
  if (kvorkiId) conditions.push(eq(favorites.kvorkiId, kvorkiId));
  if (contractorId) conditions.push(eq(favorites.contractorId, contractorId));
  const existing = await db
    .select()
    .from(favorites)
    .where(and(...conditions))
    .limit(1);
  if (existing.length > 0) {
    await db.delete(favorites).where(eq(favorites.id, existing[0].id));
    return false;
  } else {
    await db.insert(favorites).values({ userId, kvorkiId, contractorId });
    return true;
  }
}

// ============ NOTIFICATIONS ============
export async function getUserNotifications(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
}

// ============ ADMIN ============
export async function getAllUsers(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(users),
  ]);
  return { items, total: Number(countResult[0]?.count || 0) };
}

export async function getAllKvorkiAdmin(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(kvorki)
      .orderBy(desc(kvorki.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(kvorki),
  ]);
  return { items, total: Number(countResult[0]?.count || 0) };
}

export async function getDisputes(status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status)
    return db
      .select()
      .from(disputes)
      .where(eq(disputes.status, status as any))
      .orderBy(desc(disputes.createdAt));
  return db.select().from(disputes).orderBy(desc(disputes.createdAt));
}

// ============ OWNER STATS ============
export async function getPlatformStats() {
  const db = await getDb();
  if (!db) return null;
  const [
    userCount,
    orderCount,
    totalTurnover,
    totalCommission,
    activeKvorki,
    openProjects,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(orders),
    db
      .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
      .from(orders)
      .where(eq(orders.status, "completed")),
    db
      .select({ total: sql<string>`COALESCE(SUM(commission), 0)` })
      .from(orders)
      .where(eq(orders.status, "completed")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(kvorki)
      .where(eq(kvorki.status, "active")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(eq(projects.status, "open")),
  ]);
  return {
    totalUsers: Number(userCount[0]?.count || 0),
    totalOrders: Number(orderCount[0]?.count || 0),
    totalTurnover: totalTurnover[0]?.total || "0",
    totalCommission: totalCommission[0]?.total || "0",
    activeKvorki: Number(activeKvorki[0]?.count || 0),
    openProjects: Number(openProjects[0]?.count || 0),
  };
}

// ============ ADS ============
export async function getActiveAds(placement?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(adBanners.status, "active")];
  if (placement) conditions.push(eq(adBanners.placement, placement as any));
  return db
    .select()
    .from(adBanners)
    .where(and(...conditions));
}

export async function getUserAds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(adBanners)
    .where(eq(adBanners.userId, userId))
    .orderBy(desc(adBanners.createdAt));
}

export async function createAd(data: typeof adBanners.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(adBanners).values(data);
  return result[0].insertId;
}

// ============ СТОМАТОЛОГИЧЕСКИЕ ЛИДЫ (DAREMA) ============

export type DentalLeadFilters = {
  status?: string;
  urgencyTier?: string;
  serviceSlug?: string;
  from?: Date;
  to?: Date;
  search?: string;
  /** Только заявки, где обещанный срок первого касания уже вышел. */
  overdueOnly?: boolean;
  partnerId?: number;
  /** true — только нераспределённые заявки (нет партнёра в городе). */
  unrouted?: boolean;
  city?: string;
  limit?: number;
  offset?: number;
};

/**
 * SQL-выражение срока первого касания. Минуты берутся из общего словаря SLA,
 * чтобы правило в базе и правило в интерфейсе не разъехались.
 */
const slaMinutesCase = sql`CASE ${dentalLeads.urgencyTier}
  WHEN 'critical' THEN ${DENTAL_SLA_MINUTES.critical}
  WHEN 'high' THEN ${DENTAL_SLA_MINUTES.high}
  WHEN 'medium' THEN ${DENTAL_SLA_MINUTES.medium}
  ELSE ${DENTAL_SLA_MINUTES.low} END`;

function dentalLeadConditions(filters?: DentalLeadFilters) {
  const conditions: any[] = [];
  if (filters?.status)
    conditions.push(eq(dentalLeads.status, filters.status as any));
  if (filters?.urgencyTier)
    conditions.push(eq(dentalLeads.urgencyTier, filters.urgencyTier as any));
  if (filters?.serviceSlug)
    conditions.push(eq(dentalLeads.serviceSlug, filters.serviceSlug));
  if (filters?.from)
    conditions.push(sql`${dentalLeads.createdAt} >= ${filters.from}`);
  if (filters?.to)
    conditions.push(sql`${dentalLeads.createdAt} <= ${filters.to}`);
  if (filters?.partnerId)
    conditions.push(eq(dentalLeads.partnerId, filters.partnerId));
  if (filters?.unrouted) conditions.push(sql`${dentalLeads.partnerId} IS NULL`);
  if (filters?.city) conditions.push(eq(dentalLeads.city, filters.city));
  if (filters?.overdueOnly) {
    conditions.push(sql`${dentalLeads.firstTouchAt} IS NULL`);
    conditions.push(
      sql`${dentalLeads.status} NOT IN ('contacted','scheduled','visited','rejected','spam')`
    );
    conditions.push(
      sql`${dentalLeads.createdAt} < DATE_SUB(NOW(), INTERVAL (${slaMinutesCase}) MINUTE)`
    );
  }
  if (filters?.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        like(dentalLeads.name, term),
        like(dentalLeads.phone, term),
        like(dentalLeads.email, term),
        like(dentalLeads.messengerHandle, term),
        like(dentalLeads.publicId, term)
      )
    );
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function createDentalLead(data: typeof dentalLeads.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(dentalLeads).values(data);
  const leadId = result[0].insertId;
  if (leadId) {
    await db.insert(dentalLeadEvents).values({
      leadId: Number(leadId),
      type: "created",
      toStatus: data.status ?? "new",
      body: `Заявка получена, источник: ${data.sourceChannel ?? "не указан"}`,
    });
  }
  return leadId;
}

export async function getDentalLeads(filters?: DentalLeadFilters) {
  const db = await getDb();
  if (!db)
    return { items: [] as (typeof dentalLeads.$inferSelect)[], total: 0 };
  const where = dentalLeadConditions(filters);
  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(dentalLeads)
      .where(where)
      // Очередь на связь: сначала самые срочные, среди равных — свежие.
      .orderBy(desc(dentalLeads.urgencyScore), desc(dentalLeads.createdAt))
      .limit(filters?.limit ?? 50)
      .offset(filters?.offset ?? 0),
    db
      .select({ count: sql<number>`count(*)` })
      .from(dentalLeads)
      .where(where),
  ]);
  return { items, total: Number(countResult[0]?.count || 0) };
}

/** Полная выборка под выгрузку в Excel — без пагинации, но с потолком. */
export async function getDentalLeadsForExport(
  filters?: DentalLeadFilters,
  cap = 20000
) {
  const db = await getDb();
  if (!db) return [] as (typeof dentalLeads.$inferSelect)[];
  return db
    .select()
    .from(dentalLeads)
    .where(dentalLeadConditions(filters))
    .orderBy(desc(dentalLeads.createdAt))
    .limit(cap);
}

export async function getDentalLeadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(dentalLeads)
    .where(eq(dentalLeads.id, id))
    .limit(1);
  return result[0] || undefined;
}

export async function getDentalLeadByPublicId(publicId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(dentalLeads)
    .where(eq(dentalLeads.publicId, publicId))
    .limit(1);
  return result[0] || undefined;
}

export async function updateDentalLead(
  id: number,
  data: Partial<typeof dentalLeads.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(dentalLeads).set(data).where(eq(dentalLeads.id, id));
}

export async function addDentalLeadEvent(
  data: typeof dentalLeadEvents.$inferInsert
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(dentalLeadEvents).values(data);
  return result[0].insertId;
}

export async function getDentalLeadEvents(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(dentalLeadEvents)
    .where(eq(dentalLeadEvents.leadId, leadId))
    .orderBy(asc(dentalLeadEvents.createdAt));
}

/** Сводка по дням прямо из БД — для дашборда, без выгрузки всех строк. */
export async function getDentalDailyStats(days = 30) {
  const db = await getDb();
  if (!db)
    return [] as {
      day: string;
      total: number;
      critical: number;
      scheduled: number;
      visited: number;
    }[];
  const rows = await db
    .select({
      day: sql<string>`DATE(${dentalLeads.createdAt})`,
      total: sql<number>`count(*)`,
      critical: sql<number>`sum(case when ${dentalLeads.urgencyTier} = 'critical' then 1 else 0 end)`,
      scheduled: sql<number>`sum(case when ${dentalLeads.status} in ('scheduled','visited') then 1 else 0 end)`,
      visited: sql<number>`sum(case when ${dentalLeads.status} = 'visited' then 1 else 0 end)`,
    })
    .from(dentalLeads)
    .where(
      sql`${dentalLeads.createdAt} >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)`
    )
    .groupBy(sql`DATE(${dentalLeads.createdAt})`)
    .orderBy(sql`DATE(${dentalLeads.createdAt}) DESC`);
  return rows.map(r => ({
    day: String(r.day),
    total: Number(r.total || 0),
    critical: Number(r.critical || 0),
    scheduled: Number(r.scheduled || 0),
    visited: Number(r.visited || 0),
  }));
}

/** Кому в кабинете показывать оповещение о срочной заявке. */
export async function getStaffUserIds(limit = 50) {
  const db = await getDb();
  if (!db) return [] as number[];
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, ["admin", "owner"] as any))
    .limit(limit);
  return rows.map(r => r.id);
}

export async function createNotifications(
  userIds: number[],
  data: { type: string; title: string; message?: string; link?: string }
) {
  const db = await getDb();
  if (!db || userIds.length === 0) return;
  await db.insert(notifications).values(
    userIds.map(userId => ({
      userId,
      type: data.type,
      title: data.title,
      message: data.message ?? null,
      link: data.link ?? null,
    }))
  );
}

/**
 * Разрез по кампаниям: сколько заявок дала каждая и сколько из них дошло до
 * клиники. Платят по договору за приход, поэтому кампании сравниваются по
 * доле дошедших, а не по числу заявок.
 */
export async function getDentalCampaignStats(days = 30) {
  const db = await getDb();
  if (!db)
    return [] as {
      channel: string;
      campaign: string;
      leads: number;
      scheduled: number;
      visited: number;
      criticalShare: number;
    }[];
  const rows = await db
    .select({
      channel: sql<string>`coalesce(${dentalLeads.sourceChannel}, 'без метки')`,
      campaign: sql<string>`coalesce(${dentalLeads.utmCampaign}, 'без метки')`,
      leads: sql<number>`count(*)`,
      scheduled: sql<number>`sum(case when ${dentalLeads.status} in ('scheduled','visited') then 1 else 0 end)`,
      visited: sql<number>`sum(case when ${dentalLeads.status} = 'visited' then 1 else 0 end)`,
      critical: sql<number>`sum(case when ${dentalLeads.urgencyTier} = 'critical' then 1 else 0 end)`,
    })
    .from(dentalLeads)
    .where(
      sql`${dentalLeads.createdAt} >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)`
    )
    .groupBy(
      sql`coalesce(${dentalLeads.sourceChannel}, 'без метки')`,
      sql`coalesce(${dentalLeads.utmCampaign}, 'без метки')`
    )
    .orderBy(sql`count(*) DESC`);

  return rows.map(r => {
    const leads = Number(r.leads || 0);
    return {
      channel: String(r.channel),
      campaign: String(r.campaign),
      leads,
      scheduled: Number(r.scheduled || 0),
      visited: Number(r.visited || 0),
      criticalShare:
        leads > 0 ? Math.round((Number(r.critical || 0) / leads) * 100) : 0,
    };
  });
}

// ============ ПАРТНЁРСКИЕ КЛИНИКИ ============

export async function getDentalPartners(filters?: {
  city?: string;
  status?: string;
}) {
  const db = await getDb();
  if (!db) return [] as (typeof dentalPartners.$inferSelect)[];
  const conditions: any[] = [];
  if (filters?.city) conditions.push(eq(dentalPartners.city, filters.city));
  if (filters?.status)
    conditions.push(eq(dentalPartners.status, filters.status as any));
  return db
    .select()
    .from(dentalPartners)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(dentalPartners.city), asc(dentalPartners.name));
}

export async function getDentalPartnerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(dentalPartners)
    .where(eq(dentalPartners.id, id))
    .limit(1);
  return rows[0] || undefined;
}

export async function createDentalPartner(
  data: typeof dentalPartners.$inferInsert
) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(dentalPartners).values(data);
  return result[0].insertId;
}

export async function updateDentalPartner(
  id: number,
  data: Partial<typeof dentalPartners.$inferInsert>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(dentalPartners).set(data).where(eq(dentalPartners.id, id));
}

/** Города, где есть хотя бы один партнёр, принимающий заявки. */
export async function getDentalCities() {
  const db = await getDb();
  if (!db) return [] as { city: string; partners: number }[];
  const rows = await db
    .select({ city: dentalPartners.city, partners: sql<number>`count(*)` })
    .from(dentalPartners)
    .where(eq(dentalPartners.status, "active"))
    .groupBy(dentalPartners.city)
    .orderBy(asc(dentalPartners.city));
  return rows.map(r => ({
    city: String(r.city),
    partners: Number(r.partners || 0),
  }));
}

/**
 * Кандидаты на приём заявки вместе с сегодняшней загрузкой — маршрутизация
 * распределяет по наименее загруженному, поэтому счётчик нужен из базы.
 */
export async function getPartnerCandidates(city: string) {
  const db = await getDb();
  if (!db)
    return [] as (typeof dentalPartners.$inferSelect & {
      todayCount: number;
    })[];
  const partners = await db
    .select()
    .from(dentalPartners)
    .where(
      and(eq(dentalPartners.status, "active"), eq(dentalPartners.city, city))
    );
  if (partners.length === 0) return [];

  const counts = await db
    .select({ partnerId: dentalLeads.partnerId, total: sql<number>`count(*)` })
    .from(dentalLeads)
    .where(
      and(
        inArray(
          dentalLeads.partnerId,
          partners.map(p => p.id)
        ),
        sql`DATE(${dentalLeads.createdAt}) = CURDATE()`
      )
    )
    .groupBy(dentalLeads.partnerId);

  const byPartner = new Map(
    counts.map(c => [Number(c.partnerId), Number(c.total || 0)])
  );
  return partners.map(p => ({ ...p, todayCount: byPartner.get(p.id) ?? 0 }));
}

/** Сводка по партнёрам: сколько заявок отдано и сколько дошло до приёма. */
export async function getDentalPartnerStats(days = 30) {
  const db = await getDb();
  if (!db)
    return [] as {
      partnerId: number | null;
      name: string;
      city: string;
      leads: number;
      visited: number;
      pricePerVisit: string;
    }[];
  const rows = await db
    .select({
      partnerId: dentalLeads.partnerId,
      name: sql<string>`coalesce(${dentalPartners.name}, 'Не распределено')`,
      city: sql<string>`coalesce(${dentalPartners.city}, ${dentalLeads.city})`,
      pricePerVisit: sql<string>`coalesce(${dentalPartners.pricePerVisit}, '0.00')`,
      leads: sql<number>`count(*)`,
      visited: sql<number>`sum(case when ${dentalLeads.status} = 'visited' then 1 else 0 end)`,
    })
    .from(dentalLeads)
    .leftJoin(dentalPartners, eq(dentalLeads.partnerId, dentalPartners.id))
    .where(
      sql`${dentalLeads.createdAt} >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)`
    )
    .groupBy(
      dentalLeads.partnerId,
      sql`coalesce(${dentalPartners.name}, 'Не распределено')`,
      sql`coalesce(${dentalPartners.city}, ${dentalLeads.city})`,
      sql`coalesce(${dentalPartners.pricePerVisit}, '0.00')`
    )
    .orderBy(sql`count(*) DESC`);

  return rows.map(r => ({
    partnerId: r.partnerId === null ? null : Number(r.partnerId),
    name: String(r.name),
    city: String(r.city),
    leads: Number(r.leads || 0),
    visited: Number(r.visited || 0),
    pricePerVisit: String(r.pricePerVisit ?? "0.00"),
  }));
}
