import { Module, Global } from '@nestjs/common';
import { GoogleGenAiService } from './google-gen-ai.service';

@Global()
@Module({
  providers: [GoogleGenAiService],
  exports: [GoogleGenAiService],
})
export class GoogleGenAiModule {}
