import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

export const favoritesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserFavorites(ctx.user.id);
  }),
  toggle: protectedProcedure.input(z.object({
    kvorkiId: z.number().optional(),
    contractorId: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    return db.toggleFavorite(ctx.user.id, input.kvorkiId, input.contractorId);
  }),
});
