import { createRouter } from "@/lib/create-app";

import * as handlers from "./referral.handlers";
import * as routes from "./referral.routes";

const router = createRouter()
  .openapi(routes.generateReferralCode, handlers.generateReferralCode)
  .openapi(routes.generateSocialSharingUrls, handlers.generateSocialSharingUrls)
  .openapi(routes.processReferral, handlers.processReferral)
  .openapi(routes.getReferralStats, handlers.getReferralStats)
  .openapi(routes.getReferralLeaderboard, handlers.getReferralLeaderboard);

export default router;

