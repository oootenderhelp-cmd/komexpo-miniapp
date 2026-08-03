import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

export const chatRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getChatList(ctx.user.id);
  }),
  messages: protectedProcedure.input(z.object({
    otherUserId: z.number(),
    orderId: z.number().optional(),
  })).query(async ({ ctx, input }) => {
    return db.getChatMessages(ctx.user.id, input.otherUserId, input.orderId);
  }),
  send: protectedProcedure.input(z.object({
    receiverId: z.number(),
    message: z.string().min(1),
    orderId: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    return db.sendMessage({ ...input, senderId: ctx.user.id });
  }),
});
