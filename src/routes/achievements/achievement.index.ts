import { createRouter } from "@/lib/create-app";

import * as handlers from "./achievement.handlers";
import * as routes from "./achievement.routes";

const router = createRouter()
  .openapi(routes.getAllAchievements, handlers.getAllAchievements)
  .openapi(routes.getProfileAchievements, handlers.getProfileAchievements)
  .openapi(routes.createAchievement, handlers.createAchievement)
  .openapi(routes.unlockAchievement, handlers.unlockAchievement);

export default router;

