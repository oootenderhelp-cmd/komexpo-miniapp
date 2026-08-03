import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

export const notificationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserNotifications(ctx.user.id);
  }),
  markRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.markNotificationsRead(ctx.user.id);
    return { success: true };
  }),
});
