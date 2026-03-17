/**
 * @fileoverview Leaderboard DTOs
 * @description Data transfer objects for leaderboard queries
 */

import { PaginationDto } from '../../../commons/dto/pagination.dto';

/**
 * Query leaderboard DTO
 * @description Query parameters for leaderboard endpoints (ALL_TIME only)
 */
export class QueryLeaderboardDto extends PaginationDto {}
