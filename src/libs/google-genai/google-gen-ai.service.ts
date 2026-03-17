import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { AppConfigService } from '../../config/config.service';
import {
  IGenerateContentRequest,
  IGenerateContentResponse,
  IMediaFile,
} from './interfaces/google-gen-ai.interface';

/**
 * Service for interacting with Google Generative AI
 * Provides reusable methods for content generation with Gemini 2.5 Flash
 */
@Injectable()
export class GoogleGenAiService implements OnModuleInit {
  private readonly logger = new Logger(GoogleGenAiService.name);
  private genAI: GoogleGenAI;
  private readonly modelName = 'gemini-2.5-flash';

  constructor(private readonly configService: AppConfigService) {}

  /**
   * Initializes the Google Gen AI client on module start
   * Validates API key configuration
   */
  onModuleInit(): void {
    const apiKey = this.configService.googleGenAiApiKey;

    if (!apiKey) {
      this.logger.warn('GOOGLE_GENAI_API_KEY is not configured');
      return;
    }

    this.genAI = new GoogleGenAI({ apiKey });
    this.logger.log('Google Gen AI client initialized successfully');
  }

  /**
   * Generates content using text prompt only
   * Simplest method for text-based generation
   *
   * @param prompt - Text prompt for content generation
   * @returns Generated content response
   */
  async generateFromText(prompt: string): Promise<IGenerateContentResponse> {
    return this.generateContent({ prompt });
  }

  /**
   * Generates content using text prompt with a single image
   * Useful for image analysis and description tasks
   *
   * @param prompt - Text prompt for content generation
   * @param image - Image file to analyze
   * @returns Generated content response
   */
  async generateFromTextAndImage(
    prompt: string,
    image: IMediaFile,
  ): Promise<IGenerateContentResponse> {
    return this.generateContent({
      prompt,
      mediaFiles: [image],
    });
  }

  /**
   * Generates content using text prompt with a single video
   * Useful for video analysis and summarization tasks
   *
   * @param prompt - Text prompt for content generation
   * @param video - Video file to analyze
   * @returns Generated content response
   */
  async generateFromTextAndVideo(
    prompt: string,
    video: IMediaFile,
  ): Promise<IGenerateContentResponse> {
    return this.generateContent({
      prompt,
      mediaFiles: [video],
    });
  }

  /**
   * Generates content using text prompt with multiple media files
   * Supports combining images and videos in a single request
   *
   * @param prompt - Text prompt for content generation
   * @param mediaFiles - Array of media files to include
   * @returns Generated content response
   */
  async generateFromTextAndMedia(
    prompt: string,
    mediaFiles: IMediaFile[],
  ): Promise<IGenerateContentResponse> {
    return this.generateContent({
      prompt,
      mediaFiles,
    });
  }

  /**
   * Main method for generating content with Google Gen AI
   * Handles both text-only and multimodal (text + media) requests
   *
   * @param request - Content generation request with prompt and optional media
   * @returns Generated content response with success status
   */
  async generateContent(
    request: IGenerateContentRequest,
  ): Promise<IGenerateContentResponse> {
    try {
      if (!this.genAI) {
        throw new Error('Google Gen AI client is not initialized');
      }

      const contents = this.buildContents(request);

      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents,
        config: request.generationConfig
          ? {
              temperature: request.generationConfig.temperature,
              topP: request.generationConfig.topP,
              topK: request.generationConfig.topK,
              maxOutputTokens: request.generationConfig.maxOutputTokens,
              stopSequences: request.generationConfig.stopSequences,
            }
          : undefined,
      });

      const text = response.text || '';

      return {
        text,
        success: true,
      };
    } catch (error) {
      this.logger.error('Failed to generate content', error);

      return {
        text: '',
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Builds the contents array for the API request
   * Combines text prompt with optional media files
   *
   * @param request - Content generation request
   * @returns Formatted contents array for the API
   */
  private buildContents(request: IGenerateContentRequest): Array<{
    role: string;
    parts: Array<{
      text?: string;
      inlineData?: { mimeType: string; data: string };
    }>;
  }> {
    const parts: Array<{
      text?: string;
      inlineData?: { mimeType: string; data: string };
    }> = [];

    if (request.mediaFiles && request.mediaFiles.length > 0) {
      for (const mediaFile of request.mediaFiles) {
        parts.push({
          inlineData: {
            mimeType: mediaFile.mimeType,
            data: mediaFile.data,
          },
        });
      }
    }

    parts.push({ text: request.prompt });

    return [
      {
        role: 'user',
        parts,
      },
    ];
  }

  /**
   * Converts a Buffer to base64 encoded string
   * Helper method for processing file uploads
   *
   * @param buffer - File buffer to convert
   * @returns Base64 encoded string
   */
  bufferToBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }

  /**
   * Checks if the service is properly initialized
   * Useful for health checks and validation
   *
   * @returns True if the client is ready
   */
  isInitialized(): boolean {
    return !!this.genAI;
  }
}
