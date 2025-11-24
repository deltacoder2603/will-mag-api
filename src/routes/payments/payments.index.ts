import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./payments.handlers";
import * as routes from "./payments.routes";
import * as statusHandlers from "./payment-status.handlers";
import * as statusRoutes from "./payment-status.routes";

const paymentRouter = createRouteBuilder()
  .openapi(routes.getPaymentHistory, handlers.getPaymentHistory, "private")
  .openapi(routes.getAllPayments, handlers.getAllPayments, "admin")
  .openapi(routes.getPaymentAnalytics, handlers.getPaymentAnalytics, "admin")
  .openapi(statusRoutes.getPaymentStatusRoute, statusHandlers.getPaymentStatus);

export default paymentRouter.getRouter();
