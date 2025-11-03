import { createRouter } from "@/lib/create-app";

import * as handlers from "./milestone.handlers";
import * as routes from "./milestone.routes";

const router = createRouter()
  .openapi(routes.getProfileMilestones, handlers.getProfileMilestones)
  .openapi(routes.getMilestoneProgress, handlers.getMilestoneProgress);

export default router;
