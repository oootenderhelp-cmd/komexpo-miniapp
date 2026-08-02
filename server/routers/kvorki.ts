import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

export const kvorkiRouter = router({
  list: publicProcedure.input(z.object({
    categoryId: z.number().optional(),
    search: z.string().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return db.getKvorki(input || {});
  }),
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return db.getKvorkaById(input.id);
  }),
  my: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserKvorki(ctx.user.id);
  }),
  create: protectedProcedure.input(z.object({
    categoryId: z.number(),
    title: z.string().min(5),
    description: z.string().min(20),
    price: z.number().min(100),
    deliveryDays: z.number().min(1),
    revisions: z.number().optional(),
    images: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    extras: z.array(z.object({ title: z.string(), price: z.number(), days: z.number() })).optional(),
  })).mutation(async ({ ctx, input }) => {
    const slug = input.title.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').slice(0, 200) + '-' + Date.now();
    return db.createKvorka({ ...input, userId: ctx.user.id, slug, price: String(input.price), status: "active" } as any);
  }),
  update: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    description: z.string().optional(),
    price: z.number().optional(),
    deliveryDays: z.number().optional(),
    status: z.enum(["draft", "active", "paused"]).optional(),
    images: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    if (data.price) (data as any).price = String(data.price);
    return db.updateKvorka(id, ctx.user.id, data as any);
  }),
});
