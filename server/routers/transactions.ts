import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

export const transactionsRouter = router({
  my: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserTransactions(ctx.user.id);
  }),
  deposit: protectedProcedure.input(z.object({
    amount: z.number().min(100),
  })).mutation(async ({ ctx, input }) => {
    const profile = await db.getProfile(ctx.user.id);
    const currentBalance = Number(profile?.balance || 0);
    await db.createTransaction({
      userId: ctx.user.id,
      type: "deposit",
      amount: String(input.amount),
      balanceBefore: String(currentBalance),
      balanceAfter: String(currentBalance + input.amount),
      status: "completed",
      description: "Пополнение баланса",
    } as any);
    await db.upsertProfile(ctx.user.id, { balance: String(currentBalance + input.amount) } as any);
    return { success: true };
  }),
  withdraw: protectedProcedure.input(z.object({
    amount: z.number().min(100),
  })).mutation(async ({ ctx, input }) => {
    const profile = await db.getProfile(ctx.user.id);
    const currentBalance = Number(profile?.balance || 0);
    if (currentBalance < input.amount) throw new Error("Недостаточно средств");
    await db.createTransaction({
      userId: ctx.user.id,
      type: "withdrawal",
      amount: String(input.amount),
      balanceBefore: String(currentBalance),
      balanceAfter: String(currentBalance - input.amount),
      status: "pending",
      description: "Вывод средств",
    } as any);
    await db.upsertProfile(ctx.user.id, { balance: String(currentBalance - input.amount) } as any);
    return { success: true };
  }),
});
