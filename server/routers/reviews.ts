import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import * as db from "../db";

export const reviewsRouter = router({
  forUser: publicProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => {
    return db.getReviewsForUser(input.userId);
  }),
  create: protectedProcedure.input(z.object({
    orderId: z.number(),
    toUserId: z.number(),
    rating: z.number().min(1).max(5),
    comment: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    return db.createReview({ ...input, fromUserId: ctx.user.id });
  }),
});
