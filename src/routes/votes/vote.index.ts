import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./vote.handlers";
import * as routes from "./vote.routes";
import * as voteHistoryHandlers from "./vote-history.handlers";
import * as voteHistoryRoutes from "./vote-history.routes";

const votesRoutes = createRouteBuilder()
  .openapi(routes.freeVote, handlers.freeVote)
  .openapi(routes.payVote, handlers.payVote)
  .openapi(routes.isFreeVoteAvailable, handlers.isFreeVoteAvailable)
  .openapi(routes.getLatestVotes, handlers.getLatestVotes, "admin")
  .openapi(routes.getVotesByProfileId, handlers.getVotesByProfileId)
  .openapi(routes.getTopVotersForVotee, handlers.getTopVotersForVotee)
  .openapi(routes.getVoterLeaderboardForModel, handlers.getVoterLeaderboardForModel)
  .openapi(voteHistoryRoutes.getVoteHistoryRoute, voteHistoryHandlers.getVoteHistory);

export default votesRoutes.getRouter();
