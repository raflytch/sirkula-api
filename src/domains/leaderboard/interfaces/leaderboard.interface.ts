/**
 * @fileoverview Leaderboard interfaces
 * @description Type definitions for leaderboard responses
 */

/**
 * Leaderboard user info interface
 * @description User data shown in leaderboard
 */
export interface ILeaderboardUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string;
}

/**
 * Leaderboard entry response interface
 * @description Single leaderboard entry with rank and points
 */
export interface ILeaderboardEntry {
  rank: number;
  user: ILeaderboardUser;
  totalPoints: number;
  totalActions: number;
}

/**
 * Daily reward winner interface
 * @description Winner data for daily reward distribution
 */
export interface IDailyRewardWinner {
  userId: string;
  email: string;
  name: string;
  rank: 1 | 2 | 3;
  totalPoints: number;
  bonusPoints: number;
  newTotalPoints: number;
}

/**
 * Daily reward result interface
 * @description Result of daily reward distribution
 */
export interface IDailyRewardResult {
  date: string;
  winners: IDailyRewardWinner[];
  totalBonusDistributed: number;
}

/**
 * User rank response interface
 * @description Current user's rank in leaderboard
 */
export interface IUserRankResponse {
  rank: number;
  totalPoints: number;
  totalActions: number;
  percentile: number;
}
