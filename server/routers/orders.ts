import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { nanoid } from "nanoid";

const COMMISSION_RATE = 0.15;

export const ordersRouter = router({
  myAsCustomer: protectedProcedure.query(async ({ ctx }) => {
    return db.getOrdersByUser(ctx.user.id, 'customer');
  }),
  myAsContractor: protectedProcedure.query(async ({ ctx }) => {
    return db.getOrdersByUser(ctx.user.id, 'contractor');
  }),
  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const order = await db.getOrderById(input.id);
    if (!order) return null;
    if (order.customerId !== ctx.user.id && order.contractorId !== ctx.user.id && ctx.user.role !== 'admin' && ctx.user.role !== 'owner') return null;
    return order;
  }),
  create: protectedProcedure.input(z.object({
    contractorId: z.number(),
    kvorkiId: z.number().optional(),
    projectId: z.number().optional(),
    title: z.string(),
    description: z.string().optional(),
    amount: z.number().min(100),
    deliveryDays: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    const commission = Math.round(input.amount * COMMISSION_RATE * 100) / 100;
    const contractorPayout = input.amount - commission;
    const orderNumber = 'KW-' + nanoid(10).toUpperCase();
    return db.createOrder({
      ...input,
      orderNumber,
      customerId: ctx.user.id,
      amount: String(input.amount),
      commission: String(commission),
      contractorPayout: String(contractorPayout),
    } as any);
  }),
  updateStatus: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["in_progress", "delivered", "revision", "completed", "cancelled", "dispute"]),
  })).mutation(async ({ ctx, input }) => {
    const order = await db.getOrderById(input.id);
    if (!order) throw new Error("Order not found");
    if (order.customerId !== ctx.user.id && order.contractorId !== ctx.user.id) throw new Error("Access denied");
    const extra: Record<string, any> = {};
    if (input.status === 'delivered') extra.deliveredAt = new Date();
    if (input.status === 'completed') extra.completedAt = new Date();
    if (input.status === 'cancelled') extra.cancelledAt = new Date();
    return db.updateOrderStatus(input.id, input.status, extra);
  }),
});
