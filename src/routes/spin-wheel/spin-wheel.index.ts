import { createRouter } from "@/lib/create-app";

import * as handlers from "./spin-wheel.handlers";
import * as routes from "./spin-wheel.routes";

const spinWheelRouter = createRouter()
  .openapi(routes.spinWheelRoute, handlers.spinWheel)
  .openapi(routes.getAvailableRewardsRoute, handlers.getAvailableRewards)
  .openapi(routes.getSpinHistoryRoute, handlers.getSpinHistory)
  .openapi(routes.getActivePrizesRoute, handlers.getActivePrizes)
  .openapi(routes.claimPrizeRoute, handlers.claimPrize)
  .openapi(routes.canSpinTodayRoute, handlers.canSpinToday)
  .openapi(routes.useMultiplierTokenRoute, handlers.useMultiplierToken);

export default spinWheelRouter;

