import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { z } from "zod";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'owner') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Owner access required' });
  }
  return next({ ctx });
});

export const ownerRouter = router({
  stats: ownerProcedure.query(async () => {
    return db.getPlatformStats();
  }),
  setRole: ownerProcedure.input(z.object({
    userId: z.number(),
    role: z.enum(["user", "admin", "owner"]),
  })).mutation(async ({ input }) => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    await database.update(users).set({ role: input.role as any }).where(eq(users.id, input.userId));
    return { success: true };
  }),
  allUsers: ownerProcedure.query(async () => {
    return db.getAllUsers(200, 0);
  }),
});
