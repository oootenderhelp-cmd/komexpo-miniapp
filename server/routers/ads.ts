import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

export const adsRouter = router({
  active: publicProcedure.input(z.object({
    placement: z.string().optional(),
  }).optional()).query(async ({ input }) => {
    return db.getActiveAds(input?.placement);
  }),
  my: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserAds(ctx.user.id);
  }),
  create: protectedProcedure.input(z.object({
    title: z.string(),
    imageUrl: z.string(),
    linkUrl: z.string(),
    placement: z.enum(["homepage_top", "homepage_side", "catalog_top", "catalog_side", "project_page"]),
    pricePerDay: z.number(),
    startDate: z.string(),
    endDate: z.string(),
  })).mutation(async ({ ctx, input }) => {
    return db.createAd({
      ...input,
      userId: ctx.user.id,
      pricePerDay: String(input.pricePerDay),
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
    } as any);
  }),
});
