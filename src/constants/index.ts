export const FREE_VOTE_INTERVAL = 24 * 60 * 60 * 1000;
export const FREE_VOTE_COUNT = 5; // Number of votes given per free vote (every 24 hours)

// Vote weights for calculating weighted score
export const PAID_VOTE_WEIGHT = 10;
export const FREE_VOTE_WEIGHT = 1;

// Manual ranks are reserved for top N
export const MAX_MANUAL_RANK = 5;
// Computed ranks start after the manual band
export const COMPUTED_RANK_START = MAX_MANUAL_RANK + 1;

// If true → computed ranks can fill manual gaps (e.g. rank #3 if admin didn’t assign)
// If false → computed always start strictly from COMPUTED_RANK_START
export const FILL_MANUAL_GAPS_WITH_COMPUTED = false;
