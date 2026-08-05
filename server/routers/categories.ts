import { router, publicProcedure } from "../_core/trpc";
import * as db from "../db";

export const categoriesRouter = router({
  list: publicProcedure.query(async () => {
    return db.getAllCategories();
  }),
});
