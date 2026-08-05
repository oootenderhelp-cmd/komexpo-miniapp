import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { profileRouter } from "./routers/profile";
import { categoriesRouter } from "./routers/categories";
import { kvorkiRouter } from "./routers/kvorki";
import { projectsRouter } from "./routers/projects";
import { ordersRouter } from "./routers/orders";
import { transactionsRouter } from "./routers/transactions";
import { reviewsRouter } from "./routers/reviews";
import { chatRouter } from "./routers/chat";
import { favoritesRouter } from "./routers/favorites";
import { notificationsRouter } from "./routers/notifications";
import { adminRouter } from "./routers/admin";
import { ownerRouter } from "./routers/owner";
import { adsRouter } from "./routers/ads";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { passwordHash, ...user } = opts.ctx.user;
      return user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: profileRouter,
  categories: categoriesRouter,
  kvorki: kvorkiRouter,
  projects: projectsRouter,
  orders: ordersRouter,
  transactions: transactionsRouter,
  reviews: reviewsRouter,
  chat: chatRouter,
  favorites: favoritesRouter,
  notifications: notificationsRouter,
  admin: adminRouter,
  owner: ownerRouter,
  ads: adsRouter,
});

export type AppRouter = typeof appRouter;

