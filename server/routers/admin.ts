import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { getDb } from "../db";
import { users, kvorki, disputes } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'owner') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const adminRouter = router({
  users: adminProcedure.input(z.object({
    limit: z.number().optional(),
    offset: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return db.getAllUsers(input?.limit || 50, input?.offset || 0);
  }),
  kvorki: adminProcedure.input(z.object({
    limit: z.number().optional(),
    offset: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return db.getAllKvorkiAdmin(input?.limit || 50, input?.offset || 0);
  }),
  disputes: adminProcedure.input(z.object({
    status: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    return db.getDisputes(input?.status);
  }),
  updateUserRole: adminProcedure.input(z.object({
    userId: z.number(),
    role: z.enum(["user", "admin"]),
  })).mutation(async ({ input }) => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    await database.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
    return { success: true };
  }),
  moderateKvorka: adminProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["active", "rejected", "paused"]),
  })).mutation(async ({ input }) => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    await database.update(kvorki).set({ status: input.status }).where(eq(kvorki.id, input.id));
    return { success: true };
  }),
  resolveDispute: adminProcedure.input(z.object({
    id: z.number(),
    resolution: z.string(),
    status: z.enum(["resolved_customer", "resolved_contractor", "closed"]),
  })).mutation(async ({ ctx, input }) => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    await database.update(disputes).set({
      status: input.status,
      resolution: input.resolution,
      adminId: ctx.user.id,
      resolvedAt: new Date(),
    }).where(eq(disputes.id, input.id));
    return { success: true };
  }),
});
