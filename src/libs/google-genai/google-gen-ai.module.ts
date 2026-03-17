import { Module, Global } from '@nestjs/common';
import { GoogleGenAiService } from './google-gen-ai.service';

/**
 * Global module for Google Generative AI integration
 * Provides GoogleGenAiService across all domains without re-importing
 */
@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [GoogleGenAiService],
  exports: [GoogleGenAiService],
})
export class GoogleGenAiModule {}
