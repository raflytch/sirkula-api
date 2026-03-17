/**
 * Represents supported media types for Google Gen AI input
 * Includes common image and video formats
 */
export type MediaType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/heic'
  | 'image/heif'
  | 'video/mp4'
  | 'video/mpeg'
  | 'video/mov'
  | 'video/avi'
  | 'video/x-flv'
  | 'video/mpg'
  | 'video/webm'
  | 'video/wmv'
  | 'video/3gpp';

/**
 * Interface for media file input (image or video)
 * Used to attach visual content to AI prompts
 */
export interface IMediaFile {
  /**
   * MIME type of the media file
   */
  mimeType: MediaType;

  /**
   * Base64 encoded data of the media file
   */
  data: string;
}

/**
 * Interface for generating content with Google Gen AI
 * Defines the structure for content generation requests
 */
export interface IGenerateContentRequest {
  /**
   * Text prompt for content generation (required)
   */
  prompt: string;

  /**
   * Optional media files (images or videos) to include
   */
  mediaFiles?: IMediaFile[];

  /**
   * Optional configuration for generation behavior
   */
  generationConfig?: IGenerationConfig;
}

/**
 * Interface for generation configuration options
 * Controls the behavior of content generation
 */
export interface IGenerationConfig {
  /**
   * Temperature for randomness (0.0 - 2.0)
   * Higher values produce more creative outputs
   */
  temperature?: number;

  /**
   * Top-p sampling parameter for nucleus sampling
   */
  topP?: number;

  /**
   * Top-k sampling parameter for token selection
   */
  topK?: number;

  /**
   * Maximum number of tokens to generate
   */
  maxOutputTokens?: number;

  /**
   * Stop sequences to end generation early
   */
  stopSequences?: string[];
}

/**
 * Interface for Google Gen AI response
 * Represents the result of content generation
 */
export interface IGenerateContentResponse {
  /**
   * Generated text content from the AI
   */
  text: string;

  /**
   * Indicates if generation was successful
   */
  success: boolean;

  /**
   * Optional error message if generation failed
   */
  error?: string;
}
