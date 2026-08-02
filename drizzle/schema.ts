import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json } from "drizzle-orm/mysql-core";

// ============ USERS ============
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "owner"]).default("user").notNull(),
  adminLevel: mysqlEnum("adminLevel", ["level_1", "level_2", "level_3", "level_4", "level_5"]),
  isKomekspoEmployee: boolean("isKomekspoEmployee").default(false).notNull(),
  employeeJobTitle: varchar("employeeJobTitle", { length: 255 }),
  verificationMethod: mysqlEnum("verificationMethod", ["sms", "tinkoff", "sber", "vk", "gosuslugi", "maks", "none"]).default("none").notNull(),
  isVerified: boolean("isVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  displayName: varchar("displayName", { length: 255 }),
  avatar: text("avatar"),
  bio: text("bio"),
  isCustomer: boolean("isCustomer").default(false).notNull(),
  isContractor: boolean("isContractor").default(false).notNull(),
  contractorStatus: mysqlEnum("contractorStatus", ["freelancer", "agency", "employee"]),
  phone: varchar("phone", { length: 32 }),
  city: varchar("city", { length: 128 }),
  country: varchar("country", { length: 128 }),
  website: text("website"),
  portfolioLinks: json("portfolioLinks"),
  skills: json("skills"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  completedOrders: int("completedOrders").default(0),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0.00"),
  frozenBalance: decimal("frozenBalance", { precision: 12, scale: 2 }).default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ============ CATEGORIES ============
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 128 }),
  parentId: int("parentId"),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ KVORKI (Services/Gigs) ============
export const kvorki = mysqlTable("kvorki", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  categoryId: int("categoryId").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  slug: varchar("slug", { length: 512 }).notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  deliveryDays: int("deliveryDays").notNull(),
  revisions: int("revisions").default(1),
  images: json("images"),
  tags: json("tags"),
  extras: json("extras"),
  status: mysqlEnum("status", ["draft", "active", "paused", "rejected", "archived"]).default("draft").notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  orderCount: int("orderCount").default(0),
  viewCount: int("viewCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ============ PROJECTS (Job Board) ============
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  categoryId: int("categoryId"),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description").notNull(),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  deadline: timestamp("deadline"),
  status: mysqlEnum("status", ["open", "in_progress", "completed", "cancelled"]).default("open").notNull(),
  responseCount: int("responseCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ============ PROJECT RESPONSES ============
export const projectResponses = mysqlTable("project_responses", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  message: text("message").notNull(),
  proposedPrice: decimal("proposedPrice", { precision: 10, scale: 2 }).notNull(),
  proposedDays: int("proposedDays").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ ORDERS ============
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(),
  customerId: int("customerId").notNull(),
  contractorId: int("contractorId").notNull(),
  kvorkiId: int("kvorkiId"),
  projectId: int("projectId"),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  commission: decimal("commission", { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("15.00").notNull(),
  contractorPayout: decimal("contractorPayout", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "delivered", "revision", "completed", "cancelled", "dispute"]).default("pending").notNull(),
  deliveryDays: int("deliveryDays"),
  deliveredAt: timestamp("deliveredAt"),
  completedAt: timestamp("completedAt"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ============ ORDER MILESTONES ============
export const orderMilestones = mysqlTable("order_milestones", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "delivered", "approved", "disputed"]).default("pending").notNull(),
  sortOrder: int("sortOrder").default(0),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ TRANSACTIONS ============
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  type: mysqlEnum("type", ["deposit", "withdrawal", "escrow_hold", "escrow_release", "commission", "refund", "payout"]).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balanceBefore", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal("balanceAfter", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "cancelled"]).default("pending").notNull(),
  description: text("description"),
  externalId: varchar("externalId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ REVIEWS ============
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  fromUserId: int("fromUserId").notNull(),
  toUserId: int("toUserId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ CHAT ============
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId"),
  senderId: int("senderId").notNull(),
  receiverId: int("receiverId").notNull(),
  message: text("message").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  attachments: json("attachments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ FAVORITES ============
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  kvorkiId: int("kvorkiId"),
  contractorId: int("contractorId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ NOTIFICATIONS ============
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  isRead: boolean("isRead").default(false).notNull(),
  link: text("link"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ DISPUTES ============
export const disputes = mysqlTable("disputes", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  initiatorId: int("initiatorId").notNull(),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["open", "under_review", "resolved_customer", "resolved_contractor", "closed"]).default("open").notNull(),
  adminId: int("adminId"),
  resolution: text("resolution"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

// ============ ADMIN PERMISSIONS ============
export const adminPermissions = mysqlTable("admin_permissions", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull(),
  permission: varchar("permission", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ VERIFICATION LOGS ============
export const verificationLogs = mysqlTable("verification_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  method: mysqlEnum("method", ["sms", "tinkoff", "sber", "vk", "gosuslugi", "maks"]).notNull(),
  status: mysqlEnum("status", ["pending", "verified", "failed"]).default("pending").notNull(),
  verificationCode: varchar("verificationCode", { length: 255 }),
  externalId: varchar("externalId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

// ============ ADVERTISING ============
export const adBanners = mysqlTable("ad_banners", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  imageUrl: text("imageUrl").notNull(),
  linkUrl: text("linkUrl").notNull(),
  placement: mysqlEnum("placement", ["homepage_top", "homepage_side", "catalog_top", "catalog_side", "project_page"]).notNull(),
  status: mysqlEnum("status", ["pending", "active", "paused", "rejected", "expired"]).default("pending").notNull(),
  impressions: int("impressions").default(0),
  clicks: int("clicks").default(0),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  pricePerDay: decimal("pricePerDay", { precision: 10, scale: 2 }).notNull(),
  totalSpent: decimal("totalSpent", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ============ AD TARIFFS ============
export const adTariffs = mysqlTable("ad_tariffs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  placement: mysqlEnum("placement", ["banner_top", "banner_side", "ticker", "featured"]).notNull(),
  pricePerDay: decimal("pricePerDay", { precision: 10, scale: 2 }).notNull(),
  minDays: int("minDays").default(1),
  maxDays: int("maxDays"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ============ TYPES ============
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Kvorka = typeof kvorki.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectResponse = typeof projectResponses.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderMilestone = typeof orderMilestones.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Dispute = typeof disputes.$inferSelect;
export type AdBanner = typeof adBanners.$inferSelect;
