import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./favorites.handlers";
import * as routes from "./favorites.routes";

const favoritesRoutes = createRouteBuilder()
  .openapi(routes.addFavoriteRoute, handlers.addFavorite)
  .openapi(routes.removeFavoriteRoute, handlers.removeFavorite)
  .openapi(routes.getFavoritesRoute, handlers.getFavorites)
  .openapi(routes.checkFavoriteRoute, handlers.checkFavorite);

export default favoritesRoutes.getRouter();

