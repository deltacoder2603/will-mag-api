import { createRouter } from "@/lib/create-app";

import * as handlers from "./unlock.handlers";
import * as routes from "./unlock.routes";

const router = createRouter()
  .openapi(routes.getUnlockProgress, handlers.getUnlockProgress)
  .openapi(routes.getProfileUnlocks, handlers.getProfileUnlocks)
  .openapi(routes.createUnlock, handlers.createUnlock)
  .openapi(routes.checkUnlockEligibility, handlers.checkUnlockEligibility);

export default router;

