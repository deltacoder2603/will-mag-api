import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./debug.handlers";
import * as routes from "./debug.routes";

const debugRoutes = createRouteBuilder()
  .openapi(routes.debugUserProfile, handlers.debugUserProfile, "private");

export default debugRoutes.getRouter();
