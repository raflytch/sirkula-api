/**
 * @fileoverview Chunked Upload Service
 * @description Manages in-memory chunked file uploads to bypass Vercel 1.5MB body limit.
 *              Frontend sends base64-encoded 512KB chunks; this service reassembles them.
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Metadata for a pending chunked upload session
 */
interface UploadSession {
  userId: string;
  fileName: string;
  mimeType: string;
  totalSize: number;
  totalChunks: number;
  chunks: Map<number, Buffer>;
  receivedBytes: number;
  createdAt: number;
}

/**
 * Result returned when all chunks are assembled
 */
export interface AssembledFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class ChunkedUploadService {
  private readonly logger = new Logger(ChunkedUploadService.name);

  /**
   * In-memory store for active upload sessions
   */
  private readonly sessions = new Map<string, UploadSession>();

  /**
   * Chunking is only allowed for videos larger than direct upload limit
   */
  private readonly DIRECT_UPLOAD_THRESHOLD = Math.floor(1.2 * 1024 * 1024);

  /**
   * Max total video size: 15 MB
   */
  private readonly MAX_VIDEO_TOTAL_SIZE = 15 * 1024 * 1024;

  /**
   * Max single chunk size: 512 KB (raw bytes, before base64 encoding)
   */
  private readonly MAX_CHUNK_SIZE = 512 * 1024;

  /**
   * Max total chunks per upload session
   */
  private readonly MAX_TOTAL_CHUNKS = 40;

  /**
   * Session TTL: 10 minutes
   */
  private readonly SESSION_TTL_MS = 10 * 60 * 1000;

  /**
   * Allowed MIME types for chunked upload (videos only)
   */
  private readonly ALLOWED_MIME_TYPES = [
    'video/mp4',
    'video/mpeg',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
  ];

  /**
   * Initialize a new chunked upload session.
   * @returns uploadId to reference this session in subsequent chunk calls
   */
  initUpload(
    userId: string,
    fileName: string,
    mimeType: string,
    totalSize: number,
    totalChunks: number,
  ): { uploadId: string } {
    this.cleanupStale();

    if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `Invalid file type "${mimeType}". Allowed: ${this.ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (totalSize <= this.DIRECT_UPLOAD_THRESHOLD) {
      throw new BadRequestException(
        'Chunked upload is only for videos larger than 1.2MB. Upload this file directly.',
      );
    }

    if (totalSize > this.MAX_VIDEO_TOTAL_SIZE) {
      throw new BadRequestException(
        `Video size (${(totalSize / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed (${this.MAX_VIDEO_TOTAL_SIZE / (1024 * 1024)}MB)`,
      );
    }

    if (totalChunks < 1 || totalChunks > this.MAX_TOTAL_CHUNKS) {
      throw new BadRequestException(
        `Total chunks must be between 1 and ${this.MAX_TOTAL_CHUNKS}`,
      );
    }

    const minRequiredChunks = Math.ceil(totalSize / this.MAX_CHUNK_SIZE);
    if (totalChunks < minRequiredChunks) {
      throw new BadRequestException(
        `Total chunks is too small for declared file size. Minimum required: ${minRequiredChunks}`,
      );
    }

    const uploadId = randomUUID();

    this.sessions.set(uploadId, {
      userId,
      fileName,
      mimeType,
      totalSize,
      totalChunks,
      chunks: new Map(),
      receivedBytes: 0,
      createdAt: Date.now(),
    });

    this.logger.log(
      `Upload session ${uploadId} created for user ${userId} — ${totalChunks} chunks, ${(totalSize / (1024 * 1024)).toFixed(2)}MB`,
    );

    return { uploadId };
  }

  /**
   * Add a base64-encoded chunk to an existing upload session.
   * @returns status of the upload (progress or complete)
   */
  addChunk(
    uploadId: string,
    userId: string,
    chunkIndex: number,
    base64Data: string,
  ): { receivedChunks: number; totalChunks: number; complete: boolean } {
    const session = this.sessions.get(uploadId);

    if (!session) {
      throw new NotFoundException(
        'Upload session not found or expired. Please start a new upload.',
      );
    }

    if (session.userId !== userId) {
      throw new BadRequestException('Upload session does not belong to you');
    }

    if (this.isSessionExpired(session)) {
      this.sessions.delete(uploadId);
      throw new BadRequestException(
        'Upload session expired. Please start a new upload.',
      );
    }

    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      throw new BadRequestException(
        `Invalid chunk index ${chunkIndex}. Must be 0 to ${session.totalChunks - 1}`,
      );
    }

    if (session.chunks.has(chunkIndex)) {
      throw new BadRequestException(`Chunk ${chunkIndex} already uploaded`);
    }

    const chunkBuffer = Buffer.from(base64Data, 'base64');

    if (chunkBuffer.length > this.MAX_CHUNK_SIZE) {
      throw new BadRequestException(
        `Chunk size (${(chunkBuffer.length / 1024).toFixed(0)}KB) exceeds maximum (${this.MAX_CHUNK_SIZE / 1024}KB)`,
      );
    }

    const nextTotalBytes = session.receivedBytes + chunkBuffer.length;
    if (nextTotalBytes > this.MAX_VIDEO_TOTAL_SIZE) {
      throw new BadRequestException(
        `Accumulated upload size exceeds maximum allowed (${this.MAX_VIDEO_TOTAL_SIZE / (1024 * 1024)}MB)`,
      );
    }

    session.chunks.set(chunkIndex, chunkBuffer);
    session.receivedBytes = nextTotalBytes;

    const receivedChunks = session.chunks.size;
    const complete = receivedChunks === session.totalChunks;

    this.logger.log(
      `Upload ${uploadId}: chunk ${chunkIndex + 1}/${session.totalChunks} received (${(chunkBuffer.length / 1024).toFixed(0)}KB)`,
    );

    return { receivedChunks, totalChunks: session.totalChunks, complete };
  }

  /**
   * Retrieve and assemble the completed upload. Deletes the session after retrieval.
   * @returns An object mimicking Express.Multer.File for downstream compatibility
   */
  getCompletedUpload(uploadId: string, userId: string): AssembledFile {
    const session = this.sessions.get(uploadId);

    if (!session) {
      throw new NotFoundException('Upload session not found or expired');
    }

    if (session.userId !== userId) {
      throw new BadRequestException('Upload session does not belong to you');
    }

    if (session.chunks.size !== session.totalChunks) {
      throw new BadRequestException(
        `Upload incomplete: ${session.chunks.size}/${session.totalChunks} chunks received`,
      );
    }

    // Assemble chunks in order
    const orderedBuffers: Buffer[] = [];
    for (let i = 0; i < session.totalChunks; i++) {
      const chunk = session.chunks.get(i);
      if (!chunk) {
        throw new BadRequestException(`Missing chunk ${i}`);
      }
      orderedBuffers.push(chunk);
    }

    const assembledBuffer = Buffer.concat(orderedBuffers);

    if (assembledBuffer.length > this.MAX_VIDEO_TOTAL_SIZE) {
      this.sessions.delete(uploadId);
      throw new BadRequestException(
        `File size (${(assembledBuffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds maximum allowed (${this.MAX_VIDEO_TOTAL_SIZE / (1024 * 1024)}MB)`,
      );
    }

    if (assembledBuffer.length !== session.totalSize) {
      this.sessions.delete(uploadId);
      throw new BadRequestException(
        `Assembled file size mismatch. Expected ${session.totalSize} bytes, got ${assembledBuffer.length} bytes.`,
      );
    }

    // Clean up
    this.sessions.delete(uploadId);

    this.logger.log(
      `Upload ${uploadId} assembled: ${(assembledBuffer.length / (1024 * 1024)).toFixed(2)}MB`,
    );

    return {
      buffer: assembledBuffer,
      originalname: session.fileName,
      mimetype: session.mimeType,
      size: assembledBuffer.length,
    };
  }

  /**
   * Remove expired sessions from memory
   */
  private cleanupStale(): void {
    for (const [id, session] of this.sessions.entries()) {
      if (this.isSessionExpired(session)) {
        this.sessions.delete(id);
        this.logger.warn(`Stale upload session ${id} cleaned up`);
      }
    }
  }

  private isSessionExpired(session: UploadSession): boolean {
    return Date.now() - session.createdAt > this.SESSION_TTL_MS;
  }
}
