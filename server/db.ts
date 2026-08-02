import { eq, desc, asc, and, like, sql, or, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, userProfiles, categories, kvorki, projects, projectResponses, orders, orderMilestones, transactions, reviews, chatMessages, favorites, notifications, disputes, adBanners } from "../drizzle/schema";
import { ENV } from './_core/env';

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
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
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
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'owner'; updateSet.role = 'owner'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPasswordHash(openId: string, passwordHash: string): Promise<void> {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot update password hash: database not available"); return; }
  await db.update(users).set({ passwordHash }).where(eq(users.openId, openId));
}

export async function getUserPasswordHash(openId: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.openId, openId)).limit(1);
  return result[0]?.passwordHash ?? null;
}

// ============ PROFILES ============
export async function getProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result[0] || undefined;
}

export async function upsertProfile(userId: number, data: Partial<typeof userProfiles.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  const existing = await getProfile(userId);
  if (existing) {
    await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({ userId, ...data });
  }
  return getProfile(userId);
}

// ============ CATEGORIES ============
export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder));
}

// ============ KVORKI ============
export async function getKvorki(filters?: { categoryId?: number; search?: string; minPrice?: number; maxPrice?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions = [eq(kvorki.status, "active")];
  if (filters?.categoryId) conditions.push(eq(kvorki.categoryId, filters.categoryId));
  if (filters?.search) conditions.push(like(kvorki.title, `%${filters.search}%`));
  if (filters?.minPrice) conditions.push(sql`${kvorki.price} >= ${filters.minPrice}`);
  if (filters?.maxPrice) conditions.push(sql`${kvorki.price} <= ${filters.maxPrice}`);
  const where = and(...conditions);
  const [items, countResult] = await Promise.all([
    db.select().from(kvorki).where(where).orderBy(desc(kvorki.createdAt)).limit(filters?.limit || 20).offset(filters?.offset || 0),
    db.select({ count: sql<number>`count(*)` }).from(kvorki).where(where)
  ]);
  return { items, total: Number(countResult[0]?.count || 0) };
}

export async function getKvorkaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(kvorki).where(eq(kvorki.id, id)).limit(1);
  return result[0] || undefined;
}

export async function getUserKvorki(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(kvorki).where(eq(kvorki.userId, userId)).orderBy(desc(kvorki.createdAt));
}

export async function createKvorka(data: typeof kvorki.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(kvorki).values(data);
  return result[0].insertId;
}

export async function updateKvorka(id: number, userId: number, data: Partial<typeof kvorki.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(kvorki).set(data).where(and(eq(kvorki.id, id), eq(kvorki.userId, userId)));
}

// ============ PROJECTS ============
export async function getProjects(filters?: { categoryId?: number; status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions: any[] = [];
  if (filters?.status) conditions.push(eq(projects.status, filters.status as any));
  else conditions.push(eq(projects.status, "open"));
  if (filters?.categoryId) conditions.push(eq(projects.categoryId, filters.categoryId));
  const where = and(...conditions);
  const [items, countResult] = await Promise.all([
    db.select().from(projects).where(where).orderBy(desc(projects.createdAt)).limit(filters?.limit || 20).offset(filters?.offset || 0),
    db.select({ count: sql<number>`count(*)` }).from(projects).where(where)
  ]);
  return { items, total: Number(countResult[0]?.count || 0) };
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
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
  return db.select().from(projectResponses).where(eq(projectResponses.projectId, projectId)).orderBy(desc(projectResponses.createdAt));
}

export async function createProjectResponse(data: typeof projectResponses.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(projectResponses).values(data);
  await db.update(projects).set({ responseCount: sql`responseCount + 1` }).where(eq(projects.id, data.projectId));
  return result[0].insertId;
}

// ============ ORDERS ============
export async function createOrder(data: typeof orders.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(orders).values(data);
  return result[0].insertId;
}

export async function getOrdersByUser(userId: number, role: 'customer' | 'contractor') {
  const db = await getDb();
  if (!db) return [];
  const condition = role === 'customer' ? eq(orders.customerId, userId) : eq(orders.contractorId, userId);
  return db.select().from(orders).where(condition).orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result[0] || undefined;
}

export async function updateOrderStatus(id: number, status: string, extra?: Record<string, any>) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ status: status as any, ...extra }).where(eq(orders.id, id));
}

// ============ TRANSACTIONS ============
export async function getUserTransactions(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt)).limit(limit);
}

export async function createTransaction(data: typeof transactions.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(transactions).values(data);
  return result[0].insertId;
}

// ============ REVIEWS ============
export async function getReviewsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews).where(eq(reviews.toUserId, userId)).orderBy(desc(reviews.createdAt));
}

export async function createReview(data: typeof reviews.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(reviews).values(data);
  return result[0].insertId;
}

// ============ CHAT ============
export async function getChatMessages(userId: number, otherUserId: number, orderId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    or(
      and(eq(chatMessages.senderId, userId), eq(chatMessages.receiverId, otherUserId)),
      and(eq(chatMessages.senderId, otherUserId), eq(chatMessages.receiverId, userId))
    )
  ];
  if (orderId) conditions.push(eq(chatMessages.orderId, orderId));
  return db.select().from(chatMessages).where(and(...conditions)).orderBy(asc(chatMessages.createdAt)).limit(200);
}

export async function getChatList(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const sent = await db.select({ partnerId: chatMessages.receiverId }).from(chatMessages).where(eq(chatMessages.senderId, userId)).groupBy(chatMessages.receiverId);
  const received = await db.select({ partnerId: chatMessages.senderId }).from(chatMessages).where(eq(chatMessages.receiverId, userId)).groupBy(chatMessages.senderId);
  const allIds = [...sent.map(s => s.partnerId), ...received.map(r => r.partnerId)];
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

export async function toggleFavorite(userId: number, kvorkiId?: number, contractorId?: number) {
  const db = await getDb();
  if (!db) return;
  const conditions = [eq(favorites.userId, userId)];
  if (kvorkiId) conditions.push(eq(favorites.kvorkiId, kvorkiId));
  if (contractorId) conditions.push(eq(favorites.contractorId, contractorId));
  const existing = await db.select().from(favorites).where(and(...conditions)).limit(1);
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
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit);
}

export async function markNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

// ============ ADMIN ============
export async function getAllUsers(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const [items, countResult] = await Promise.all([
    db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(users)
  ]);
  return { items, total: Number(countResult[0]?.count || 0) };
}

export async function getAllKvorkiAdmin(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const [items, countResult] = await Promise.all([
    db.select().from(kvorki).orderBy(desc(kvorki.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(kvorki)
  ]);
  return { items, total: Number(countResult[0]?.count || 0) };
}

export async function getDisputes(status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status) return db.select().from(disputes).where(eq(disputes.status, status as any)).orderBy(desc(disputes.createdAt));
  return db.select().from(disputes).orderBy(desc(disputes.createdAt));
}

// ============ OWNER STATS ============
export async function getPlatformStats() {
  const db = await getDb();
  if (!db) return null;
  const [userCount, orderCount, totalTurnover, totalCommission, activeKvorki, openProjects] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(orders),
    db.select({ total: sql<string>`COALESCE(SUM(amount), 0)` }).from(orders).where(eq(orders.status, "completed")),
    db.select({ total: sql<string>`COALESCE(SUM(commission), 0)` }).from(orders).where(eq(orders.status, "completed")),
    db.select({ count: sql<number>`count(*)` }).from(kvorki).where(eq(kvorki.status, "active")),
    db.select({ count: sql<number>`count(*)` }).from(projects).where(eq(projects.status, "open")),
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
  return db.select().from(adBanners).where(and(...conditions));
}

export async function getUserAds(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adBanners).where(eq(adBanners.userId, userId)).orderBy(desc(adBanners.createdAt));
}

export async function createAd(data: typeof adBanners.$inferInsert) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(adBanners).values(data);
  return result[0].insertId;
}
