/**
 * @fileoverview Scheduler interfaces
 * @description Interface definitions for scheduler module
 */

/**
 * Daily reward winner interface
 * @description Winner data for daily reward distribution
 */
export interface IDailyRewardWinner {
  /** User unique identifier */
  userId: string;
  /** User email address */
  email: string;
  /** User display name */
  name: string;
  /** Leaderboard rank (1, 2, or 3) */
  rank: 1 | 2 | 3;
  /** User's total points before bonus */
  totalPoints: number;
  /** Bonus points awarded for this rank */
  bonusPoints: number;
  /** User's new total points after bonus */
  newTotalPoints: number;
}

/**
 * Daily reward result interface
 * @description Result of daily reward distribution at 23:59 WIB
 */
export interface IDailyRewardResult {
  /** Date of reward distribution (YYYY-MM-DD) */
  date: string;
  /** Timestamp of reward distribution (ISO 8601) */
  timestamp: string;
  /** List of winners who received rewards */
  winners: IDailyRewardWinner[];
  /** Total bonus points distributed */
  totalBonusDistributed: number;
}

/**
 * Top user data interface
 * @description User data retrieved for leaderboard ranking
 */
export interface ITopUserData {
  /** User unique identifier */
  id: string;
  /** User email address */
  email: string;
  /** User display name */
  name: string;
  /** User's total accumulated points */
  totalPoints: number;
}

/**
 * Leaderboard reward email data interface
 * @description Data structure for leaderboard reward email
 */
export interface ILeaderboardRewardEmailData {
  /** Winner's display name */
  userName: string;
  /** Leaderboard rank (1, 2, or 3) */
  rank: 1 | 2 | 3;
  /** User's points at time of reward */
  todayPoints: number;
  /** Bonus points awarded */
  bonusPoints: number;
  /** New total points after bonus */
  newTotalPoints: number;
  /** Date of reward */
  date: Date;
}

/**
 * Top user data interface
 * @description User data retrieved for leaderboard ranking
 */
export interface ITopUserData {
  /** User unique identifier */
  id: string;
  /** User email address */
  email: string;
  /** User display name */
  name: string;
  /** User's total accumulated points */
  totalPoints: number;
}

/**
 * Leaderboard reward email data interface
 * @description Data structure for leaderboard reward email
 */
export interface ILeaderboardRewardEmailData {
  /** Winner's display name */
  userName: string;
  /** Leaderboard rank (1, 2, or 3) */
  rank: 1 | 2 | 3;
  /** User's points at time of reward */
  todayPoints: number;
  /** Bonus points awarded */
  bonusPoints: number;
  /** New total points after bonus */
  newTotalPoints: number;
  /** Date of reward */
  date: Date;
}
