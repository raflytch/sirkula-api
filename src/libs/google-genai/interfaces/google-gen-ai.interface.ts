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

export interface IMediaFile {
  mimeType: MediaType;
  data: string;
}

export interface IGenerateContentRequest {
  prompt: string;
  mediaFiles?: IMediaFile[];
  generationConfig?: IGenerationConfig;
}

export interface IGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
}

export interface IGenerateContentResponse {
  text: string;
  success: boolean;
  error?: string;
}

export interface IGeminiRestRequestBody {
  contents: IGeminiContent[];
  generationConfig?: IGeminiGenerationConfig;
}

export interface IGeminiContent {
  role: string;
  parts: IGeminiPart[];
}

export interface IGeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface IGeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
}

export interface IGeminiRestResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}
