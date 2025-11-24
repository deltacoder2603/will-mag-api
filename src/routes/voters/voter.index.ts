import { createRouter } from "@/lib/create-app";

import * as authHandlers from "./voter-auth.handlers";
import * as authRoutes from "./voter-auth.routes";
import * as handlers from "./voter.handlers";
import * as routes from "./voter.routes";

const router = createRouter()
  // Voter Authentication Routes (Public)
  .openapi(authRoutes.voterSignUpEmail, authHandlers.voterSignUpEmail)
  .openapi(authRoutes.voterSignInEmail, authHandlers.voterSignInEmail)
  .openapi(authRoutes.voterSignInGoogle, authHandlers.voterSignInGoogle)
  .openapi(authRoutes.voterOAuthCallback, authHandlers.voterOAuthCallback)
  .openapi(authRoutes.checkVoterSession, authHandlers.checkVoterSession)
  
  // Voter Dashboard Routes
  .openapi(routes.getVoterStats, handlers.getVoterStats)
  .openapi(routes.getAvailableContests, handlers.getAvailableContests)
  .openapi(routes.getContestParticipants, handlers.getContestParticipants)
  .openapi(routes.getVoterProgress, handlers.getVoterProgress);

export default router;
