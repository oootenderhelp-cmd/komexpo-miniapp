import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

export const projectsRouter = router({
  list: publicProcedure.input(z.object({
    categoryId: z.number().optional(),
    status: z.string().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
  }).optional()).query(async ({ input }) => {
    return db.getProjects(input || {});
  }),
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return db.getProjectById(input.id);
  }),
  create: protectedProcedure.input(z.object({
    title: z.string().min(5),
    description: z.string().min(20),
    categoryId: z.number().optional(),
    budget: z.number().optional(),
    deadline: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    return db.createProject({
      ...input,
      userId: ctx.user.id,
      budget: input.budget ? String(input.budget) : undefined,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
    } as any);
  }),
  responses: publicProcedure.input(z.object({ projectId: z.number() })).query(async ({ input }) => {
    return db.getProjectResponses(input.projectId);
  }),
  respond: protectedProcedure.input(z.object({
    projectId: z.number(),
    message: z.string().min(10),
    proposedPrice: z.number().min(100),
    proposedDays: z.number().min(1),
  })).mutation(async ({ ctx, input }) => {
    return db.createProjectResponse({
      ...input,
      userId: ctx.user.id,
      proposedPrice: String(input.proposedPrice),
    } as any);
  }),
});
