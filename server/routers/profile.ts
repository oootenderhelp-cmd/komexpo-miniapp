import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

export const profileRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return db.getProfile(ctx.user.id);
  }),
  get: publicProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => {
    return db.getProfile(input.userId);
  }),
  update: protectedProcedure.input(z.object({
    displayName: z.string().optional(),
    bio: z.string().optional(),
    avatar: z.string().optional(),
    isCustomer: z.boolean().optional(),
    isContractor: z.boolean().optional(),
    contractorStatus: z.enum(["freelancer", "agency", "employee"]).optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    website: z.string().optional(),
    skills: z.array(z.string()).optional(),
  })).mutation(async ({ ctx, input }) => {
    return db.upsertProfile(ctx.user.id, input as any);
  }),
});
