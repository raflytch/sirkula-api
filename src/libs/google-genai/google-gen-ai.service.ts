import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { AppConfigService } from '../../config/config.service';
import {
  IGenerateContentRequest,
  IGenerateContentResponse,
  IMediaFile,
  IGeminiRestRequestBody,
  IGeminiRestResponse,
  IGeminiPart,
} from './interfaces/google-gen-ai.interface';

@Injectable()
export class GoogleGenAiService implements OnModuleInit {
  private readonly logger = new Logger(GoogleGenAiService.name);
  private httpClient: AxiosInstance;
  private apiKey: string;
  private initialized = false;

  private readonly MODEL_NAME = 'gemini-2.5-flash';
  private readonly BASE_URL =
    'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(private readonly configService: AppConfigService) {}

  onModuleInit(): void {
    this.apiKey = this.configService.googleGenAiApiKey;

    if (!this.apiKey) {
      this.logger.warn('GOOGLE_GENAI_API_KEY is not configured');
      return;
    }

    this.httpClient = axios.create({
      baseURL: this.BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      timeout: 120_000,
    });

    this.initialized = true;
    this.logger.log('Google Gen AI REST client initialized successfully');
  }

  async generateFromText(prompt: string): Promise<IGenerateContentResponse> {
    return this.generateContent({ prompt });
  }

  async generateFromTextAndImage(
    prompt: string,
    image: IMediaFile,
  ): Promise<IGenerateContentResponse> {
    return this.generateContent({ prompt, mediaFiles: [image] });
  }

  async generateFromTextAndVideo(
    prompt: string,
    video: IMediaFile,
  ): Promise<IGenerateContentResponse> {
    return this.generateContent({ prompt, mediaFiles: [video] });
  }

  async generateFromTextAndMedia(
    prompt: string,
    mediaFiles: IMediaFile[],
  ): Promise<IGenerateContentResponse> {
    return this.generateContent({ prompt, mediaFiles });
  }

  async generateContent(
    request: IGenerateContentRequest,
  ): Promise<IGenerateContentResponse> {
    try {
      if (!this.initialized) {
        throw new Error('Google Gen AI REST client is not initialized');
      }

      const requestBody = this.buildRequestBody(request);
      const endpoint = `/${this.MODEL_NAME}:generateContent`;

      const { data } = await this.httpClient.post<IGeminiRestResponse>(
        endpoint,
        requestBody,
      );

      if (data.error) {
        throw new Error(`Gemini API error: ${data.error.message}`);
      }

      const text = this.extractTextFromResponse(data);

      return { text, success: true };
    } catch (error) {
      this.logger.error('Failed to generate content', error);

      const errorMessage = this.extractErrorMessage(error);

      return { text: '', success: false, error: errorMessage };
    }
  }

  bufferToBase64(buffer: Buffer): string {
    return buffer.toString('base64');
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private buildRequestBody(
    request: IGenerateContentRequest,
  ): IGeminiRestRequestBody {
    const parts: IGeminiPart[] = [];

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

    const body: IGeminiRestRequestBody = {
      contents: [{ role: 'user', parts }],
    };

    if (request.generationConfig) {
      body.generationConfig = {
        temperature: request.generationConfig.temperature,
        topP: request.generationConfig.topP,
        topK: request.generationConfig.topK,
        maxOutputTokens: request.generationConfig.maxOutputTokens,
        stopSequences: request.generationConfig.stopSequences,
      };
    }

    return body;
  }

  private extractTextFromResponse(response: IGeminiRestResponse): string {
    const candidates = response.candidates;

    if (!candidates || candidates.length === 0) {
      throw new Error('No candidates returned from Gemini API');
    }

    const firstCandidate = candidates[0];
    const parts = firstCandidate.content?.parts;

    if (!parts || parts.length === 0) {
      throw new Error('No content parts in Gemini API response');
    }

    return parts.map((part) => part.text || '').join('');
  }

  private extractErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const apiError = error.response?.data?.error;

      if (apiError?.message) {
        return `Gemini API error (${status}): ${apiError.message}`;
      }

      if (error.code === 'ECONNABORTED') {
        return 'Gemini API request timed out';
      }

      return `Gemini API HTTP error: ${status || error.message}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error occurred';
  }
}
