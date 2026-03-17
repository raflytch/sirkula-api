/**
 * @fileoverview Green Action interfaces
 * @description Interfaces for green action AI verification and responses
 */

import {
  GreenActionCategory,
  GreenActionMediaType,
  GreenActionStatus,
} from '../enums/green-action.enum';

/**
 * AI Analysis result interface
 * @description Result from AI analysis of green action media
 */
export interface IAiAnalysisResult {
  /**
   * Whether the AI successfully analyzed the media
   */
  success: boolean;

  /**
   * AI confidence score (0-100)
   */
  score: number;

  /**
   * Detected labels/objects from the media
   * @example ["trash_organic", "trash_plastic", "multiple_bins"]
   */
  labels: string[];

  /**
   * Whether the content matches the selected category
   */
  categoryMatch: boolean;

  /**
   * AI feedback message for the user
   */
  feedback: string;

  /**
   * Calculated points based on AI score
   */
  points: number;

  /**
   * Verification status based on AI analysis
   */
  status: GreenActionStatus;

  /**
   * Raw AI response text (for debugging)
   */
  rawResponse?: string;
}

/**
 * Green Action creation input interface
 * @description Input data for creating a new green action
 */
export interface ICreateGreenActionInput {
  /**
   * User ID who performs the action
   */
  userId: string;

  /**
   * Main category of the action
   */
  category: GreenActionCategory;

  /**
   * Sub-category of the action
   */
  subCategory: string;

  /**
   * Optional description from user
   */
  description?: string;

  /**
   * Quantitative data
   */
  quantity: number;
  actionType?: string;

  /**
   * Media URL from Cloudinary
   */
  mediaUrl: string;

  /**
   * Type of media (image/video)
   */
  mediaType: GreenActionMediaType;

  /**
   * Location data for map integration
   */
  locationName?: string;
  latitude?: number;
  longitude?: number;
  district?: string;
  city?: string;
}

/**
 * Green Action response interface
 * @description Response data for a green action
 */
export interface IGreenActionResponse {
  /**
   * Green action ID
   */
  id: string;

  /**
   * User ID who performed the action
   */
  userId: string;

  /**
   * Main category of the action
   */
  category: string;

  /**
   * Optional description
   */
  description: string | null;

  /**
   * Quantitative data
   */
  quantity: number;
  actionType: string | null;

  /**
   * Media URL
   */
  mediaUrl: string;

  /**
   * Media type (IMAGE/VIDEO)
   */
  mediaType: string;

  /**
   * Verification status
   */
  status: string;

  /**
   * AI confidence score
   */
  aiScore: number | null;

  /**
   * AI feedback message
   */
  aiFeedback: string | null;

  /**
   * AI detected labels
   */
  aiLabels: string | null;

  /**
   * Points earned from this action
   */
  points: number;

  /**
   * Location data for map display
   */
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  district?: string | null;
  city?: string | null;

  /**
   * Creation timestamp
   */
  createdAt: Date;

  /**
   * Last update timestamp
   */
  updatedAt: Date;
}

/**
 * AI verification request interface
 * @description Data needed for AI verification
 */
export interface IAiVerificationRequest {
  /**
   * Media file buffer
   */
  mediaBuffer: Buffer;

  /**
   * MIME type of the media
   */
  mimeType: string;

  /**
   * Category selected by user
   */
  category: GreenActionCategory;

  /**
   * Sub-category selected by user
   */
  subCategory: string;

  /**
   * Optional user description
   */
  description?: string;
}

/**
 * Points calculation criteria interface
 * @description Criteria for calculating points based on AI score
 */
export interface IPointsCriteria {
  /**
   * Minimum score threshold
   */
  minScore: number;

  /**
   * Maximum score threshold
   */
  maxScore: number;

  /**
   * Points awarded for this score range
   */
  points: number;

  /**
   * Status assigned for this score range
   */
  status: GreenActionStatus;
}

/**
 * Category criteria interface
 * @description AI detection criteria for each category
 */
export interface ICategoryCriteria {
  /**
   * Category identifier
   */
  category: GreenActionCategory;

  /**
   * Required objects/labels to detect
   */
  requiredLabels: string[];

  /**
   * Minimum number of required labels to match
   */
  minMatches: number;

  /**
   * Base points for this category
   */
  basePoints: number;

  /**
   * Bonus points multiplier
   */
  bonusMultiplier: number;
}

/**
 * User green action statistics interface
 * @description Statistics of user's green actions
 */
export interface IUserGreenActionStats {
  /**
   * Total number of green actions
   */
  totalActions: number;

  /**
   * Total points earned
   */
  totalPoints: number;

  /**
   * Number of verified actions
   */
  verifiedActions: number;

  /**
   * Number of pending actions
   */
  pendingActions: number;

  /**
   * Actions grouped by category
   */
  byCategory: {
    [key in GreenActionCategory]?: {
      count: number;
      points: number;
    };
  };
}

/**
 * Before-After comparison interface
 * @description For actions that support before-after photos (bonus points)
 */
export interface IBeforeAfterAction {
  beforeMediaUrl: string;
  afterMediaUrl: string;
  bonusPoints: number;
}

/**
 * Impact aggregation data from database
 */
export interface IImpactAggregation {
  totalQuantity: number;
  totalActions: number;
  totalUniqueDistricts: number;
  totalUniqueCities: number;
}

/**
 * Impact data per district/wilayah
 */
export interface IDistrictImpact {
  district: string;
  city: string;
  totalActions: number;
  totalQuantity: number;
}

/**
 * Monthly trend data
 */
export interface IMonthlyTrend {
  month: string;
  totalActions: number;
  totalQuantity: number;
}

/**
 * Full impact response with AI-generated insight
 */
export interface IImpactResponse {
  aggregation: IImpactAggregation;
  byDistrict: IDistrictImpact[];
  monthlyTrend: IMonthlyTrend[];
  topDistrict: IDistrictImpact | null;
  insight: string;
}
